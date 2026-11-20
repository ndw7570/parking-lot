"""실행: python -I scripts/make_android_icon.py android/app/src/main/res [미리보기.png]
주차관리 앱 아이콘: 벡터(적응형) XML 과 구형 기기용 PNG 를 같은 도형으로 만든다.
캔버스 108x108 (적응형 아이콘 규격). 안전 영역 = 중심 반지름 33 원."""
import sys, os
from PIL import Image, ImageDraw

RES = sys.argv[1]
BG_TOP, BG_BOTTOM = "#1E293B", "#0B1220"
ACCENT, INK = "#22D3EE", "#FFFFFF"

# 도형 (108 캔버스 좌표)
STEM_X, TOP_Y, BOTTOM_Y = 46, 40, 72
BOWL_CX, BOWL_CY, BOWL_R, P_W = 54, 49, 9, 7
B0, B1, ARM, B_W = 31, 77, 9, 3.5

P_PATH = f"M{STEM_X},{BOTTOM_Y} V{TOP_Y} H{BOWL_CX} A{BOWL_R},{BOWL_R} 0 0 1 {BOWL_CX},{BOWL_CY+BOWL_R} H{STEM_X}"
def bracket_paths():
    return [f"M{B0},{B0+ARM} V{B0} H{B0+ARM}", f"M{B1-ARM},{B0} H{B1} V{B0+ARM}",
            f"M{B1},{B1-ARM} V{B1} H{B1-ARM}", f"M{B0+ARM},{B1} H{B0} V{B1-ARM}"]

def vector(ink, accent):
    paths = [f'''    <path android:pathData="{P_PATH}" android:strokeColor="{ink}" android:strokeWidth="{P_W}"
        android:strokeLineJoin="round" android:fillColor="#00000000"/>''']
    paths += [f'''    <path android:pathData="{d}" android:strokeColor="{accent}" android:strokeWidth="{B_W}"
        android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000"/>''' for d in bracket_paths()]
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!-- 주차관리 앱 아이콘: P(주차) + 카메라 조준선(번호판 인식). frontend/scripts/make_android_icon.py 로 PNG 와 함께 만든다 -->\n'
            '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
            '    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'
            + "\n".join(paths) + "\n</vector>\n")

