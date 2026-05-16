export const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const items = [];
  
  // Varsayılan başlıklar: isim, adet, en, boy, derinlik, ağırlık
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 6) {
      items.push({
        name: parts[0] || `Kutu ${i}`,
        count: parseInt(parts[1]) || 1,
        w: parseFloat(parts[2]) || 0,
        h: parseFloat(parts[3]) || 0,
        d: parseFloat(parts[4]) || 0,
        weight: parseFloat(parts[5]) || 0,
        category: parts[6] || '',
        fragile: ['1', 'true', 'evet', 'yes'].includes((parts[7] || '').toLowerCase()),
        stackable: true // Default to stackable for CSV
      });
    }
  }
  
  return items;
};
