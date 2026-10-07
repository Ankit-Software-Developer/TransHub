import os
import numpy as np
from PIL import Image

def create_truck_frames(truck_name, x_left, x_right, y_top, y_bottom, num_frames=30):
    empty_path = f'frontend/public/images/trucks/truck_{truck_name}_straight_empty.jpg'
    loaded_path = f'frontend/public/images/trucks/truck_{truck_name}_straight.jpg'
    out_dir = f'frontend/public/images/trucks/frames_{truck_name}'
    os.makedirs(out_dir, exist_ok=True)

    empty_img = Image.open(empty_path).convert('RGB')
    loaded_img = Image.open(loaded_path).convert('RGB')
    w, h = empty_img.size

    # Crop the exact cargo container interior
    cargo_crop = loaded_img.crop((x_left, y_top, x_right, y_bottom))
    cargo_w, cargo_h = cargo_crop.size

    frame_images = []
    feather = 16 # Smooth 16px alpha gradient for zero reflection seams

    for i in range(num_frames):
        p = i / (num_frames - 1) # 0.0 to 1.0

        if p == 0:
            frame = empty_img.copy()
        elif p >= 1.0:
            frame = empty_img.copy()
            frame.paste(cargo_crop, (x_left, y_top))
        else:
            frame = empty_img.copy()
            # Stowing loads from right (cab bulkhead) to left (rear)
            reveal_w = int(p * cargo_w)
            cutoff_x = cargo_w - reveal_w

            # Create smooth alpha mask across width
            mask_arr = np.zeros((cargo_h, cargo_w), dtype=np.float32)
            
            # Left of cutoff_x: 0
            # Around cutoff_x: smooth transition
            # Right of cutoff_x: 1.0
            x_indices = np.arange(cargo_w)
            
            # Linear ramp from (cutoff_x) to (cutoff_x + feather)
            ramp = np.clip((x_indices - cutoff_x) / float(feather), 0.0, 1.0)
            # Smooth cosine / S-curve interpolation
            smooth_ramp = 0.5 - 0.5 * np.cos(ramp * np.pi)
            mask_arr[:] = smooth_ramp

            mask = Image.fromarray((mask_arr * 255).astype(np.uint8), mode='L')

            # Composite cargo crop onto empty container interior with smooth alpha mask
            empty_crop = empty_img.crop((x_left, y_top, x_right, y_bottom))
            blended_crop = Image.composite(cargo_crop, empty_crop, mask)
            frame.paste(blended_crop, (x_left, y_top))

        # Save frame
        frame.save(f'{out_dir}/frame_{i:02d}.jpg', quality=95)
        frame_images.append(frame)

    # Save animated WebP
    frame_images[0].save(
        f'frontend/public/images/trucks/loading_{truck_name}.webp',
        save_all=True,
        append_images=frame_images[1:],
        duration=65,
        loop=0
    )
    print(f'Successfully generated {num_frames} seamless frames for {truck_name}')

if __name__ == '__main__':
    # 19ft Medium Truck
    create_truck_frames('19ft', x_left=90, x_right=977, y_top=127, y_bottom=499, num_frames=30)
    # 32ft Heavy Trailer
    create_truck_frames('32ft', x_left=56, x_right=1002, y_top=165, y_bottom=480, num_frames=30)
    # 11ft Light Truck
    create_truck_frames('11ft', x_left=118, x_right=853, y_top=88, y_bottom=503, num_frames=30)
