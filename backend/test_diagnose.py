from models import OptimizeRequest, Product, ContainerType
from optimizer import run_optimization
import json

req = OptimizeRequest(
    container_type=ContainerType.DC_20,
    products=[
        Product(name="P1 (Büyük)", length=100, width=235, height=239, weight=1000, quantity=2),
        Product(name="P2 (Orta)", length=100, width=117, height=119, weight=500, quantity=8),
        Product(name="P3 (Küçük)", length=189, width=47, height=59, weight=100, quantity=20)
    ]
)

res = run_optimization(req)
print(f"Items placed: {res.total_items_placed}")
print(f"Items not placed: {res.items_not_placed}")
print(f"Capacity used: {res.capacity_used_percent}%")
