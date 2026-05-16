const CATEGORY_DEFINITIONS = [
  {
    id: 'white-goods',
    label: 'Beyaz Eşya',
    keywords: ['beyaz esya', 'buzdolabi', 'camasir', 'bulasik', 'firin'],
    color: '#60a5fa',
    edge: '#bfdbfe',
  },
  {
    id: 'electronics',
    label: 'Elektronik',
    keywords: ['elektronik', 'tv', 'monitor', 'laptop', 'cihaz'],
    color: '#22d3ee',
    edge: '#a5f3fc',
  },
  {
    id: 'spare-parts',
    label: 'Yedek Parça',
    keywords: ['yedek parca', 'parca', 'vida', 'somun', 'aksesuar'],
    color: '#a78bfa',
    edge: '#ddd6fe',
  },
  {
    id: 'profiles',
    label: 'Profil',
    keywords: ['profil', 'metal', 'boru', 'uzun'],
    color: '#fb923c',
    edge: '#fed7aa',
  },
  {
    id: 'heavy-load',
    label: 'Ağır Yük',
    keywords: ['palet', 'agir', 'endustriyel', 'makine'],
    color: '#34d399',
    edge: '#a7f3d0',
  },
  {
    id: 'fragile',
    label: 'Kırılabilir',
    keywords: ['kiril', 'hassas', 'cam', 'seramik', 'fragile'],
    color: '#f472b6',
    edge: '#fbcfe8',
  },
];

const DEFAULT_CATEGORY = {
  id: 'general',
  label: 'Genel Kargo',
  color: '#94a3b8',
  edge: '#e2e8f0',
};

const normalizeText = (value = '') =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ä±/g, 'i')
    .replace(/ÄŸ/g, 'g')
    .replace(/Ã¼/g, 'u')
    .replace(/ÅŸ/g, 's')
    .replace(/Ã¶/g, 'o')
    .replace(/Ã§/g, 'c');

export const detectCargoCategory = (name = '') => {
  const normalized = normalizeText(name);
  return (
    CATEGORY_DEFINITIONS.find((category) =>
      category.keywords.some((keyword) => normalized.includes(keyword))
    ) || DEFAULT_CATEGORY
  );
};

export const isFragileCargo = (item = {}) => {
  if (item.fragile) return true;
  const normalized = normalizeText(item.name || '');
  return ['kiril', 'hassas', 'cam', 'seramik', 'fragile'].some((keyword) =>
    normalized.includes(keyword)
  );
};

export const enrichCargoItem = (item = {}) => {
  const detectedCategory = item.category
    ? CATEGORY_DEFINITIONS.find((category) => category.id === item.category) || DEFAULT_CATEGORY
    : detectCargoCategory(item.name);

  return {
    ...item,
    category: detectedCategory.id,
    categoryLabel: detectedCategory.label,
    fragile: isFragileCargo(item),
  };
};

export const getCargoVisual = (item = {}) => {
  const detectedCategory = item.category
    ? CATEGORY_DEFINITIONS.find((category) => category.id === item.category) || DEFAULT_CATEGORY
    : detectCargoCategory(item.name);

  return {
    color: detectedCategory.color,
    edge: detectedCategory.edge,
    categoryLabel: detectedCategory.label,
    fragile: isFragileCargo(item),
  };
};
