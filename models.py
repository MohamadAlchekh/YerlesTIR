from pydantic import BaseModel
from typing import List
from enum import Enum


# ─── Konteyner Tipleri ───────────────────────────────────────────────────────

class ContainerType(str, Enum):
    DC_20 = "20DC"
    DC_40 = "40DC"
    HC_40 = "40HC"


# Gerçek iç ölçüler (cm) ve max yük (kg)
CONTAINER_SPECS = {
    ContainerType.DC_20: {
        "label": "20' Dry Container",
        "length": 589,
        "width": 235,
        "height": 239,
        "max_weight": 28180,
    },
    ContainerType.DC_40: {
        "label": "40' Dry Container",
        "length": 1200,
        "width": 235,
        "height": 239,
        "max_weight": 26680,
    },
    ContainerType.HC_40: {
        "label": "40' High Cube Container",
        "length": 1200,
        "width": 235,
        "height": 269,
        "max_weight": 26430,
    },
}


# ─── İstek Modeli ────────────────────────────────────────────────────────────

class Product(BaseModel):
    name: str         # Ürün adı
    length: float     # cm
    width: float      # cm
    height: float     # cm
    weight: float     # kg (tek adet)
    quantity: int     # adet

class OptimizeWebhookRequest(BaseModel):
    isim: str
    email: str
    percentage: float

class IrsaliyeRequest(BaseModel):
    isim: str
    surucu_mail: str

class IrsaliyeDetayRequest(BaseModel):
    sofor_isim: str
    products: List[Product]


class OptimizeRequest(BaseModel):
    container_type: ContainerType   # "20DC", "40DC", "40HC"
    products: List[Product]


# ─── Yanıt Modeli ────────────────────────────────────────────────────────────

class PlacementStep(BaseModel):
    step: int
    product_name: str
    position_x: float
    position_y: float
    position_z: float
    length: float
    width: float
    height: float
    instruction: str


class ContainerInfo(BaseModel):
    type: str
    label: str
    length: float
    width: float
    height: float
    max_weight: float


class OptimizeResponse(BaseModel):
    container: ContainerInfo
    total_items_placed: int
    total_items_requested: int
    items_not_placed: int
    capacity_used_percent: float
    weight_used_percent: float
    total_weight_used: float
    steps: List[PlacementStep]
