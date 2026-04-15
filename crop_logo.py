from PIL import Image, ImageDraw

def create_circular_thumbnail():
    img = Image.open('static/logo.png').convert("RGBA")
    
    # Optional: Find the bounding box of non-white or non-transparent pixels, 
    # but the logo.png we saw is a circular logo on a white square background.
    # We want to crop to the circle and make the background transparent.
    # The logo itself is a black circle with W inside.
    
    # We can just create a circular mask
    # Let's crop to a tight bounding box first, assuming the image has a defined circle.
    # Actually, we can just grab the exact circle assuming it's centered and takes up the whole image, 
    # or apply a mask if it's full-bleed white.
    # Let's just create a circular mask.
    size = min(img.size)
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Crop the original image to a square first
    w, h = img.size
    offset_x = (w - size) / 2
    offset_y = (h - size) / 2
    img = img.crop((offset_x, offset_y, offset_x + size, offset_y + size))
    
    # Apply the mask
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    
    # Convert white pixels near the edge to transparent? 
    # If the user means the circle part IS the logo and rest is white, masking is enough.
    result.save('static/logo.png')
    print("Cropped logo.png to circular favicon")

create_circular_thumbnail()