BG_XML = f'''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient android:type="linear" android:startX="0" android:startY="0" android:endX="108" android:endY="108"
                android:startColor="{BG_TOP}" android:endColor="{BG_BOTTOM}"/>
        </aapt:attr>
    </path>
</vector>
'''
ADAPTIVE = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
'''

def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def render(size_px, shape):
    """구형 아이콘: 108 캔버스 중 가운데 72(18~90)를 보여 준다(적응형 규격과 같은 비율)."""
    S = 8  # 크게 그린 뒤 줄여 계단 현상 제거
    W = size_px * S
    k = W / 72.0
    tx = lambda v: (v - 18) * k
    img = Image.new("RGBA", (W, W))
    grad = Image.new("RGBA", (W, W))
    gd = ImageDraw.Draw(grad)
    a, b = hexrgb(BG_TOP), hexrgb(BG_BOTTOM)
    for i in range(2 * W):
        t = i / (2 * W - 1)
        c = tuple(round(a[j] + (b[j] - a[j]) * t) for j in range(3)) + (255,)
        gd.line([(i, 0), (0, i)], fill=c, width=2)
    mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(mask)
    pad = W * 0.04  # 구형 런처 아이콘 둘레 여백
    if shape == "round":
        md.ellipse([pad, pad, W - pad, W - pad], fill=255)
    else:
        md.rounded_rectangle([pad, pad, W - pad, W - pad], radius=W * 0.22, fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # P: 기둥 + 둥근 고리
    pw = P_W * k
    ink = hexrgb(INK) + (255,)
    d.line([(tx(STEM_X), tx(BOTTOM_Y)), (tx(STEM_X), tx(TOP_Y))], fill=ink, width=round(pw))
    d.line([(tx(STEM_X), tx(TOP_Y)), (tx(BOWL_CX), tx(TOP_Y))], fill=ink, width=round(pw))
    d.line([(tx(STEM_X), tx(BOWL_CY + BOWL_R)), (tx(BOWL_CX), tx(BOWL_CY + BOWL_R))], fill=ink, width=round(pw))
    r_out, r_in = (BOWL_R + P_W / 2) * k, (BOWL_R - P_W / 2) * k
    cx, cy = tx(BOWL_CX), tx(BOWL_CY)
    d.pieslice([cx - r_out, cy - r_out, cx + r_out, cy + r_out], 270, 90, fill=ink)
    d.pieslice([cx - r_in, cy - r_in, cx + r_in, cy + r_in], 270, 90, fill=(0, 0, 0, 0))
    # 기둥 위 모서리 둥글게(strokeLineJoin=round 와 맞춤)
    h = pw / 2
    d.ellipse([tx(STEM_X) - h, tx(TOP_Y) - h, tx(STEM_X) + h, tx(TOP_Y) + h], fill=ink)
    d.ellipse([tx(STEM_X) - h, tx(BOWL_CY + BOWL_R) - h, tx(STEM_X) + h, tx(BOWL_CY + BOWL_R) + h], fill=ink)
    # 조준선 모서리
    acc = hexrgb(ACCENT) + (255,)
    bw = B_W * k
    for (x0, y0), (x1, y1), (x2, y2) in [((B0, B0+ARM), (B0, B0), (B0+ARM, B0)), ((B1-ARM, B0), (B1, B0), (B1, B0+ARM)),
                                          ((B1, B1-ARM), (B1, B1), (B1-ARM, B1)), ((B0+ARM, B1), (B0, B1), (B0, B1-ARM))]:
        pts = [(tx(x0), tx(y0)), (tx(x1), tx(y1)), (tx(x2), tx(y2))]
        d.line(pts, fill=acc, width=round(bw), joint="curve")
        for p in (pts[0], pts[2]):
            d.ellipse([p[0] - bw / 2, p[1] - bw / 2, p[0] + bw / 2, p[1] + bw / 2], fill=acc)
    # 안쪽 고리 구멍이 지운 배경을 되살린다
    out = Image.new("RGBA", (W, W))
    out.paste(grad, (0, 0), mask)
    out.alpha_composite(img)
    hole = Image.new("L", (W, W), 0)
    ImageDraw.Draw(hole).pieslice([cx - r_in, cy - r_in, cx + r_in, cy + r_in], 270, 90, fill=255)
    ImageDraw.Draw(hole).rectangle([tx(STEM_X) + h, cy - r_in, cx, cy + r_in], fill=255)
    out.paste(grad, (0, 0), Image.composite(hole, Image.new("L", (W, W), 0), mask))
    return out.resize((size_px, size_px), Image.LANCZOS)

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f: f.write(text)

write(f"{RES}/drawable/ic_launcher_background.xml", BG_XML)
write(f"{RES}/drawable-v24/ic_launcher_foreground.xml", vector(INK, ACCENT))
write(f"{RES}/drawable/ic_launcher_monochrome.xml", vector("#FFFFFF", "#FFFFFF"))
for n in ("ic_launcher", "ic_launcher_round"):
    write(f"{RES}/mipmap-anydpi-v26/{n}.xml", ADAPTIVE)
for dpi, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    render(px, "square").save(f"{RES}/mipmap-{dpi}/ic_launcher.png")
    render(px, "round").save(f"{RES}/mipmap-{dpi}/ic_launcher_round.png")
    fg = f"{RES}/mipmap-{dpi}/ic_launcher_foreground.png"
    if os.path.exists(fg): os.remove(fg)  # 이제 벡터 전경을 쓴다
if len(sys.argv) > 2:  # 미리보기(선택)
    render(512, "square").save(sys.argv[2])
print("done")
