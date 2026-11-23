import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVapidKeys, encryptPayload, decryptPayload, cleanSub, b64u, unb64u, sendPush } from '../worker/webpush.mjs';

async function phone() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { kp, pub, auth, sub: { endpoint: 'https://push.example.com/send/abcdefghijklmnop', keys: { p256dh: b64u(pub), auth: b64u(auth) } } };
}

test('a push message decrypts back to what was sent', async () => {
  const p = await phone();
  const msg = JSON.stringify({ title: 'Your turn, Mochi', body: 'Roll the dice.', url: '/cosy-bean-62' });
  const body = await encryptPayload(p.sub, msg);
  assert.equal(await decryptPayload(body, p.kp.privateKey, p.pub, p.sub.keys.auth), msg);
});

test('the body has the aes128gcm header: salt, record size 4096, a 65 byte key', async () => {
  const p = await phone();
  const body = await encryptPayload(p.sub, 'hi');
  assert.equal(new DataView(body.buffer, body.byteOffset).getUint32(16), 4096);
  assert.equal(body[20], 65);
  assert.equal(body[21], 4);   // an uncompressed P-256 point
});

test('two messages never share a salt or key', async () => {
  const p = await phone();
  const a = await encryptPayload(p.sub, 'same'), b = await encryptPayload(p.sub, 'same');
  assert.notDeepEqual(a.slice(0, 16), b.slice(0, 16));
  assert.notDeepEqual(a.slice(21, 86), b.slice(21, 86));
});

test('a message the wrong phone gets cannot be read', async () => {
  const p = await phone(), other = await phone();
  const body = await encryptPayload(p.sub, 'secret');
  await assert.rejects(() => decryptPayload(body, other.kp.privateKey, other.pub, other.sub.keys.auth));
});

test('VAPID keys: a 65 byte public key and a private JWK', async () => {
  const k = await makeVapidKeys();
  assert.equal(unb64u(k.publicKey).length, 65);
  assert.equal(k.privateJwk.kty, 'EC');
  assert.ok(k.privateJwk.d);
});

test('sendPush posts an encrypted body with a signed VAPID header, and reports a dead subscription', async () => {
  const p = await phone(), k = await makeVapidKeys(), vapid = { ...k, subject: 'https://example.com' };
  const real = globalThis.fetch;
  let seen;
  try {
    globalThis.fetch = async (url, init) => { seen = { url, init }; return { ok: true, status: 201 }; };
    assert.equal(await sendPush(p.sub, { title: 't' }, vapid), 'ok');
    assert.equal(seen.url, p.sub.endpoint);
    assert.match(seen.init.headers.Authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
    assert.equal(seen.init.headers['Content-Encoding'], 'aes128gcm');
    const claims = JSON.parse(atob(seen.init.headers.Authorization.split('t=')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    assert.equal(claims.aud, 'https://push.example.com');
    assert.equal(claims.sub, 'https://example.com');
    globalThis.fetch = async () => ({ ok: false, status: 410 });
    assert.equal(await sendPush(p.sub, {}, vapid), 'gone');
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    assert.equal(await sendPush(p.sub, {}, vapid), 'fail');
    globalThis.fetch = async () => { throw new Error('network'); };
    assert.equal(await sendPush(p.sub, {}, vapid), 'fail');
  } finally { globalThis.fetch = real; }
});

test('cleanSub accepts a real-looking subscription and rejects junk', async () => {
  const p = await phone();
  assert.deepEqual(cleanSub(p.sub), p.sub);
  assert.equal(cleanSub(null), null);
  assert.equal(cleanSub({ endpoint: 'http://insecure.example.com/x', keys: p.sub.keys }), null);
  assert.equal(cleanSub({ endpoint: p.sub.endpoint, keys: { p256dh: 'AAAA', auth: 'AAAA' } }), null);
  assert.equal(cleanSub({ endpoint: p.sub.endpoint }), null);
});
