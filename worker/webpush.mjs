/* Web Push from a Worker: VAPID signing (RFC 8292) and message encryption (RFC 8291, aes128gcm), all with WebCrypto.
   The browser's own push service (Google, Mozilla or Apple) delivers the message, so a phone gets it even with the browser closed. */

const enc = new TextEncoder();
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(s).length / 4) * 4, '=')), c => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

export { b64u, unb64u };

/* a new VAPID key pair: the public half is given to browsers, the private half stays a secret on the Worker */
export async function makeVapidKeys() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { publicKey: b64u(await crypto.subtle.exportKey('raw', k.publicKey)), privateJwk: await crypto.subtle.exportKey('jwk', k.privateKey) };
}

async function vapidHeader(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })));
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${vapid.publicKey}`;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/* encrypts `text` for a push subscription ({endpoint, keys:{p256dh, auth}}) into an aes128gcm body */
export async function encryptPayload(sub, text, opts = {}) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const asKeys = opts.asKeys || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, cat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = cat(enc.encode(text), new Uint8Array([2]));   // 0x02 marks the last (only) record
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, body));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

/* sends one notification. Returns 'ok', 'gone' (the subscription is dead and should be dropped) or 'fail' */
export async function sendPush(sub, payload, vapid, ttl = 3600) {
  try {
    const body = await encryptPayload(sub, JSON.stringify(payload));
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidHeader(sub.endpoint, vapid), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high' },
      body,
    });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'fail';
  } catch (e) { return 'fail'; }
}

/* a subscription from a browser must look right before it is stored */
export function cleanSub(s) {
  if (!s || typeof s !== 'object') return null;
  const endpoint = String(s.endpoint || ''), p = s.keys && String(s.keys.p256dh || ''), a = s.keys && String(s.keys.auth || '');
  if (!/^https:\/\/[^\s]{10,500}$/.test(endpoint) || !p || !a || p.length > 200 || a.length > 60) return null;
  try { if (unb64u(p).length !== 65 || unb64u(a).length < 16) return null; } catch (e) { return null; }
  return { endpoint, keys: { p256dh: p, auth: a } };
}

/* for tests: the receiving side of encryptPayload */
export async function decryptPayload(body, uaPrivateKey, uaPublicRaw, authSecretB64) {
  const salt = body.slice(0, 16), idlen = body[20], asPublic = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPrivateKey, 256));
  const ikm = await hkdf(unb64u(authSecretB64), ecdh, cat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ct));
  let end = pt.length - 1; while (end > 0 && pt[end] === 0) end--;
  return new TextDecoder().decode(pt.slice(0, end));
}
