import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const sanitizeTR = (text) => {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, match => trMap[match]);
};

export const generatePDF = (packResult, containerName, totalWeight) => {
  try {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(sanitizeTR('Yükleme İrsaliyesi ve Raporu'), 14, 22);

    doc.setFontSize(12);
    doc.text(sanitizeTR(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`), 14, 32);
    doc.text(sanitizeTR(`Konteyner Tipi: ${containerName || 'Bilinmiyor'}`), 14, 38);
    doc.text(sanitizeTR(`Kapasite Kullanımı: %${packResult?.stats?.utilization || 0}`), 14, 44);
    doc.text(sanitizeTR(`Yüklenen Toplam Ağırlık: ${totalWeight || 0} kg`), 14, 50);

    const placedSummary = {};
    (packResult?.placed || []).forEach(item => {
      const rawName = item?.name || 'Isimsiz Kutu';
      const baseName = rawName.replace(/\s\(\d+\)$/, '');
      if (!placedSummary[baseName]) {
        placedSummary[baseName] = { count: 0, weight: 0 };
      }
      placedSummary[baseName].count++;
      placedSummary[baseName].weight += item?.weight || 0;
    });

    const unplacedSummary = {};
    (packResult?.unplaced || []).forEach(item => {
      const rawName = item?.name || 'Isimsiz Kutu';
      const baseName = rawName.replace(/\s\(\d+\)$/, '');
      if (!unplacedSummary[baseName]) {
        unplacedSummary[baseName] = { count: 0, weight: 0 };
      }
      unplacedSummary[baseName].count++;
      unplacedSummary[baseName].weight += item?.weight || 0;
    });

    doc.setFontSize(14);
    doc.text(sanitizeTR('YÜKLENEN ÜRÜNLER'), 14, 65);
    
    const placedBody = Object.keys(placedSummary).map(name => [
      sanitizeTR(name),
      placedSummary[name].count.toString(),
      placedSummary[name].weight.toString() + ' kg'
    ]);

    autoTable(doc, {
      startY: 70,
      head: [[sanitizeTR('Ürün Adı'), sanitizeTR('Adet'), sanitizeTR('Toplam Ağırlık')]],
      body: placedBody.length > 0 ? placedBody : [[sanitizeTR('Bulunmuyor'), '-', '-']],
      headStyles: { fillColor: [16, 185, 129] }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text(sanitizeTR('KONTEYNERE SIĞMAYAN ÜRÜNLER'), 14, finalY);

    const unplacedBody = Object.keys(unplacedSummary).map(name => [
      sanitizeTR(name),
      unplacedSummary[name].count.toString(),
      unplacedSummary[name].weight.toString() + ' kg'
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [[sanitizeTR('Ürün Adı'), sanitizeTR('Adet'), sanitizeTR('Toplam Ağırlık')]],
      body: unplacedBody.length > 0 ? unplacedBody : [[sanitizeTR('Yok (Tümü Yüklendi)'), '-', '-']],
      headStyles: { fillColor: [239, 68, 68] }
    });

    doc.save(`Yukleme_Irsaliyesi_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (error) {
    console.error("PDF olusturma hatasi:", error);
    alert("PDF oluşturulurken bir hata oluştu. Lütfen konsolu kontrol edin.");
  }
};
