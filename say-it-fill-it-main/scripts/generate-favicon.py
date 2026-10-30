import math
from PIL import Image, ImageDraw, ImageFilter

def create_mozhifill_icon(size=512):
    # Render at 4x for crystal-sharp antialiasing
    scale = 4
    render_size = size * scale
    img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer squircle / rounded rect
    margin = int(24 * scale)
    corner_radius = int(108 * scale)
    rect_box = [margin, margin, render_size - margin, render_size - margin]
    
    # Dark modern background (#09090b)
    bg_color = (9, 9, 11, 255)
    draw.rounded_rectangle(rect_box, radius=corner_radius, fill=bg_color)

    # Subtle inner border / rim (#27272a)
    border_width = int(6 * scale)
    draw.rounded_rectangle(rect_box, radius=corner_radius, outline=(39, 39, 42, 255), width=border_width)

    # Center coordinates
    cx = render_size / 2.0
    cy = render_size / 2.0

    # Modern Voice Waveform + Monogram Symbol
    # 5 vertical sound bars forming an elegant 'M' / dynamic voice frequency
    # Heights and positions:
    bar_width = int(28 * scale)
    bar_radius = bar_width // 2
    spacing = int(48 * scale)

    # 5 bars centered around cx
    # Positions: cx - 2*spacing, cx - spacing, cx, cx + spacing, cx + 2*spacing
    # Heights:
    # Outer bars: tall
    # Middle bars: lower
    # Center bar: medium or dynamic
    bars = [
        (-2, 220 * scale, (255, 255, 255, 255)),   # Outer left (tall)
        (-1, 140 * scale, (212, 212, 216, 255)),   # Inner left
        ( 0, 240 * scale, (255, 255, 255, 255)),   # Center peak (voice spike)
        ( 1, 140 * scale, (212, 212, 216, 255)),   # Inner right
        ( 2, 220 * scale, (255, 255, 255, 255)),   # Outer right (tall)
    ]

    for idx, height, color in bars:
        bx = cx + idx * spacing
        top = cy - height / 2.0
        bottom = cy + height / 2.0
        draw.rounded_rectangle(
            [bx - bar_radius, top, bx + bar_radius, bottom],
            radius=bar_radius,
            fill=color
        )

    # Subtle accent dot in the center above (AI intelligence spark / mic node)
    dot_radius = int(12 * scale)
    dot_cy = cy - (150 * scale)
    draw.ellipse(
        [cx - dot_radius, dot_cy - dot_radius, cx + dot_radius, dot_cy + dot_radius],
        fill=(255, 255, 255, 230)
    )

    # Downsample using Lanczos for flawless edges
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Generate sizes
icon_512 = create_mozhifill_icon(512)
icon_128 = icon_512.resize((128, 128), Image.Resampling.LANCZOS)
icon_48  = icon_512.resize((48, 48), Image.Resampling.LANCZOS)
icon_32  = icon_512.resize((32, 32), Image.Resampling.LANCZOS)
icon_16  = icon_512.resize((16, 16), Image.Resampling.LANCZOS)

# Save multi-size favicon.ico
icon_512.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
icon_512.save("public/favicon.png", format="PNG")
icon_512.save("public/apple-touch-icon.png", format="PNG")

# Also update extension icons
icon_16.save("extension/icons/icon16.png", format="PNG")
icon_48.save("extension/icons/icon48.png", format="PNG")
icon_128.save("extension/icons/icon128.png", format="PNG")

print("Favicon and extension icons generated successfully!")
