import React, { useState, useEffect, useRef } from 'react';
import { Package, Truck, Layers, Info, Trash2, Box, BarChart3, Play, Pause, SkipForward, SkipBack, CheckSquare, Upload, ArrowRight, CheckCircle2, Circle, Home, AlertTriangle, X, FastForward, ScanLine, User, ShieldCheck, ClipboardList } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { api } from './api';
import Scene3D from './components/Scene3D';
import BarcodeScanner from './components/BarcodeScanner';
import { parseCSV } from './utils/csv';
import { generatePDF } from './utils/pdfExport';

const PRODUCT_CATALOG = [
  { name: 'Büyük Beyaz Eşya Kutusu', w: 60, h: 80, d: 60, weight: 45 },
  { name: 'Orta Boy Elektronik', w: 40, h: 30, d: 40, weight: 12 },
  { name: 'Küçük Yedek Parça', w: 20, h: 20, d: 20, weight: 5 },
  { name: 'Uzun Profil Paketi', w: 120, h: 20, d: 20, weight: 15 },
  { name: 'Kırılacak Eşya Kolisi', w: 50, h: 50, d: 50, weight: 8 },
  { name: 'Palet Altı Ağır Yük', w: 80, h: 60, d: 80, weight: 120 }
];

function App() {
  const [view, setView] = useState('input');
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [containerType, setContainerType] = useState(() => {
    const saved = localStorage.getItem('cv_container');
    return saved || '';
  });
  const [packResult, setPackResult] = useState(null);
  
  // Animation State
  const [animatingIndex, setAnimatingIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Operator State
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [shipmentConfirmed, setShipmentConfirmed] = useState(false);

  // Error State
  const [errorMsg, setErrorMsg] = useState(null);
  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Form State
  const [newItem, setNewItem] = useState({
    name: '', w: '', h: '', d: '', weight: '', stackable: true, count: 1
  });

  // Selection and Grouping States
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Driver State
  const [driverInfo, setDriverInfo] = useState(() => {
    const saved = localStorage.getItem('cv_driver');
    return saved ? JSON.parse(saved) : { name: '', email: '' };
  });

  const fileInputRef = useRef(null);

  // Persist only driver info and container preference
  useEffect(() => {
    localStorage.setItem('cv_driver', JSON.stringify(driverInfo));
  }, [driverInfo]);

  useEffect(() => {
    if (containerType) {
      localStorage.setItem('cv_container', containerType);
    }
  }, [containerType]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const data = await api.getContainers();
        setContainers(data);
        if (data.length > 0) {
          setContainerType(data[0].type);
        }
      } catch (error) {
        console.error('Failed to load containers:', error);
      }
    };
    fetchContainers();
  }, []);

  // --- Handlers for Input View ---
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.w || !newItem.h || !newItem.d) return;

    const w = Number(newItem.w);
    const h = Number(newItem.h);
    const d = Number(newItem.d);
    const count = parseInt(newItem.count) || 1;

    const maxDimension = 1205; 
    if (w > maxDimension || h > maxDimension || d > maxDimension) {
      showError("Girdiğiniz ürün ölçüleri konteynere sığmayacak kadar büyük!");
      return;
    }

    const addedItems = [];
    for (let i = 0; i < count; i++) {
      addedItems.push({
        id: uuidv4(),
        name: newItem.name || 'Kutu',
        w: w, h: h, d: d,
        weight: Number(newItem.weight) || 0,
        stackable: newItem.stackable
      });
    }

    setItems(prev => [...prev, ...addedItems]);
    setNewItem({ ...newItem, name: '', w: '', h: '', d: '', weight: '', count: 1 });
    setPackResult(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target.result);
      
      const newItems = [];
      parsed.forEach(p => {
        for(let i = 0; i < p.count; i++) {
          newItems.push({
            id: uuidv4(),
            name: p.name,
            w: p.w, h: p.h, d: p.d, weight: p.weight, stackable: p.stackable
          });
        }
      });
      setItems(prev => [...prev, ...newItems]);
      setPackResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setPackResult(null);
  };

  const handleScanResult = (decodedText) => {
    setIsScannerOpen(false);
    try {
      const data = JSON.parse(decodedText);
      setNewItem({
        ...newItem,
        name: data.name || data.isim || data.ad || decodedText,
        w: data.w || data.en || data.width || '',
        h: data.h || data.boy || data.height || '',
        d: data.d || data.der || data.derinlik || data.depth || '',
        weight: data.weight || data.agirlik || '',
        count: data.count || data.adet || 1
      });
    } catch {
      setNewItem({ ...newItem, name: decodedText });
    }
  };

  const handlePack = async () => {
    if (items.length === 0) return;

    // Beklenen JSON formatını oluştur
    const productMap = {};
    items.forEach(item => {
      // Aynı özellikteki ürünleri grupla
      const baseName = item.name.replace(/\s\(\d+\)$/, '');
      const key = `${baseName}_${item.d}_${item.w}_${item.h}_${item.weight}`;
      if (!productMap[key]) {
        productMap[key] = {
          name: baseName,
          length: Number(item.d), // Derinlik (Z ekseni) = Length
          width: Number(item.w),  // En (X ekseni) = Width
          height: Number(item.h), // Boy (Y ekseni) = Height
          weight: Number(item.weight),
          quantity: 0
        };
      }
      productMap[key].quantity += 1;
    });

    const payloadProducts = Object.values(productMap);

    // Backend isteği öncesi error reset
    setErrorMsg(null);

    try {
      const response = await api.optimize(containerType, payloadProducts);
      
      const unplacedItems = []; // Not provided dynamically by backend yet, assuming empty for visualization
      
      const transformedResult = {
        container: response.container,
        placed: response.steps.map(step => ({
          id: uuidv4(),
          name: step.product_name,
          w: step.width,
          h: step.height,
          d: step.length,
          placedW: step.width,
          placedH: step.height,
          placedD: step.length,
          x: step.position_x,
          y: step.position_y,
          z: step.position_z,
          weight: 0, 
          instruction: step.instruction
        })),
        unplaced: unplacedItems,
        stats: {
          utilization: response.capacity_used_percent,
          weightUsed: response.weight_used_percent,
          itemsPlaced: response.total_items_placed,
          itemsNotPlaced: response.items_not_placed,
          totalWeight: response.total_weight_used
        }
      };

      setPackResult(transformedResult);
      setAnimatingIndex(0);
      setIsPlaying(true);
      setCheckedItems(new Set());
      setView('optimization');
    } catch (error) {
      showError("Hata: " + error.message);
    }
  };

  const exportJSON = () => {
    const productMap = {};
    items.forEach(item => {
      const baseName = item.name.replace(/\s\(\d+\)$/, '');
      const key = `${baseName}_${item.d}_${item.w}_${item.h}_${item.weight}`;
      if (!productMap[key]) {
        productMap[key] = {
          name: baseName,
          length: Number(item.d),
          width: Number(item.w),
          height: Number(item.h),
          weight: Number(item.weight),
          quantity: 0
        };
      }
      productMap[key].quantity += 1;
    });

    const payload = { products: Object.values(productMap) };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "frontend_to_backend.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  };

  // --- Handlers for Animation (Optimization View) ---
  const handlePlayPause = () => {
    if (animatingIndex >= packResult?.placed.length) {
      setAnimatingIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const stepForward = () => {
    setIsPlaying(false);
    if (packResult && animatingIndex < packResult.placed.length - 1) {
      setAnimatingIndex(prev => prev + 1);
    }
  };

  const stepBackward = () => {
    setIsPlaying(false);
    if (animatingIndex > 0) {
      setAnimatingIndex(prev => prev - 1);
    }
  };

  const handleAnimationComplete = () => {
    if (isPlaying && packResult && animatingIndex < packResult.placed.length - 1) {
      setAnimatingIndex(prev => prev + 1);
    } else if (isPlaying && packResult && animatingIndex >= packResult.placed.length - 1) {
      setIsPlaying(false);
    }
  };

  // --- Handlers for Operator View ---
  const toggleCheck = (index) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
    
    let max = -1;
    newChecked.forEach(val => { if (val > max) max = val; });
    setAnimatingIndex(max + 1);
    setIsPlaying(false);
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
    }
  };

  const totalWeight = packResult?.stats?.totalWeight || 0;
  
  const activeContainer = containers.find(c => c.type === containerType) || null;
  const activeContainerDims = activeContainer 
    ? { w: activeContainer.width, h: activeContainer.height, d: activeContainer.length } 
    : { w: 235, h: 239, d: 589 };

  // --- Helpers for Grouping and Selection ---
  const groupedItems = {};
  items.forEach(item => {
    const key = `${item.name}_${item.w}_${item.h}_${item.d}_${item.weight}`;
    if (!groupedItems[key]) {
      groupedItems[key] = {
        key,
        name: item.name,
        w: item.w, h: item.h, d: item.d, weight: item.weight,
        items: []
      };
    }
    groupedItems[key].items.push(item);
  });

  const toggleGroup = (key) => {
    const newExp = new Set(expandedGroups);
    if (newExp.has(key)) newExp.delete(key);
    else newExp.add(key);
    setExpandedGroups(newExp);
  };

  const toggleSelection = (id) => {
    const newSel = new Set(selectedItems);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedItems(newSel);
  };

  const toggleGroupSelection = (groupKey, itemsInGroup) => {
    const newSel = new Set(selectedItems);
    const allSelected = itemsInGroup.every(i => newSel.has(i.id));
    if (allSelected) {
      itemsInGroup.forEach(i => newSel.delete(i.id));
    } else {
      itemsInGroup.forEach(i => newSel.add(i.id));
    }
    setSelectedItems(newSel);
  };

  const handleDeleteSelected = () => {
    setItems(prev => prev.filter(item => !selectedItems.has(item.id)));
    setSelectedItems(new Set());
    setSelectionMode(false);
    setPackResult(null);
  };

  const handleNewPlan = () => {
    setItems([]);
    setPackResult(null);
    setView('input');
    setAnimatingIndex(-1);
    setIsPlaying(false);
    setCheckedItems(new Set());
    setSelectionMode(false);
    setSelectedItems(new Set());
    
    // Clear from localStorage
    localStorage.removeItem('cv_items');
    localStorage.removeItem('cv_packResult');
    localStorage.removeItem('cv_view');
    // We intentionally keep cv_container and cv_driver saved as preferences
  };

  return (
    <div className="app-wrapper">
      {/* TOP NAVIGATION */}
      <div className="top-nav glass-panel" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="logo-container" style={{ margin: 0, width: '280px' }}>
          <div className="logo-icon"><Layers size={20} /></div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>INDUSTRY 4.0</div>
            <h1 style={{ marginBottom: 0, fontSize: '1.2rem', color: 'white', background: 'none', WebkitTextFillColor: 'initial' }}>YerlesTIR</h1>
          </div>
        </div>
        <div className="nav-buttons" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <button className={`nav-btn ${view === 'input' ? 'active' : ''}`} onClick={() => setView('input')}>1. Veri Girişi</button>
          <button className={`nav-btn ${view === 'optimization' ? 'active' : ''}`} disabled={!packResult} onClick={() => setView('optimization')}>2. Optimizasyon Sonucu</button>
          <button className={`nav-btn ${view === 'operator' ? 'active' : ''}`} disabled={!packResult} onClick={() => setView('operator')}>3. Yükleme Özeti</button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: 'auto', minWidth: '320px', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-orange" 
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.9rem', 
              whiteSpace: 'nowrap',
              width: 'auto' 
            }}
            onClick={handleNewPlan}
          >
            Yeni Plan Dene
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', color: '#e5eefb', whiteSpace: 'nowrap', width: 'auto' }}
            onClick={() => window.location.href = '../anasayfa/index.html'}
          >
            <Home size={16} /> Anasayfa
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '0 1rem' }}>
          <div className="error-banner animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} color="#fca5a5" />
              <span>{errorMsg}</span>
            </div>
            <button className="delete-btn" onClick={() => setErrorMsg(null)}><X size={18} color="#fca5a5" /></button>
          </div>
        </div>
      )}

      <div className="app-container" style={{ paddingTop: errorMsg ? '0.5rem' : '1rem' }}>
        {/* --- VIEW 1: INPUT --- */}
        {view === 'input' && (
          <>
            <div className="sidebar glass-panel" style={{ width: '400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}><User size={18} /> Şoför Bilgileri</h2>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="text" 
                      placeholder="Şoför Adı Soyadı" 
                      value={driverInfo.name} 
                      onChange={(e) => setDriverInfo({ ...driverInfo, name: e.target.value })} 
                    />
                    <input 
                      type="email" 
                      placeholder="Şoför Email Adresi" 
                      value={driverInfo.email} 
                      onChange={(e) => setDriverInfo({ ...driverInfo, email: e.target.value })} 
                      style={{ marginTop: '0.5rem' }}
                    />
                  </div>
                </div>

                <hr className="divider" style={{ margin: 0 }} />

                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}><Truck size={18} /> Konteyner Seçimi</h2>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <select value={containerType} onChange={(e) => setContainerType(e.target.value)}>
                      {containers.map((c) => (
                        <option key={c.type} value={c.type}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              <button 
                type="button" 
                className="btn" 
                style={{ backgroundColor: 'rgba(37, 150, 190, 1)', borderColor: 'rgba(37, 150, 190, 1)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                onClick={() => setIsScannerOpen(true)}
              >
                <ScanLine size={18} /> Barkod Okuyucu
              </button>

              <h2><Box size={18} /> Ürün Ekle</h2>
              <form onSubmit={handleAddItem}>
                <div className="form-group">
                  <input type="text" placeholder="Ürün Adı (Opsiyonel)" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" placeholder="En (cm)" min="1" required value={newItem.w} onChange={e => setNewItem({...newItem, w: e.target.value})} className="flex-1" />
                  <input type="number" placeholder="Boy (cm)" min="1" required value={newItem.h} onChange={e => setNewItem({...newItem, h: e.target.value})} className="flex-1" />
                  <input type="number" placeholder="Der (cm)" min="1" required value={newItem.d} onChange={e => setNewItem({...newItem, d: e.target.value})} className="flex-1" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="number" placeholder="Ağırlık (kg)" min="0" value={newItem.weight} onChange={e => setNewItem({...newItem, weight: e.target.value})} className="flex-1" />
                  <input type="number" placeholder="Adet" min="1" required value={newItem.count} onChange={e => setNewItem({...newItem, count: e.target.value === '' ? '' : parseInt(e.target.value)})} className="flex-1" />
                </div>
                <label className="checkbox-group" style={{ marginTop: '1rem' }}>
                  <input type="checkbox" checked={newItem.stackable} onChange={e => setNewItem({...newItem, stackable: e.target.checked})} />
                  Üst üste istiflenebilir
                </label>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Ekle</button>
              </form>

              <hr className="divider" style={{ margin: '1rem 0' }} />
              
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Katalogdan Hızlı Seçim:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {PRODUCT_CATALOG.map((cat, i) => (
                    <button 
                      key={i} 
                      type="button"
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', flex: '1 1 calc(50% - 0.5rem)', textAlign: 'left', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={() => setNewItem({ ...newItem, name: cat.name, w: cat.w, h: cat.h, d: cat.d, weight: cat.weight, count: 1 })}
                      title={`${cat.name} (${cat.w}x${cat.h}x${cat.d} cm, ${cat.weight} kg)`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)' }}>- VEYA -</div>

              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ marginBottom: '1rem' }}>
                <Upload size={18} /> CSV ile Toplu Yükle
              </button>

              <hr className="divider" />

              <button className="btn" onClick={handlePack} disabled={items.length === 0} style={{ background: 'var(--success)', marginTop: '1rem' }}>
                Planı Oluştur <ArrowRight size={18} />
              </button>


            </div>

            <div className="main-view glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}><Package size={18} /> Eklenen Ürünler ({items.length})</h2>
                {items.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectionMode && selectedItems.size > 0 && (
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }} onClick={handleDeleteSelected}>
                        Seçilenleri Sil ({selectedItems.size})
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) setSelectedItems(new Set());
                      }}
                    >
                      {selectionMode ? 'İptal' : 'Ürün Seç'}
                    </button>
                  </div>
                )}
              </div>
              
              {items.length === 0 ? (
                <div className="empty-state">Henüz ürün eklenmedi. Örnek CSV formatı: <br/><br/><code>isim, adet, en, boy, derinlik, ağırlık</code></div>
              ) : (
                <div className="groups-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.values(groupedItems).map((group, gIdx) => {
                    const isExpanded = expandedGroups.has(group.key);
                    const allSelected = group.items.every(i => selectedItems.has(i.id));
                    const someSelected = group.items.some(i => selectedItems.has(i.id));
                    
                    return (
                      <div key={group.key} className="group-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Group Header */}
                        <div 
                          className="group-header" 
                          style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'all 0.2s' }}
                          onClick={() => toggleGroup(group.key)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {selectionMode && (
                              <div onClick={(e) => { e.stopPropagation(); toggleGroupSelection(group.key, group.items); }} style={{ cursor: 'pointer' }}>
                                {allSelected ? <CheckCircle2 size={20} color="var(--primary)" /> : (someSelected ? <Circle size={20} fill="var(--primary)" color="var(--primary)" fillOpacity={0.5} /> : <Circle size={20} color="var(--text-muted)" />)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{group.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{group.items.length} adet ürün</div>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                            {group.items.length}
                          </div>
                        </div>

                        {/* Group Items (Expanded) */}
                        {isExpanded && (
                          <div style={{ padding: '0.5rem 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                            {group.items.map((item, iIdx) => {
                              const isSelected = selectedItems.has(item.id);
                              return (
                                <div 
                                  key={item.id} 
                                  className={`item-card animate-fade-in ${isSelected ? 'selected' : ''}`} 
                                  style={{ 
                                    animationDelay: `${Math.min(iIdx * 0.02, 0.5)}s`, 
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                                    cursor: selectionMode ? 'pointer' : 'default',
                                    padding: '0.75rem'
                                  }}
                                  onClick={() => { if (selectionMode) toggleSelection(item.id); }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    {selectionMode && (
                                      <div style={{ marginTop: '0.1rem' }}>
                                        {isSelected ? <CheckCircle2 size={16} color="var(--primary)" /> : <Circle size={16} color="var(--text-muted)" />}
                                      </div>
                                    )}
                                    <div className="item-info" style={{ flex: 1 }}>
                                      <span className="item-name" style={{ fontSize: '0.85rem' }}>{item.name} #{iIdx + 1}</span>
                                      <span className="item-dims" style={{ fontSize: '0.75rem' }}>{item.w}x{item.h}x{item.d} cm {item.weight > 0 ? `| ${item.weight}kg` : ''}</span>
                                    </div>
                                    {!selectionMode && (
                                      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}><Trash2 size={16} /></button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- VIEW 2: OPTIMIZATION RESULTS --- */}
        {view === 'optimization' && packResult && (
          <>
            <div className="sidebar glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2><BarChart3 size={18} /> Yerleşim Özeti</h2>
              <div className="dashboard-stat">
                <span>Kapasite Kullanımı</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{packResult.stats.utilization}%</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                <div className="progress-fill" style={{ width: `${packResult.stats.utilization}%` }}></div>
              </div>
              <div className="dashboard-stat">
                <span>Yerleşen Ürün</span>
                <span className="badge badge-success">{packResult.stats.itemsPlaced} / {packResult.stats.itemsPlaced + packResult.stats.itemsNotPlaced}</span>
              </div>
              <div className="dashboard-stat">
                <span>Sığmayan Ürün</span>
                <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{packResult.stats.itemsNotPlaced}</span>
              </div>
              <div className="dashboard-stat">
                <span>Ağırlık Kullanımı</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{packResult.stats.weightUsed}%</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                <div className="progress-fill" style={{ width: `${packResult.stats.weightUsed}%` }}></div>
              </div>
              <div className="dashboard-stat">
                <span>Toplam Ağırlık</span>
                <span style={{ fontWeight: 'bold' }}>{totalWeight} kg</span>
              </div>
              
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '1rem', width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => generatePDF(packResult, activeContainer?.label || 'Konteyner', totalWeight, driverInfo)}
              >
                İrsaliye PDF İndir
              </button>
              
              <hr className="divider" />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}><Play size={18} /> Animasyon Kontrolleri</h2>
              </div>
              
              <div className="anim-controls" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={stepBackward} disabled={animatingIndex <= 0}><SkipBack size={18} /></button>
                <button className="btn" onClick={handlePlayPause} style={{ flex: 1 }}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />} {isPlaying ? 'Durdur' : 'Oynat'}
                </button>
                <button className="btn btn-secondary" onClick={stepForward} disabled={animatingIndex >= packResult.placed.length - 1}><SkipForward size={18} /></button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: playbackSpeed === 1 ? 'var(--primary)' : '', borderColor: playbackSpeed === 1 ? 'var(--primary)' : '' }}
                  onClick={() => setPlaybackSpeed(1)}
                >
                  1x Hız
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: playbackSpeed === 2.5 ? 'var(--primary)' : '', borderColor: playbackSpeed === 2.5 ? 'var(--primary)' : '' }}
                  onClick={() => setPlaybackSpeed(2.5)}
                >
                  2.5x Hız <FastForward size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', background: playbackSpeed === 5 ? 'var(--primary)' : '', borderColor: playbackSpeed === 5 ? 'var(--primary)' : '' }}
                  onClick={() => setPlaybackSpeed(5)}
                >
                  5x Hız <FastForward size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </button>
              </div>

              <div className="instruction-panel glass-panel" style={{ flexShrink: 0, padding: '1.25rem', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Yükleme Talimatı</h3>
                {animatingIndex >= 0 && animatingIndex < packResult.placed.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'white' }}>
                      Adım {animatingIndex + 1}: <span style={{ color: 'var(--primary)' }}>{packResult.placed[animatingIndex].name}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      Bu paketi alın ve animasyonda gösterilen <strong>hedef konuma</strong> yerleştirin.
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#94a3b8', width: '100%' }}>
                      <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '0.25rem' }}>Ürün Boyutları:</strong>
                      {packResult.placed[animatingIndex].w} <span style={{ fontSize: '0.75rem' }}>G</span> &nbsp;x&nbsp; {packResult.placed[animatingIndex].h} <span style={{ fontSize: '0.75rem' }}>Y</span> &nbsp;x&nbsp; {packResult.placed[animatingIndex].d} <span style={{ fontSize: '0.75rem' }}>D</span> (cm)
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Animasyonu oynatarak ürünlerin tıra nasıl yükleneceğini adım adım görebilirsiniz.
                  </div>
                )}
              </div>

              {/* Next Step Button - pinned to bottom */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                  className="btn"
                  style={{ width: '100%', background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}
                  onClick={() => setView('operator')}
                >
                  <ClipboardList size={18} /> Yükleme Ekranına Geç <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="main-view glass-panel">
              <div className="scene-container">
                <Scene3D 
                  items={items} 
                  containerDims={activeContainerDims} 
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

        {/* --- VIEW 3: OPERATOR TRACKING --- */}
        {view === 'operator' && packResult && (() => {
          // Only count items that have been animated so far (loaded up to current step)
          const loadedCount = Math.max(0, animatingIndex);
          const loadedItems = packResult.placed.slice(0, loadedCount);

          const totalM3 = loadedItems.reduce((sum, item) => sum + (item.placedW * item.placedH * item.placedD) / 1_000_000, 0);
          const containerM3 = (activeContainerDims.w * activeContainerDims.h * activeContainerDims.d) / 1_000_000;
          const volumePct = containerM3 > 0 ? ((totalM3 / containerM3) * 100).toFixed(1) : 0;
          const placedWeight = loadedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
          // Group loaded items by name for summary
          const groupMap = {};
          loadedItems.forEach(item => {
            groupMap[item.name] = (groupMap[item.name] || 0) + 1;
          });
          return (
          <>
            <div className="sidebar glass-panel" style={{ width: '420px', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(249,115,22,0.18))', borderRadius: '12px', padding: '0.6rem', display: 'flex' }}>
                  <ClipboardList size={22} color="#93c5fd" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Yükleme Özeti</h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    Adım {loadedCount} / {packResult.placed.length} — yüklenen ürünler
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BarChart3 size={13} /> Yükleme Özeti
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Yüklenen</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#22c55e' }}>{loadedCount}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ {packResult.placed.length} ürün</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Hacim Kullanımı</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#60a5fa' }}>{volumePct}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{totalM3.toFixed(2)} / {containerM3.toFixed(2)} m³</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Toplam Ağırlık</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f97316' }}>{placedWeight > 0 ? placedWeight : '—'}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>kg</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Toplam Hacim</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#a78bfa' }}>{totalM3.toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>m³</div>
                  </div>
                </div>
                {/* Product type breakdown */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    {loadedCount > 0 ? 'Yüklenen Ürün Dağılımı:' : 'Henüz ürün yüklenmedi'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {Object.entries(groupMap).map(([name, count]) => (
                      <span key={name} style={{ fontSize: '0.68rem', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '999px', padding: '0.15rem 0.55rem', color: '#93c5fd' }}>
                        {name} ×{count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="main-view glass-panel">
              <div className="scene-container">
                <Scene3D
                  items={items}
                  containerDims={activeContainerDims}
                  packResult={packResult}
                  animatingIndex={animatingIndex}
                  onAnimationComplete={() => {}}
                  isPlaying={false}
                  playbackSpeed={1}
                />
              </div>
            </div>
          </>
          );
        })()}
      </div>
      {isScannerOpen && (
        <BarcodeScanner 
          onResult={handleScanResult} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}

    </div>
  );
}

export default App;

