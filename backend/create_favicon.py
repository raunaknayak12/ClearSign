import os
from PIL import Image


def main() -> None:
    """Load the public logo, crop it, and save favicon & icon files."""
    logo_path = os.path.abspath("../frontend/public/logo.png")
    app_dir = os.path.abspath("../frontend/app")

    if not os.path.exists(logo_path):
        print(f"Error: Logo not found at {logo_path}")
        return

    img = Image.open(logo_path)
    print(f"Original logo size: {img.size}, mode: {img.mode}")

    # Convert to RGBA if not already
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Crop the top graphic part (the hand icon)
    # The text 'CLEARSIGN' is at the bottom, so we crop the top ~72% of the height
    width, height = img.size

    # Let's crop just the icon area
    # Looking at the aspect ratio, the hand graphic fits in a square at the top center.
    crop_height = int(height * 0.72)
    crop_width = crop_height  # Keep it square

    left = (width - crop_width) // 2
    top = 0
    right = left + crop_width
    bottom = top + crop_height

    icon_img = img.crop((left, top, right, bottom))
    print(f"Cropped icon size: {icon_img.size}")

    # Save the cropped icon as icon.png (high resolution)
    icon_png_path = os.path.join(app_dir, "icon.png")
    icon_img.save(icon_png_path, format="PNG")
    print(f"Saved high-res icon to {icon_png_path}")

    # Save as favicon.ico with multiple sizes (16x16, 32x32, 48x48)
    favicon_path = os.path.join(app_dir, "favicon.ico")
    icon_img.save(favicon_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Saved favicon.ico to {favicon_path}")


if __name__ == "__main__":
    main()
