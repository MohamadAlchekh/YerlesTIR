from models import OptimizeRequest, OptimizeResponse, PlacementStep, ContainerInfo, CONTAINER_SPECS

def generate_instruction(x: float, y: float, z: float,
                          container_length: float,
                          container_width: float,
                          container_height: float) -> str:
    """
    x → sol/sağ (genişlik ekseni)
    y → aşağı/yukarı (yükseklik ekseni)
    z → ön/arka (derinlik ekseni)
    """

    # Derinlik (ön → arka)
    if z < container_length * 0.33:
        depth = "Ön tarafa"
    elif z < container_length * 0.66:
        depth = "Ortaya"
    else:
        depth = "Arka tarafa"

    # Yatay konum (sol → sağ)
    if x < container_width * 0.33:
        side = "sol kenara"
    elif x < container_width * 0.66:
        side = "merkeze"
    else:
        side = "sağ kenara"

    # Yükseklik (zemin → tavan)
    if y < container_height * 0.33:
        level = "zemine"
    elif y < container_height * 0.66:
        level = "orta kata"
    else:
        level = "üst kata"

    return f"{depth}, {side}, {level} yerleştir."


def get_orientations(w, h, d):
    # Returns unique orientations (w, h, d)
    # We allow all 6 rotations
    oris = [
        (w, h, d),
        (w, d, h),
        (h, w, d),
        (h, d, w),
        (d, w, h),
        (d, h, w)
    ]
    return list(set(oris))


class Space:
    def __init__(self, x, y, z, w, h, d):
        self.x = x
        self.y = y
        self.z = z
        self.w = w
        self.h = h
        self.d = d


def run_optimization(request: OptimizeRequest) -> OptimizeResponse:
    # 1. Get container info
    spec = CONTAINER_SPECS[request.container_type]
    c_length = spec["length"]
    c_width  = spec["width"]
    c_height = spec["height"]
    c_max_weight = spec["max_weight"]
    
    # 2. Expand products into single items
    # item structure: name, w (width), h (height), d (length), weight
    all_items = []
    for product in request.products:
        for _ in range(product.quantity):
            all_items.append({
                "name": product.name,
                "w": product.width,
                "h": product.height,
                "d": product.length,
                "weight": product.weight
            })
            
    # 3. Sort items by volume descending (length * width * height) exactly like frontend
    all_items.sort(key=lambda item: item["w"] * item["h"] * item["d"], reverse=True)
    
    total_requested = len(all_items)
    
    # Initial space: w=width(X axis), h=height(Y axis), d=length(Z axis)
    spaces = [Space(0, 0, 0, c_width, c_height, c_length)]
    
    steps = []
    total_volume_used = 0.0
    total_weight_used = 0.0
    
    items_placed = 0
    items_not_placed = 0
    
    for item in all_items:
        fitted = False
        
        # Sort spaces by Z (depth), then Y (height), then X (width) to pack bottom-back-left first
        spaces.sort(key=lambda s: (s.z, s.y, s.x))
        
        for i, space in enumerate(spaces):
            orientations = get_orientations(item["w"], item["h"], item["d"])
            
            for ori_w, ori_h, ori_d in orientations:
                # Basic fit check
                if ori_w <= space.w and ori_h <= space.h and ori_d <= space.d:
                    # STRICT BOUNDS CHECK: guarantee NO item is placed outside container
                    if (space.x + ori_w <= c_width and 
                        space.y + ori_h <= c_height and 
                        space.z + ori_d <= c_length):
                        
                        placed_x = space.x
                        placed_y = space.y
                        placed_z = space.z
                        
                        items_placed += 1
                        total_volume_used += ori_w * ori_h * ori_d
                        total_weight_used += item["weight"]
                        
                        instruction = generate_instruction(placed_x, placed_y, placed_z, c_length, c_width, c_height)
                        
                        steps.append(PlacementStep(
                            step=items_placed,
                            product_name=item["name"],
                            position_x=round(float(placed_x), 1),
                            position_y=round(float(placed_y), 1),
                            position_z=round(float(placed_z), 1),
                            width=round(float(ori_w), 1),
                            height=round(float(ori_h), 1),
                            length=round(float(ori_d), 1),
                            instruction=instruction
                        ))
                        
                        # Remove the used space
                        spaces.pop(i)
                        
                        # Guillotine split remaining space into 3
                        # 1. Right of item
                        if space.w - ori_w > 0:
                            spaces.append(Space(
                                space.x + ori_w,
                                space.y,
                                space.z,
                                space.w - ori_w,
                                ori_h,
                                ori_d
                            ))
                        # 2. Above item
                        if space.h - ori_h > 0:
                            spaces.append(Space(
                                space.x,
                                space.y + ori_h,
                                space.z,
                                space.w,
                                space.h - ori_h,
                                ori_d
                            ))
                        # 3. Front of item
                        if space.d - ori_d > 0:
                            spaces.append(Space(
                                space.x,
                                space.y,
                                space.z + ori_d,
                                space.w,
                                space.h,
                                space.d - ori_d
                            ))
                            
                        fitted = True
                        break # Break orientation loop
            if fitted:
                break # Break spaces loop
                
        if not fitted:
            items_not_placed += 1
            
    container_volume = c_width * c_height * c_length
    capacity_pct = round((total_volume_used / container_volume) * 100, 1) if container_volume > 0 else 0.0
    weight_pct = round((total_weight_used / c_max_weight) * 100, 1) if c_max_weight > 0 else 0.0
    
    return OptimizeResponse(
        container=ContainerInfo(
            type=request.container_type.value,
            label=spec["label"],
            length=c_length,
            width=c_width,
            height=c_height,
            max_weight=c_max_weight,
        ),
        total_items_placed=items_placed,
        total_items_requested=total_requested,
        items_not_placed=items_not_placed,
        capacity_used_percent=capacity_pct,
        weight_used_percent=weight_pct,
        total_weight_used=round(total_weight_used, 1),
        steps=steps,
    )
