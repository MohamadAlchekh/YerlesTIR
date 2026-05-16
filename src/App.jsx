import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Home,
  Info,
  Layers,
  Package,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { api } from './api';
import Scene3D from './components/Scene3D';
import { parseCSV } from './utils/csv';
import { generatePDF } from './utils/pdfExport';
import { enrichCargoItem } from './utils/cargoMetadata';

const PRODUCT_CATALOG = [
  { name: 'Büyük Beyaz Eşya Kutusu', w: 60, h: 80, d: 60, weight: 45, category: 'white-goods' },
  { name: 'Orta Boy Elektronik', w: 40, h: 30, d: 40, weight: 12, category: 'electronics' },
  { name: 'Küçük Yedek Parça', w: 20, h: 20, d: 20, weight: 5, category: 'spare-parts' },
  { name: 'Uzun Profil Paketi', w: 120, h: 20, d: 20, weight: 15, category: 'profiles' },
  { name: 'Kırılacak Eşya Kolisi', w: 50, h: 50, d: 50, weight: 8, category: 'fragile', fragile: true },
  { name: 'Palet Altı Ağır Yük', w: 80, h: 60, d: 80, weight: 120, category: 'heavy-load' },
];

const LOCAL_PLAN_KEY = 'cargovision-local-plan';
const FAST_PLAYBACK_SPEED = 3.4;
const MAX_TOTAL_ITEMS = 300;
const MAX_DIMENSION = 1205;

const INITIAL_NEW_ITEM = {
  name: '',
  w: '',
  h: '',
  d: '',
  weight: '',
  stackable: true,
  count: '1',
};

function groupItemsByCategory(items) {
  const categoryMap = new Map();

  items.forEach((item) => {
    const categoryId = item.category || 'general';
    const categoryLabel = item.categoryLabel || 'Genel Kargo';
    const categoryEntry = categoryMap.get(categoryId) || {
      id: categoryId,
      label: categoryLabel,
      itemCount: 0,
      groups: new Map(),
      items: [],
    };

    categoryEntry.itemCount += 1;
    categoryEntry.items.push(item);

    const groupKey = [
      categoryId,
      item.name,
      item.w,
      item.h,
      item.d,
      item.weight,
      item.fragile ? '1' : '0',
    ].join('|');

    const groupEntry = categoryEntry.groups.get(groupKey) || {
      key: groupKey,
      name: item.name,
      w: item.w,
      h: item.h,
      d: item.d,
      weight: item.weight,
      fragile: item.fragile,
      itemIds: [],
      count: 0,
    };

    groupEntry.itemIds.push(item.id);
    groupEntry.count += 1;
    categoryEntry.groups.set(groupKey, groupEntry);
    categoryMap.set(categoryId, categoryEntry);
  });

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      groups: Array.from(category.groups.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'tr')
      ),
      items: [...category.items].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

