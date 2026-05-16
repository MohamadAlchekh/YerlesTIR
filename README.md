# LoadMind - Konteyner Yükleme Optimizasyonu

Bu proje, ürünlerin konteynerlere en verimli şekilde yerleştirilmesini hesaplayan ve 3D olarak görselleştiren bir sistemdir.

## Proje Yapısı

Proje iki ana bölümden oluşmaktadır:

### 1. Backend (`/backend`)
FastAPI tabanlı optimizasyon motoru. Guillotine algoritması kullanarak ürünlerin koordinatlarını hesaplar.

**Çalıştırma:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend (`/frontend`)
React + Three.js tabanlı görselleştirme ve yönetim arayüzü.

**Çalıştırma:**
```bash
cd frontend
npm install
npm run dev
```

## Temel Özellikler
- **Guillotine Algoritması:** Yer boşluklarını verimli kullanan özel uzay-parçalama mantığı.
- **3D Görselleştirme:** Three.js ile adım adım yükleme animasyonu.
- **Operatör Ekranı:** Depo personeli için kontrol listesi ve adım adım talimatlar.
- **PDF İrsaliye:** Oluşturulan planın PDF olarak indirilmesi.

## Dosya Düzeni
- `/backend/main.py`: FastAPI API uç noktaları.
- `/backend/optimizer.py`: Optimizasyon algoritması.
- `/frontend/src/App.jsx`: Ana uygulama mantığı.
- `/frontend/src/components/Scene3D.jsx`: 3D render motoru.
