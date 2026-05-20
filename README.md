# YerlesTIR

Akıllı Konteyner Yükleme ve Optimizasyon Platformu

YerlesTIR, konteyner ve tır yükleme süreçlerini dijitalleştiren; ürünlerin boyut, ağırlık ve adet bilgilerine göre en uygun yerleşim planını oluşturan Endüstri 4.0 odaklı lojistik operasyon platformudur.

Sistem yalnızca matematiksel optimizasyon sunmaz; aynı zamanda 3D görselleştirme, operasyonel yönlendirme, QR/barkod entegrasyonu ve veri destekli yükleme süreçleri ile saha operasyonlarını dijital hale getirir.

---

## Problem

Lojistik operasyonlarında yükleme planlamaları çoğu zaman manuel şekilde gerçekleştirilmektedir. Bu durum:

* Verimsiz konteyner kullanımı
* Boş hacim kaybı
* Operasyonel hata riski
* Dengesiz yük dağılımı
* Zaman kaybı
* Yüksek operasyon maliyeti

gibi problemlere neden olmaktadır.

YerlesTIR bu süreci optimize ederek daha verimli, daha görünür ve daha hızlı operasyon yönetimi sağlamayı hedefler.

---

## Çözüm Yaklaşımı

YerlesTIR, kullanıcıdan alınan ürün ve konteyner verilerini analiz ederek optimum yükleme planı oluşturan bir optimizasyon sistemi kullanır.

Sistem:

* Ürün boyutlarını analiz eder
* Ağırlık dağılımını hesaplar
* Konteyner hacmini optimize eder
* Boş alan kullanımını azaltır
* Ürün yönelimlerini değerlendirir
* Yükleme sırasını belirler
* 3D yerleşim simülasyonu oluşturur

Tüm süreç gerçek zamanlı olarak görselleştirilir.

---

## Özellikler

### 3D Konteyner Görselleştirme

Three.js ve React Three Fiber altyapısıyla geliştirilen sistem sayesinde kullanıcılar:

* Konteyneri 3 boyutlu görüntüleyebilir
* Yerleşim sırasını takip edebilir
* Farklı açılardan inceleme yapabilir
* Yükleme sürecini animasyonlu şekilde izleyebilir

### QR & Barkod Entegrasyonu

html5-qrcode altyapısı sayesinde:

* Kamera ile barkod okutma
* Otomatik veri aktarımı
* Hızlı ürün tanımlama
* Manuel veri girişinin azaltılması

sağlanmaktadır.

### Operasyonel Optimizasyon

* Boş hacim analizi
* Dinamik yerleşim sistemi
* Operasyonel görünürlük
* Daha hızlı yükleme planlaması
* Görsel saha yönlendirmesi

---

## Sistem Mimarisi

```txt
Kullanıcı Verisi
↓
Optimizasyon Algoritması
↓
Yerleşim Hesabı
↓
3D Görselleştirme
↓
Operasyonel Çıktılar
```

---

## Teknolojiler

### Frontend

* React 19
* Vite
* JavaScript
* Three.js
* React Three Fiber
* Drei
* Lucide React

### Backend

* FastAPI
* Python
* Pydantic
* Uvicorn

### Ek Modüller

* html5-qrcode
* jsPDF
* jspdf-autotable
* UUID

---

## Gelecek Geliştirmeler

Planlanan geliştirmeler:

* AI destekli yerleşim önerileri
* Kamera tabanlı yük doğrulama sistemi
* IoT cihaz entegrasyonları
* ERP bağlantıları
* Depo yönetim sistemi entegrasyonu
* Operasyonel risk analizi
* Gerçek zamanlı veri takibi

---

## Ekip

### [Mohamad Alchekh](https://github.com/MohamadAlchekh)

`Backend Developer` • `Team Lead`

YerlesTIR projesinin ürün vizyonunu ve temel sistem yapısını şekillendirmiştir. puq.ai ve NovaVision entegrasyon süreçlerinde aktif rol alarak backend mimarisi, AI workflow yapısı ve operasyonel karar mekanizmalarının geliştirilmesine katkı sağlamıştır.

---

### [Mehmet Sahaf Bayrakçı](https://github.com/Mehmetsahaf)

`Operations Logic` • `System Design`

Projenin operasyonel planlama mantığı, veri akışları ve sistem organizasyonu tarafında aktif rol almıştır. YerlesTIR’in temel fikir yapısının geliştirilmesi ve animasyon süreçlerinin desteklenmesi alanlarında katkı sağlamıştır.

---

### [Orhan Emre Bağdu](#)

`Backend Developer` • `AI Integration`

YerlesTIR’in backend ve AI entegrasyon süreçlerinde görev almıştır. puq.ai ve NovaVision altyapılarının sisteme entegrasyonu, operasyonel veri akışları ve backend süreçlerinin geliştirilmesine katkı sağlamıştır.

---

### [Merve Subaşı](https://github.com/githubmerve)

`Frontend Developer` • `UI/UX Designer`

Projenin frontend geliştirme süreçlerinde görev almış; kullanıcı arayüzü, veri görselleştirme ve kullanıcı deneyimi katmanlarının oluşturulmasına katkı sağlamıştır. Modern ve erişilebilir arayüz yapısının geliştirilmesinde aktif rol üstlenmiştir.

---

## Sonuç

YerlesTIR, lojistik operasyonlarını yalnızca dijitalleştiren değil; aynı zamanda optimize eden, görselleştiren ve operasyonel görünürlük sağlayan modern bir Endüstri 4.0 çözümüdür.

Proje; verimlilik, hız, kullanıcı deneyimi ve operasyonel yönetimi tek bir platform altında birleştirerek modern lojistik süreçlerine ölçeklenebilir bir yaklaşım sunmaktadır.
