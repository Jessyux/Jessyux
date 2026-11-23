"""Block shading for the paw beans, the way the paw's arm is shaded: a flat bean with one flat, lighter crescent along the
top-left edge. No gradients, no gloss. Only bean pixels change, so the coat recolouring still finds the fur."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

S = 2

def soft(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0

def shift(a, dy, dx):
    out = np.zeros_like(a); h, w = a.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = a[ys, xs]
    return out

def process(src, dst):
    im = Image.open(src).convert('RGBA')
    big = im.resize((im.width * S, im.height * S), Image.LANCZOS)
    a = np.asarray(big).astype(np.float32)
    R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    bean = ((R - B) > 12) & (R > 190) & (A > 200)
    h, w = bean.shape
    lab = np.zeros((h, w), np.int32); n = 0; sizes = {}
    for y0 in range(h):
        for x0 in range(w):
            if bean[y0, x0] and not lab[y0, x0]:
                n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; c = 0
                while q:
                    cy, cx = q.popleft(); c += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and bean[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                sizes[n] = c
    out = a.copy(); changed = 0
    for i, c in sizes.items():
        if c < 120 * S * S / 4:
            continue                                  # claws and slivers stay as drawn
        sel = lab == i
        ys, xs = np.where(sel); bw = xs.max() - xs.min() + 1
        k = max(3, int(bw * 0.11))                     # the crescent is about a ninth of the bean wide, like the arm's band
        inner = shift(sel.astype(np.float32), k, int(k * 0.8))   # the bean slid down and right
        band = np.clip(sel.astype(np.float32) - inner, 0, 1)
        band = soft(band, S * 0.5)                     # just enough to take the jaggies off, still a hard-edged shape
        band = np.clip((band - 0.3) / 0.4, 0, 1) * sel
        base = a[sel][:, :3].mean(0)
        light = base + (255 - base) * 0.42
        for ch in range(3):
            out[..., ch] = np.where(sel, a[..., ch] * (1 - band) + light[ch] * band, out[..., ch])
        changed += 1
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').save(dst)
    return changed

if __name__ == '__main__':
    print(process(sys.argv[1], sys.argv[2]))