function App() {
  const [view, setView] = useState('input');
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [containerType, setContainerType] = useState('');
  const [packResult, setPackResult] = useState(null);
  const [animatingIndex, setAnimatingIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [newItem, setNewItem] = useState(INITIAL_NEW_ITEM);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [appError, setAppError] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedPlan = window.localStorage.getItem(LOCAL_PLAN_KEY);
      if (!savedPlan) {
        setHasHydrated(true);
        return;
      }

      const parsed = JSON.parse(savedPlan);
      const restoredItems = Array.isArray(parsed.items)
        ? parsed.items.map((item) => enrichCargoItem(item))
        : [];

      setView(parsed.view || 'input');
      setItems(restoredItems);
      setContainerType(
        parsed.containerType && CONTAINERS[parsed.containerType] ? parsed.containerType : '20dc'
      );
      setPackResult(parsed.packResult || null);
      setAnimatingIndex(typeof parsed.animatingIndex === 'number' ? parsed.animatingIndex : -1);
      setIsPlaying(false);
      setPlaybackSpeed(1);
      setCheckedItems(new Set(Array.isArray(parsed.checkedItems) ? parsed.checkedItems : []));
      setNewItem({
        ...INITIAL_NEW_ITEM,
        ...(parsed.newItem || {}),
        count:
          parsed?.newItem?.count != null
            ? String(parsed.newItem.count)
            : INITIAL_NEW_ITEM.count,
      });
    } catch (error) {
      console.warn('Kayıtlı plan okunamadı:', error);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') return;

    const payload = {
      view,
      items,
      containerType,
      packResult,
      animatingIndex,
      checkedItems: Array.from(checkedItems),
      newItem,
    };

    window.localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(payload));
  }, [hasHydrated, view, items, containerType, packResult, animatingIndex, checkedItems, newItem]);

  useEffect(() => {
    const validIds = new Set(items.map((item) => item.id));
    setSelectedItemIds((prev) => new Set([...prev].filter((id) => validIds.has(id))));

    if (items.length === 0) {
      setSelectionMode(false);
    }
  }, [items]);

  useEffect(() => {
    if (!appError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setAppError('');
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [appError]);

  useEffect(() => {
    const validCategoryIds = new Set(groupItemsByCategory(items).map((category) => category.id));
    setExpandedCategories((prev) => new Set([...prev].filter((id) => validCategoryIds.has(id))));
  }, [items]);

  const groupedCategories = groupItemsByCategory(items);
  const allSelectableIds = items.map((item) => item.id);
  const areAllGroupsSelected =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedItemIds.has(id));

  const showError = (message) => {
    setAppError(message);
  };

  const clearError = () => {
    setAppError('');
  };

  const handleRemoveItems = (itemIds) => {
    const idSet = new Set(itemIds);

    setItems((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSelectedItemIds((prev) => new Set([...prev].filter((id) => !idSet.has(id))));
    setPackResult(null);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.w || !newItem.h || !newItem.d) return;

    const w = Number(newItem.w);
    const h = Number(newItem.h);
    const d = Number(newItem.d);
    const count = parseInt(newItem.count, 10);

    if (!Number.isFinite(count) || count < 1) {
      showError('Lütfen geçerli bir adet girin.');
      return;
    }

    if (w > MAX_DIMENSION || h > MAX_DIMENSION || d > MAX_DIMENSION) {
      showError('Ürün ölçüleri konteynere sığmayacak kadar büyük.');
      return;
    }

    if (items.length + count > MAX_TOTAL_ITEMS) {
      showError(
        `En fazla ${MAX_TOTAL_ITEMS} ürün ekleyebilirsiniz. Şu an ${items.length} ürün var, ${count} adet daha eklenemez.`
      );
      return;
    }

    const addedItems = [];
    for (let i = 0; i < count; i += 1) {
      addedItems.push(
        enrichCargoItem({
          id: uuidv4(),
          name: newItem.name || 'Kutu',
          w,
          h,
          d,
          weight: Number(newItem.weight) || 0,
          stackable: newItem.stackable,
        })
      );
    }

    setItems((prev) => [...prev, ...addedItems]);
    setNewItem({ ...newItem, name: '', w: '', h: '', d: '', weight: '', count: '1' });
    setPackResult(null);
    clearError();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target.result);
      const newItems = [];

      parsed.forEach((parsedItem) => {
        for (let i = 0; i < parsedItem.count; i += 1) {
          newItems.push(
            enrichCargoItem({
              id: uuidv4(),
              name: parsedItem.name,
              w: parsedItem.w,
              h: parsedItem.h,
              d: parsedItem.d,
              weight: parsedItem.weight,
              stackable: parsedItem.stackable,
              category: parsedItem.category,
              fragile: parsedItem.fragile,
            })
          );
        }
      });

      if (newItems.length === 0) {
        showError('CSV içinde eklenebilir ürün bulunamadı.');
        return;
      }

      if (items.length + newItems.length > MAX_TOTAL_ITEMS) {
        const remaining = Math.max(0, MAX_TOTAL_ITEMS - items.length);
        showError(
          `CSV yükleme limiti aşıyor. En fazla ${MAX_TOTAL_ITEMS} ürün olabilir, şu an yalnızca ${remaining} ürünlük yer kaldı.`
        );
        return;
      }

      setItems((prev) => [...prev, ...newItems]);
      setPackResult(null);
      clearError();
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePack = () => {
    if (items.length === 0) return;

    const productMap = {};
    items.forEach((item) => {
      const baseName = item.name.replace(/\s\(\d+\)$/, '');
      const key = `${baseName}_${item.d}_${item.w}_${item.h}_${item.weight}`;
      if (!productMap[key]) {
        productMap[key] = {
          name: baseName,
          length: Number(item.d),
          width: Number(item.w),
          height: Number(item.h),
          weight: Number(item.weight),
          quantity: 0,
        };
      }
      productMap[key].quantity += 1;
    });

    const payload = { products: Object.values(productMap) };
    console.log("=== BACKEND'E GÖNDERİLECEK VERİ FORMATI ===");
    console.log(JSON.stringify(payload, null, 2));

    const result = packItems(containerType, items);
    setPackResult(result);
    setAnimatingIndex(0);
    setIsPlaying(true);
    setPlaybackSpeed(1);
    setCheckedItems(new Set());
    setView('optimization');
    clearError();
  };

  const exportJSON = () => {
    const productMap = {};
    items.forEach((item) => {
      const baseName = item.name.replace(/\s\(\d+\)$/, '');
      const key = `${baseName}_${item.d}_${item.w}_${item.h}_${item.weight}`;
      if (!productMap[key]) {
        productMap[key] = {
          name: baseName,
          length: Number(item.d),
          width: Number(item.w),
          height: Number(item.h),
          weight: Number(item.weight),
          quantity: 0,
        };
      }
      productMap[key].quantity += 1;
    });

    const payload = { products: Object.values(productMap) };
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2)
    )}`;
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', 'frontend_to_backend.json');
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  };

  const handlePlayPause = () => {
    if (animatingIndex >= (packResult?.placed.length ?? 0)) {
      setAnimatingIndex(0);
      setPlaybackSpeed(1);
      setIsPlaying(true);
    } else {
      setPlaybackSpeed(1);
      setIsPlaying((prev) => !prev);
    }
  };

  const stepForward = () => {
    if (!packResult) return;

    if (animatingIndex >= packResult.placed.length) {
      setAnimatingIndex(0);
    }

    setPlaybackSpeed(FAST_PLAYBACK_SPEED);
    setIsPlaying(true);
  };

  const stepBackward = () => {
    setIsPlaying(false);
    setPlaybackSpeed(1);
    if (animatingIndex > 0) {
      setAnimatingIndex((prev) => prev - 1);
    }
  };

  const handleAnimationComplete = () => {
    if (isPlaying && packResult && animatingIndex < packResult.placed.length - 1) {
      setAnimatingIndex((prev) => prev + 1);
    } else if (isPlaying && packResult && animatingIndex >= packResult.placed.length - 1) {
      setIsPlaying(false);
      setPlaybackSpeed(1);
    }
  };

  const toggleCheck = (index) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);

    let max = -1;
    newChecked.forEach((value) => {
      if (value > max) max = value;
    });

    setAnimatingIndex(max + 1);
    setIsPlaying(false);
    setPlaybackSpeed(1);
  };

  const handleToggleAllChecks = () => {
    if (packResult) {
      if (checkedItems.size === packResult.placed.length) {
        setCheckedItems(new Set());
        setAnimatingIndex(0);
      } else {
        const allIndices = new Set(packResult.placed.map((_, idx) => idx));
        setCheckedItems(allIndices);
        setAnimatingIndex(packResult.placed.length);
      }
      setIsPlaying(false);
      setPlaybackSpeed(1);
    }
  };

  const handleStartNewPlan = () => {
    setView('input');
    setItems([]);
    setContainerType('20dc');
    setPackResult(null);
    setAnimatingIndex(-1);
    setIsPlaying(false);
    setPlaybackSpeed(1);
    setCheckedItems(new Set());
    setNewItem(INITIAL_NEW_ITEM);
    setSelectionMode(false);
    setSelectedItemIds(new Set());
    clearError();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOCAL_PLAN_KEY);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedItemIds(new Set());
      return;
    }

    setSelectionMode(true);
  };

  const handleToggleGroupSelection = (itemIds) => {
    const allSelected = itemIds.every((id) => selectedItemIds.has(id));

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        itemIds.forEach((id) => next.delete(id));
      } else {
        itemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectAllGroups = () => {
    if (areAllGroupsSelected) {
      setSelectedItemIds(new Set());
      return;
    }

    setSelectedItemIds(new Set(allSelectableIds));
  };

  const handleDeleteSelected = () => {
    if (selectedItemIds.size === 0) return;

    handleRemoveItems([...selectedItemIds]);
    setSelectionMode(false);
    setSelectedItemIds(new Set());
  };

  const handleToggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const totalWeight =
    packResult?.placed.reduce((acc, curr) => acc + (curr.weight || 0), 0) || 0;
  const hasPlanData = items.length > 0 || Boolean(packResult);

  return (
    <div className="app-wrapper">
      <div className="bg-orb orb-one" />
      <div className="bg-orb orb-two" />

      <div className="top-nav glass-panel">
        <div className="logo-container" style={{ margin: 0 }}>
          <div className="logo-icon">
            <Layers size={20} />
          </div>
          <div className="logo-text">
            <span>Industry 4.0</span>
            <h1 style={{ marginBottom: 0, fontSize: '1.2rem' }}>CargoVision AI</h1>
          </div>
        </div>

        <div className="nav-buttons">
          <button
            className={`nav-btn ${view === 'input' ? 'active' : ''}`}
            onClick={() => setView('input')}
            type="button"
          >
            1. Veri Girişi
          </button>
          <button
            className={`nav-btn ${view === 'optimization' ? 'active' : ''}`}
            disabled={!packResult}
            onClick={() => setView('optimization')}
            type="button"
          >
            2. Optimizasyon Sonucu
          </button>
          <button
            className={`nav-btn ${view === 'operator' ? 'active' : ''}`}
            disabled={!packResult}
            onClick={() => setView('operator')}
            type="button"
          >
            3. Operatör Ekranı
          </button>
        </div>

        <div className="top-nav-actions">
          {hasPlanData ? (
            <button className="nav-utility-btn" onClick={handleStartNewPlan} type="button">
              Yeni Plan Dene
            </button>
          ) : null}
          <a className="home-link" href="/anasayfa/index.html">
            <Home size={16} />
            Anasayfa
          </a>
        </div>
      </div>

      {appError ? (
        <div className="app-alert app-alert-error glass-panel" role="alert">
          <div className="app-alert-content">
            <AlertTriangle size={18} />
            <span>{appError}</span>
          </div>
          <button
            className="app-alert-close"
            onClick={clearError}
            aria-label="Hata mesajını kapat"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="app-container">
        {view === 'input' && (
          <>
            <div className="sidebar glass-panel" style={{ width: '400px' }}>
              <h2>
                <Truck size={18} /> Konteyner Seçimi
              </h2>
              <div className="form-group">
                <select value={containerType} onChange={(e) => setContainerType(e.target.value)}>
                  {Object.entries(CONTAINERS).map(([key, container]) => (
                    <option key={key} value={key}>
                      {container.name}
                    </option>
                  ))}
                </select>
              </div>

              <hr className="divider" />

              <h2>
                <Box size={18} /> Ürün Ekle
              </h2>
              <form onSubmit={handleAddItem}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Ürün Adı (Opsiyonel)"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="En (cm)"
                    min="1"
                    required
                    value={newItem.w}
                    onChange={(e) => setNewItem({ ...newItem, w: e.target.value })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    placeholder="Boy (cm)"
                    min="1"
                    required
                    value={newItem.h}
                    onChange={(e) => setNewItem({ ...newItem, h: e.target.value })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    placeholder="Derinlik (cm)"
                    min="1"
                    required
                    value={newItem.d}
                    onChange={(e) => setNewItem({ ...newItem, d: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Ağırlık (kg)"
                    min="0"
                    value={newItem.weight}
                    onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    placeholder="Adet"
                    min="1"
                    required
                    value={newItem.count}
                    onChange={(e) => setNewItem({ ...newItem, count: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <label className="checkbox-group" style={{ marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={newItem.stackable}
                    onChange={(e) => setNewItem({ ...newItem, stackable: e.target.checked })}
                  />
                  Üst üste istiflenebilir
                </label>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>
                  Ekle
                </button>
              </form>

              <hr className="divider" style={{ margin: '1rem 0' }} />

              <div style={{ marginBottom: '1rem' }}>
                <h3 className="section-note">Katalogdan Hızlı Seçim:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {PRODUCT_CATALOG.map((catalogItem, index) => (
                    <button
                      key={index}
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.4rem 0.6rem',
                        flex: '1 1 calc(50% - 0.5rem)',
                        textAlign: 'left',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onClick={() =>
                        setNewItem({
                          ...newItem,
                          name: catalogItem.name,
                          w: catalogItem.w,
                          h: catalogItem.h,
                          d: catalogItem.d,
                          weight: catalogItem.weight,
                          count: '1',
                        })
                      }
                      title={`${catalogItem.name} (${catalogItem.w}x${catalogItem.h}x${catalogItem.d} cm, ${catalogItem.weight} kg)`}
                    >
                      {catalogItem.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="separator">- VEYA -</div>

              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginBottom: '1rem' }}
                type="button"
              >
                <Upload size={18} /> CSV ile Toplu Yükle
              </button>

              <hr className="divider" />

              <button
                className="btn btn-success"
                onClick={handlePack}
                disabled={items.length === 0}
                style={{ marginTop: '1rem' }}
                type="button"
              >
                Planı Oluştur <ArrowRight size={18} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={exportJSON}
                disabled={items.length === 0}
                style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem' }}
                type="button"
              >
                Geliştirici: JSON İndir
              </button>
            </div>

            <div className="main-view glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div className="items-toolbar">
                <h2 style={{ marginBottom: 0 }}>
                  <Package size={18} /> Eklenen Ürünler ({items.length})
                </h2>
                {items.length > 0 ? (
                  <div className="items-toolbar-actions">
                    {selectionMode ? (
                      <>
                        <button
                          className="btn btn-secondary btn-inline"
                          onClick={handleToggleSelectAllGroups}
                          type="button"
                        >
                          {areAllGroupsSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}
                        </button>
                        <button
                          className="btn btn-danger btn-inline"
                          onClick={handleDeleteSelected}
                          disabled={selectedItemIds.size === 0}
                          type="button"
                        >
                          Seçilenleri Sil ({selectedItemIds.size})
                        </button>
                        <button
                          className="btn btn-secondary btn-inline"
                          onClick={handleToggleSelectionMode}
                          type="button"
                        >
                          İptal
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-secondary btn-inline"
                        onClick={handleToggleSelectionMode}
                        type="button"
                      >
                        Ürün Seç
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {items.length === 0 ? (
                <div className="empty-state">
                  Henüz ürün eklenmedi. Örnek CSV formatı:
                  <br />
                  <br />
                  <code>isim, adet, en, boy, derinlik, ağırlık</code>
                </div>
              ) : (
                <div className="category-sections">
                  {groupedCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.id);

                    return (
                    <section key={category.id} className="category-section">
                      <button
                        className="category-header category-toggle"
                        onClick={() => handleToggleCategory(category.id)}
                        type="button"
                      >
                        <div>
                          <h3 className="category-title">{category.label}</h3>
                          <p className="category-subtitle">
                            {category.groups.length} grup, {category.itemCount} ürün
                          </p>
                        </div>
                        <div className="category-header-right">
                          <span className="category-count">{category.itemCount}</span>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="category-list">
                          {category.items.map((item) => {
                            const isSelected = selectedItemIds.has(item.id);

                            return (
                              <div
                                key={item.id}
                                className={`item-card grouped-item ${
                                  selectionMode ? 'selectable' : ''
                                } ${isSelected ? 'selected' : ''}`}
                                onClick={
                                  selectionMode
                                    ? () => handleToggleGroupSelection([item.id])
                                    : undefined
                                }
                                onKeyDown={
                                  selectionMode
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleToggleGroupSelection([item.id]);
                                        }
                                      }
                                    : undefined
                                }
                                role={selectionMode ? 'button' : undefined}
                                tabIndex={selectionMode ? 0 : undefined}
                              >
                                {selectionMode ? (
                                  <div className="group-select-indicator">
                                    {isSelected ? (
                                      <CheckCircle2 size={20} color="#93c5fd" />
                                    ) : (
                                      <Circle size={20} color="var(--text-muted)" />
                                    )}
                                  </div>
                                ) : null}

                                <div className="item-info">
                                  <span className="item-name">{item.name}</span>
                                  <span className="item-dims">
                                    {item.w}x{item.h}x{item.d} cm
                                    {item.weight > 0 ? ` | ${item.weight} kg` : ''}
                                  </span>
                                  <div className="item-meta">
                                    <span className="item-chip">{item.categoryLabel || 'Genel Kargo'}</span>
                                    {item.fragile ? (
                                      <span className="item-chip item-chip-fragile">Kırılabilir</span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="group-actions">
                                  {!selectionMode ? (
                                    <button
                                      className="delete-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveItems([item.id]);
                                      }}
                                      type="button"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'optimization' && packResult && (
          <>
            <div className="sidebar glass-panel">
              <h2>
                <BarChart3 size={18} /> Yerleşim Özeti
              </h2>
              <div className="dashboard-stat">
                <span>Kapasite Kullanımı</span>
                <span className="stat-value">{packResult.stats.utilization}%</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${packResult.stats.utilization}%` }}
                />
              </div>
              <div className="dashboard-stat">
                <span>Yerleşen Ürün</span>
                <span className="badge badge-success">
                  {packResult.placed.length} / {items.length}
                </span>
              </div>
              <div className="dashboard-stat">
                <span>Toplam Ağırlık</span>
                <span className="stat-plain">{totalWeight} kg</span>
              </div>

              <button
                className="btn btn-secondary pdf-btn"
                style={{ marginTop: '1rem', width: '100%' }}
                onClick={() => generatePDF(packResult, CONTAINERS[containerType].name, totalWeight)}
                type="button"
              >
                İrsaliye PDF İndir
              </button>

              <hr className="divider" />

              <h2>
                <Play size={18} /> Animasyon Kontrolleri
              </h2>
              <div className="anim-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={stepBackward}
                  disabled={animatingIndex <= 0}
                  type="button"
                >
                  <SkipBack size={18} />
                </button>
                <button className="btn" onClick={handlePlayPause} style={{ flex: 1 }} type="button">
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />} {isPlaying ? 'Durdur' : 'Oynat'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={stepForward}
                  disabled={animatingIndex >= packResult.placed.length - 1}
                  title="Kalan yerleşimi hızlı oynat"
                  type="button"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              <div className="instruction-panel glass-panel" style={{ marginTop: '1.5rem', padding: '1rem' }}>
                <h3 className="instruction-title">
                  <Info size={16} /> Talimat
                </h3>
                {animatingIndex >= 0 && animatingIndex < packResult.placed.length ? (
                  <div>
                    <div className="instruction-name">
                      {animatingIndex + 1}. {packResult.placed[animatingIndex].name}
                    </div>
                    <div className="instruction-body">
                      Şimdi bu paketi alın ve şekilde gösterilen konuma yerleştirin.
                      <br />
                      <br />
                      <strong>Boyutlar:</strong> {packResult.placed[animatingIndex].w} x{' '}
                      {packResult.placed[animatingIndex].h} x {packResult.placed[animatingIndex].d} cm
                    </div>
                  </div>
                ) : (
                  <div className="instruction-fallback">Yerleşim tamamlandı.</div>
                )}
              </div>
            </div>

            <div className="main-view glass-panel">
              <div className="scene-container">
                <Scene3D
                  items={items}
                  containerType={containerType}
                  packResult={packResult}
                  animatingIndex={animatingIndex}
                  onAnimationComplete={handleAnimationComplete}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                />
              </div>
            </div>
          </>
        )}

        {view === 'operator' && packResult && (
          <>
            <div className="sidebar glass-panel" style={{ width: '450px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ marginBottom: 0 }}>
                  <CheckSquare size={18} /> Operatör İşlem Listesi
                </h2>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                  onClick={handleToggleAllChecks}
                  type="button"
                >
                  {checkedItems.size === packResult.placed.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <span>İlerleme:</span>
                  <span className="progress-label">
                    {Math.round((checkedItems.size / packResult.placed.length) * 100)}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div
                    className="progress-fill progress-success"
                    style={{ width: `${(checkedItems.size / packResult.placed.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="checklist-container">
                {packResult.placed.map((item, idx) => (
                  <div
                    key={`${item.id}${idx}`}
                    className={`checklist-item ${checkedItems.has(idx) ? 'checked' : ''} ${
                      animatingIndex === idx ? 'active' : ''
                    }`}
                    onClick={() => toggleCheck(idx)}
                  >
                    <div className="check-icon">
                      {checkedItems.has(idx) ? (
                        <CheckCircle2 size={24} color="var(--success)" />
                      ) : (
                        <Circle size={24} color="var(--text-muted)" />
                      )}
                    </div>
                    <div className="check-info">
                      <div
                        style={{
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          color: checkedItems.has(idx) ? 'var(--text-muted)' : 'var(--text-main)',
                          textDecoration: checkedItems.has(idx) ? 'line-through' : 'none',
                        }}
                      >
                        {idx + 1}. {item.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.w}x{item.h}x{item.d} cm | Konum: ({Math.round(item.x)},{' '}
                        {Math.round(item.y)}, {Math.round(item.z)})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="main-view glass-panel">
              <div className="scene-container">
                <Scene3D
                  items={items}
                  containerType={containerType}
                  packResult={packResult}
                  animatingIndex={animatingIndex}
                  onAnimationComplete={() => {}}
                  isPlaying={false}
                  playbackSpeed={1}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
