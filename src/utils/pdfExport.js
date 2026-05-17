import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const s = (text) => {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
  };
  return String(text).replace(/[çÇğĞıİöÖşŞüÜ]/g, m => trMap[m]);
};

export const generatePDF = (packResult, containerName, totalWeight, driverInfo = {}) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now   = new Date();
    const dateStr = now.toLocaleDateString('tr-TR');
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    /* ─── Defaults ──────────────────────────────────────────── */
    const driverName  = driverInfo?.name?.trim()  || 'Mehmet Yilmaz';
    const driverEmail = driverInfo?.email?.trim() || 'mehmet.yilmaz@lojistik.com.tr';
    const driverTC    = '12345678901';
    const destination = s('İzmir Atatürk Organize Sanayi Bölgesi, İzmir');
    const companyName = s('YerlesTIR Lojistik A.Ş.');
    const companyAddr = s('Ostim Sanayi Sitesi, Ankara');
    const companyPhone= '+90 312 000 00 00';
    const companyEmail= 'info@yerlestir.com.tr';
    const irsaliyeNo  = `IRS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;

    const utilization   = packResult?.stats?.utilization || 0;
    const itemsPlaced   = packResult?.stats?.itemsPlaced   ?? (packResult?.placed?.length  || 0);
    const itemsUnplaced = packResult?.stats?.itemsNotPlaced ?? (packResult?.unplaced?.length || 0);

    /* ─── Header bar ────────────────────────────────────────── */
    doc.setFillColor(10, 25, 50);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('YerlesTIR', 14, 12);
    doc.setFontSize(8);  doc.setFont('helvetica', 'normal');
    doc.text(s('Akıllı İstif & Lojistik Sistemi'), 14, 19);
    doc.text(`${companyAddr}  |  ${companyPhone}  |  ${companyEmail}`, 14, 25);
    doc.setFontSize(9);  doc.setFont('helvetica', 'bold');
    doc.text(`IRSALIYE NO: ${irsaliyeNo}`, pageW - 14, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${dateStr}  Saat: ${timeStr}`, pageW - 14, 19, { align: 'right' });

    /* ─── Title ─────────────────────────────────────────────── */
    doc.setTextColor(10, 25, 50);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(s('YUKLEME IRSALIYESI'), pageW / 2, 38, { align: 'center' });
    doc.setDrawColor(10, 25, 50); doc.setLineWidth(0.5);
    doc.line(14, 40, pageW - 14, 40);

    /* ─── Info blocks ───────────────────────────────────────── */
    const infoY = 46;
    doc.setFillColor(240, 244, 255);
    doc.roundedRect(14, infoY, 85, 40, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(59, 130, 246);
    doc.text(s('GONDERICI FIRMA'), 19, infoY + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50);
    doc.text(companyName, 19, infoY + 14);
    doc.text(companyAddr, 19, infoY + 20);
    doc.text(companyPhone, 19, infoY + 26);
    doc.text(companyEmail, 19, infoY + 32);

    doc.setFillColor(240, 255, 245);
    doc.roundedRect(pageW / 2 + 5, infoY, 85, 40, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
    doc.text(s('TESLIM ADRESI'), pageW / 2 + 10, infoY + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50);
    const destLines = doc.splitTextToSize(destination, 75);
    doc.text(destLines, pageW / 2 + 10, infoY + 14);

    /* ─── Driver info ───────────────────────────────────────── */
    const drvY = infoY + 46;
    doc.setFillColor(255, 248, 235);
    doc.roundedRect(14, drvY, pageW - 28, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(234, 88, 12);
    doc.text(s('SOFOR BILGILERI'), 19, drvY + 7);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50); doc.setFontSize(9);

    const c1 = 19, c2 = pageW / 2 - 10;
    doc.setFont('helvetica', 'bold'); doc.text(s('Ad Soyad:'), c1, drvY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(s(driverName), c1 + 22, drvY + 14);
    doc.setFont('helvetica', 'bold'); doc.text('TC Kimlik No:', c1, drvY + 21);
    doc.setFont('helvetica', 'normal'); doc.text(driverTC, c1 + 28, drvY + 21);
    doc.setFont('helvetica', 'bold'); doc.text('E-Posta:', c2, drvY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(driverEmail, c2 + 18, drvY + 14);
    doc.setFont('helvetica', 'bold'); doc.text(s('Konteyner:'), c2, drvY + 21);
    doc.setFont('helvetica', 'normal'); doc.text(s(containerName) || 'Bilinmiyor', c2 + 23, drvY + 21);

    /* ─── Stats bar ─────────────────────────────────────────── */
    const statsY = drvY + 33;
    doc.setFillColor(248, 250, 255); doc.setDrawColor(200, 210, 230);
    doc.roundedRect(14, statsY, pageW - 28, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(59, 130, 246);
    doc.text(
      s(`Yuklenen Urun: ${itemsPlaced}  |  Sigmayon: ${itemsUnplaced}  |  Kapasite: %${utilization}  |  Agirlik: ${totalWeight || 0} kg`),
      pageW / 2, statsY + 8.5, { align: 'center' }
    );

    /* ─── Placed product table ──────────────────────────────── */
    const placedSummary = {};
    (packResult?.placed || []).forEach(item => {
      const key = s(item?.name || 'Isimsiz');
      if (!placedSummary[key]) placedSummary[key] = { count: 0, weight: 0, w: item.w, h: item.h, d: item.d };
      placedSummary[key].count++;
      placedSummary[key].weight += (item?.weight || 0);
    });

    const tblY = statsY + 19;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(10, 25, 50);
    doc.text(s('YUKLENEN URUNLER'), 14, tblY);

    const placedBody = Object.entries(placedSummary).map(([name, v], i) => [
      i + 1, name, v.count, `${v.w}x${v.h}x${v.d} cm`, v.weight > 0 ? `${v.weight} kg` : '-'
    ]);

    autoTable(doc, {
      startY: tblY + 4,
      head: [['#', s('Urun Adi'), 'Adet', s('Boyutlar (GxYxD)'), s('Agirlik')]],
      body: placedBody.length > 0 ? placedBody : [['–', s('Urun bulunamadi'), '-', '-', '-']],
      headStyles: { fillColor: [10, 25, 50], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 65 }, 2: { cellWidth: 18 }, 3: { cellWidth: 40 }, 4: { cellWidth: 28 } }
    });

    /* ─── Unplaced table ────────────────────────────────────── */
    const unplacedSummary = {};
    (packResult?.unplaced || []).forEach(item => {
      const key = s(item?.name || 'Isimsiz');
      if (!unplacedSummary[key]) unplacedSummary[key] = { count: 0 };
      unplacedSummary[key].count++;
    });

    if (Object.keys(unplacedSummary).length > 0) {
      const unplY = doc.lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(239, 68, 68);
      doc.text(s('SIGMAYON URUNLER'), 14, unplY);
      autoTable(doc, {
        startY: unplY + 4,
        head: [['#', s('Urun Adi'), 'Adet']],
        body: Object.entries(unplacedSummary).map(([name, v], i) => [i + 1, name, v.count]),
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3 }
      });
    }

    /* ─── Footer ────────────────────────────────────────────── */
    const footY = doc.internal.pageSize.getHeight() - 18;
    doc.setDrawColor(200, 210, 230); doc.line(14, footY - 2, pageW - 14, footY - 2);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(130, 130, 140);
    doc.text(
      s(`Bu belge YerlesTIR sistemi tarafindan otomatik olusturulmustur. Irsaliye No: ${irsaliyeNo}`),
      pageW / 2, footY + 3, { align: 'center' }
    );
    doc.text(
      `Sofor: ${s(driverName)}  |  ${driverEmail}  |  TC: ${driverTC}`,
      pageW / 2, footY + 9, { align: 'center' }
    );

    doc.save(`Irsaliye_${irsaliyeNo}.pdf`);
  } catch (error) {
    console.error('PDF olusturma hatasi:', error);
    alert(s('PDF oluşturulurken bir hata oluştu. Lütfen konsolu kontrol edin.'));
  }
};
