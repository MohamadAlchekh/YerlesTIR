from fastapi import APIRouter
import httpx
import uuid
from models import OptimizeWebhookRequest, IrsaliyeRequest, IrsaliyeDetayRequest

router = APIRouter()

# ── Constants ────────────────────────────────────────────────
PUQAI_OPTIMIZE_WEBHOOK  = "https://api.puq.ai/h/48385ec94439/sync"
PUQAI_IRSALIYE_WEBHOOK  = "https://api.puq.ai/h/87efbce4d84a/sync"
PUQAI_DETAY_WEBHOOK     = "https://api.puq.ai/h/5f465f5b9f91/sync"

FIRMA_EMAIL    = "firma@email.com"      # replace with real email
SOFOR_TC       = "12345678901"          # replace with real TC
GIDECEGI_YER   = "İstanbul, TR"         # replace with real destination
FIRMA_BILGISI  = "Firma A.Ş."           # replace with real company info


@router.post("/optimize")
async def send_optimize_webhook(data: OptimizeWebhookRequest):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(PUQAI_OPTIMIZE_WEBHOOK, json={
                "isim": data.isim,
                "email": data.email,
                "percentage": data.percentage,
                "id": str(uuid.uuid4())
            })
        return {"status": "success"}
    except Exception as e:
        print(f"Webhook error (optimize): {e}")
        return {"status": "success"}

@router.post("/irsaliye")
async def send_irsaliye_webhook(data: IrsaliyeRequest):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(PUQAI_IRSALIYE_WEBHOOK, json={
                "isim": data.isim,
                "surucu_mail": data.surucu_mail,
                "firma_mail": FIRMA_EMAIL,
                "id": str(uuid.uuid4())
            })
        return {"status": "success"}
    except Exception as e:
        print(f"Webhook error (irsaliye): {e}")
        return {"status": "success"}

@router.post("/irsaliye-detay")
async def send_irsaliye_detay_webhook(data: IrsaliyeDetayRequest):
    try:
        urunler = [
            {
                "urun_adi": p.name,
                "boyut": f"{p.length}x{p.width}x{p.height} cm",
                "agirlik": f"{p.weight} kg",
                "adet": p.quantity
            }
            for p in data.products
        ]
        
        async with httpx.AsyncClient() as client:
            await client.post(PUQAI_DETAY_WEBHOOK, json={
                "sofor_isim": data.sofor_isim,
                "sofor_tc": SOFOR_TC,
                "gidecegi_yer": GIDECEGI_YER,
                "firma_bilgisi": FIRMA_BILGISI,
                "urunler": urunler,
                "id": str(uuid.uuid4())
            })
        return {"status": "success"}
    except Exception as e:
        print(f"Webhook error (irsaliye-detay): {e}")
        return {"status": "success"}
