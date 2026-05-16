from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import OptimizeRequest, OptimizeResponse, CONTAINER_SPECS
from optimizer import run_optimization

app = FastAPI(
    title="LoadMind API",
    description="Konteyner yükleme optimizasyon sistemi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production'da frontend URL'i yaz
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoint'ler ─────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "LoadMind API çalışıyor ✓"}


@app.get("/api/containers")
def get_containers():
    """
    Kullanılabilir konteyner tiplerini ve ölçülerini döner.
    Frontend bu endpoint'i kullanarak dropdown listesini doldurur.
    """
    return [
        {
            "type": key.value,
            "label": val["label"],
            "length": val["length"],
            "width": val["width"],
            "height": val["height"],
            "max_weight": val["max_weight"],
        }
        for key, val in CONTAINER_SPECS.items()
    ]


@app.post("/api/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest):
    """
    Ürün listesini ve konteyner tipini alır,
    adım adım yerleşim planı döner.
    """
    if not request.products:
        raise HTTPException(status_code=400, detail="En az bir ürün girilmeli.")

    for p in request.products:
        if p.quantity < 1:
            raise HTTPException(
                status_code=400,
                detail=f"'{p.name}' için adet 1'den küçük olamaz.",
            )
        if p.length <= 0 or p.width <= 0 or p.height <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"'{p.name}' boyutları sıfırdan büyük olmalı.",
            )

    try:
        result = run_optimization(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizasyon hatası: {str(e)}")

    return result
