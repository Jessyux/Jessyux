"""Make the paw's beans glossy, plush and squishy like the dice pips.
Only bean (pink) pixels change; the fur is left exactly as it is so the coat recolouring still finds it."""
import sys
import numpy as np
from PIL import Image, ImageFilter

S = 2  # work at 3x so the gloss is crisp when the paw is shown big

def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0

def shift(a, dy, dx):
    out = np.zeros_like(a)
    h, w = a.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = a[ys, xs]
    return out

def process(src, dst):
    im = Image.open(src).convert('RGBA')
    big = im.resize((im.width * S, im.height * S), Image.LANCZOS)
    a = np.asarray(big).astype(np.float32)
    R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    # bean = warm pink (red above blue), opaque, bright
    bean = ((R - B) > 12) & (R > 190) & (A > 200)
    m = blur(bean.astype(np.float32), S * 0.7)
    m = np.clip((m - 0.35) / 0.3, 0, 1)            # a soft, anti-aliased bean mask
    if m.sum() < 50:
        big.save(dst); return 0
    h, w = m.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # label each bean so every one gets its own gradient and shine
    from collections import deque
    lab = np.zeros((h, w), np.int32); n = 0; boxes = []
    hard = m > 0.5
    for y0 in range(h):
        for x0 in range(w):
            if hard[y0, x0] and not lab[y0, x0]:
                n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; ys = []; xs = []
                while q:
                    cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and hard[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                boxes.append((min(xs), max(xs), min(ys), max(ys), len(ys)))
    base = np.zeros((h, w, 3), np.float32)
    shine = np.zeros((h, w), np.float32)
    dot = np.zeros((h, w), np.float32)
    for i, (x0, x1, y0, y1, cnt) in enumerate(boxes, 1):
        if cnt < 120 * S * S / 4:
            continue
        sel = lab == i
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        t = np.clip((yy - y0) / bh, 0, 1)             # 0 top .. 1 bottom
        s = np.clip((xx - x0) / bw, 0, 1)
        # a plump candy gradient: pale rose on top, deeper berry at the bottom, a touch deeper to the right
        top = np.array([255, 196, 212], np.float32); mid = np.array([246, 148, 176], np.float32); bot = np.array([222, 104, 140], np.float32)
        tt = t[..., None]
        col = np.where(tt < .5, top + (mid - top) * (tt / .5), mid + (bot - mid) * ((tt - .5) / .5))
        col = col * (1 - .06 * s[..., None])
        base[sel] = col[sel]
        # glossy highlight: an oval up and to the left, like the shine on the dice pips
        cx, cy = x0 + bw * .36, y0 + bh * .30
        ex, ey = bw * .24, bh * .15
        d = ((xx - cx) / ex) ** 2 + ((yy - cy) / ey) ** 2
        shine = np.maximum(shine, sel * np.clip(1.15 - d, 0, 1))
        # and a small bright dot beside it
        dd = ((xx - (x0 + bw * .66)) / (bw * .07)) ** 2 + ((yy - (y0 + bh * .24)) / (bh * .05)) ** 2
        dot = np.maximum(dot, sel * np.clip(1.4 - dd, 0, 1))
    covered = base.sum(2) > 0
    mm = m * covered
    # squish: soft light on the top-left rim and a darker, deeper rim on the bottom-right, like a stuffed pillow
    k = max(2, int(S * 1.6))
    inner_tl = np.clip(mm - shift(mm, k, k), 0, 1)
    inner_br = np.clip(mm - shift(mm, -k, -k), 0, 1)
    inner_tl = blur(inner_tl, S * .8); inner_br = blur(inner_br, S * 1.0)
    out = a.copy()
    for c in range(3):
        v = base[..., c]
        v = v + inner_tl * 0.55 * (255 - v) - inner_br * 0.5 * v
        v = v + blur(shine, S * 1.2) * (255 - v) * 0.85 + blur(dot, S * .6) * (255 - v) * 0.95
        out[..., c] = np.where(mm > 0, a[..., c] * (1 - mm) + v * mm, a[..., c])
    # a thin berry rim so each bean stays crisp against the fur
    rim = np.clip(blur(mm, S * .9) - mm * 0.0, 0, 1)
    edge = np.clip(mm - blur(mm, S * 1.6), 0, 1) * 0 + np.clip(blur(mm, S * 1.1) - 0.0, 0, 1) * (1 - mm)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').save(dst)
    return len(boxes)

if __name__ == '__main__':
    print(process(sys.argv[1], sys.argv[2]))
