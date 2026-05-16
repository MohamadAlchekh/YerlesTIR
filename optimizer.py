from py3dbp import Packer, Bin, Item
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


def run_optimization(request: OptimizeRequest) -> OptimizeResponse:

    # 1. Konteyner bilgilerini al
    spec = CONTAINER_SPECS[request.container_type]
    c_length = spec["length"]
    c_width  = spec["width"]
    c_height = spec["height"]
    c_max_weight = spec["max_weight"]

    # 2. py3dbp Packer ve Bin oluştur
    packer = Packer()
    container_bin = Bin(
        "konteyner",
        c_length,
        c_width,
        c_height,
        c_max_weight,
    )
    packer.add_bin(container_bin)

    # 3. Ürünleri listele ve ağıra göre sırala (ağır paketi alta koyar)
    all_items: list[tuple] = []   # (ürün adı, l, w, h, kg)
    for product in request.products:
        for i in range(product.quantity):
            all_items.append((
                product.name,
                product.length,
                product.width,
                product.height,
                product.weight,
            ))

    all_items.sort(key=lambda p: p[4], reverse=True)   # ağıra göre azalan

    total_requested = len(all_items)

    for idx, (name, l, w, h, kg) in enumerate(all_items):
        packer.add_item(Item(f"{name}||{idx}", l, w, h, kg))

    # 4. Algoritmayı çalıştır
    packer.pack()

    # 5. Sonuçları işle
    steps: list[PlacementStep] = []
    total_volume_used  = 0.0
    total_weight_used  = 0.0
    container_volume   = c_length * c_width * c_height

    for step_no, item in enumerate(container_bin.items, start=1):
        x, y, z   = item.position
        l, w, h   = item.get_dimension()
        name      = item.name.split("||")[0]   # "||idx" ekini temizle

        total_volume_used += float(l) * float(w) * float(h)
        total_weight_used += float(item.weight)

        instruction = generate_instruction(x, y, z, c_length, c_width, c_height)

        steps.append(PlacementStep(
            step=step_no,
            product_name=name,
            position_x=round(float(x), 1),
            position_y=round(float(y), 1),
            position_z=round(float(z), 1),
            length=round(float(l), 1),
            width=round(float(w), 1),
            height=round(float(h), 1),
            instruction=instruction,
        ))

    items_placed    = len(container_bin.items)
    items_not_placed = total_requested - items_placed
    capacity_pct    = round((total_volume_used / container_volume) * 100, 1)
    weight_pct      = round((total_weight_used / c_max_weight) * 100, 1)

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
