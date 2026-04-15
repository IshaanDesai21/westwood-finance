from PIL import Image, ImageDraw

def create_circular_thumbnail():
    img = Image.open('static/logo.png').convert("RGBA")
    
    size = min(img.size)
    # Make the circle mask slightly smaller to exclude the white border
    padding = int(size * 0.025) # 2.5% padding per side
    new_size = size - (padding * 2)
    
    mask = Image.new('L', (new_size, new_size), 0)
    draw = ImageDraw.Draw(mask)
    # Tighter ellipse
    draw.ellipse((0, 0, new_size, new_size), fill=255)
    
    w, h = img.size
    offset_x = (w - new_size) / 2
    offset_y = (h - new_size) / 2
    img = img.crop((offset_x, offset_y, offset_x + new_size, offset_y + new_size))
    
    result = Image.new('RGBA', (new_size, new_size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    
    result.save('static/logo.png')
    print("Cropped logo.png with a tighter mask to remove white border")

create_circular_thumbnail()
