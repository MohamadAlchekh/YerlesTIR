import React, { useState, useEffect, useRef } from 'react';
import { Package, Truck, Layers, Info, Trash2, Box, BarChart3, Play, Pause, SkipForward, SkipBack, CheckSquare, Upload, ArrowRight, CheckCircle2, Circle, Home } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { api } from './api';
import Scene3D from './components/Scene3D';
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
  const [view, setView] = useState('input'); // input, optimization, operator
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [containerType, setContainerType] = useState('');
  const [packResult, setPackResult] = useState(null);
  
  // Animation State
  const [animatingIndex, setAnimatingIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Operator State
  const [checkedItems, setCheckedItems] = useState(new Set());

  // Form State
  const [newItem, setNewItem] = useState({
    name: '', w: '', h: '', d: '', weight: '', stackable: true, count: 1
  });

  const fileInputRef = useRef(null);

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
      alert("Hata: Girdiğiniz ürün ölçüleri konteynere sığmayacak kadar büyük!");
      return;
    }

    if (count > 200 || items.length + count > 300) {
      alert("Hata: Performans sorunu yaşamamak için toplam ürün sayısını 300 ile sınırlandırınız.");
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
      alert("Hata: " + error.message);
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

  return (
    <div className="app-wrapper">
      {/* TOP NAVIGATION */}
      <div className="top-nav glass-panel">
        <div className="logo-container" style={{ margin: 0 }}>
          <div className="logo-icon"><Layers size={20} /></div>
          <h1 style={{ marginBottom: 0, fontSize: '1.2rem', marginRight: '2rem' }}>Diginova BinPacker</h1>
        </div>
        <div className="nav-buttons">
          <a href="/anasayfa/index.html" className="nav-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Home size={18} /> Anasayfa
          </a>
          <button className={`nav-btn ${view === 'input' ? 'active' : ''}`} onClick={() => setView('input')}>1. Veri Girişi</button>
          <button className={`nav-btn ${view === 'optimization' ? 'active' : ''}`} disabled={!packResult} onClick={() => setView('optimization')}>2. Optimizasyon Sonucu</button>
          <button className={`nav-btn ${view === 'operator' ? 'active' : ''}`} disabled={!packResult} onClick={() => setView('operator')}>3. Operatör Ekranı</button>
        </div>
      </div>

      <div className="app-container">
        {/* --- VIEW 1: INPUT --- */}
        {view === 'input' && (
          <>
            <div className="sidebar glass-panel" style={{ width: '400px' }}>
              <h2><Truck size={18} /> Konteyner Seçimi</h2>
              <div className="form-group">
                <select value={containerType} onChange={(e) => setContainerType(e.target.value)}>
                  {containers.map((c) => (
                    <option key={c.type} value={c.type}>{c.label}</option>
                  ))}
                </select>
              </div>

              <hr className="divider" />

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
                  <input type="number" placeholder="Adet" min="1" required value={newItem.count} onChange={e => setNewItem({...newItem, count: parseInt(e.target.value) || 1})} className="flex-1" />
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

              <button className="btn btn-secondary" onClick={exportJSON} disabled={items.length === 0} style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.5rem' }}>
                Geliştirici: JSON İndir (Backend Formatı)
              </button>
            </div>

            <div className="main-view glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <h2><Package size={18} /> Eklenen Ürünler ({items.length})</h2>
              {items.length === 0 ? (
                <div className="empty-state">Henüz ürün eklenmedi. Örnek CSV formatı: <br/><br/><code>isim, adet, en, boy, derinlik, ağırlık</code></div>
              ) : (
                <div className="items-grid">
                  {items.map((item, idx) => (
                    <div key={item.id} className="item-card animate-fade-in" style={{ animationDelay: `${Math.min(idx * 0.02, 1)}s` }}>
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-dims">{item.w}x{item.h}x{item.d} cm {item.weight > 0 ? `| ${item.weight}kg` : ''}</span>
                      </div>
                      <button className="delete-btn" onClick={() => handleRemoveItem(item.id)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- VIEW 2: OPTIMIZATION RESULTS --- */}
        {view === 'optimization' && packResult && (
          <>
            <div className="sidebar glass-panel">
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
                onClick={() => generatePDF(packResult, activeContainer?.label || 'Konteyner', totalWeight)}
              >
                İrsaliye PDF İndir
              </button>
              
              <hr className="divider" />
              
              <h2><Play size={18} /> Animasyon Kontrolleri</h2>
              <div className="anim-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={stepBackward} disabled={animatingIndex <= 0}><SkipBack size={18} /></button>
                <button className="btn" onClick={handlePlayPause} style={{ flex: 1 }}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />} {isPlaying ? 'Durdur' : 'Oynat'}
                </button>
                <button className="btn btn-secondary" onClick={stepForward} disabled={animatingIndex >= packResult.placed.length - 1}><SkipForward size={18} /></button>
              </div>

              <div className="instruction-panel glass-panel" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Talimat</h3>
                {animatingIndex >= 0 && animatingIndex < packResult.placed.length ? (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{animatingIndex + 1}. {packResult.placed[animatingIndex].name}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      Şimdi bu paketi alın ve şekilde gösterilen konuma yerleştirin.
                      <br/><br/>
                      <strong style={{ color: 'var(--text-muted)' }}>Boyutlar:</strong> {packResult.placed[animatingIndex].w} x {packResult.placed[animatingIndex].h} x {packResult.placed[animatingIndex].d} cm
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Yerleşim tamamlandı.
                  </div>
                )}
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
                />
              </div>
            </div>
          </>
        )}

        {/* --- VIEW 3: OPERATOR TRACKING --- */}
        {view === 'operator' && packResult && (
          <>
            <div className="sidebar glass-panel" style={{ width: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: 0 }}><CheckSquare size={18} /> Operatör İşlem Listesi</h2>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                  onClick={handleToggleAllChecks}
                >
                  {checkedItems.size === packResult.placed.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>İlerleme:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                    {Math.round((checkedItems.size / packResult.placed.length) * 100)}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${(checkedItems.size / packResult.placed.length) * 100}%`, background: 'var(--success)' }}></div>
                </div>
              </div>

              <div className="checklist-container">
                {packResult.placed.map((item, idx) => (
                  <div 
                    key={item.id + idx} 
                    className={`checklist-item ${checkedItems.has(idx) ? 'checked' : ''} ${animatingIndex === idx ? 'active' : ''}`}
                    onClick={() => toggleCheck(idx)}
                  >
                    <div className="check-icon">
                      {checkedItems.has(idx) ? <CheckCircle2 size={24} color="var(--success)" /> : <Circle size={24} color="var(--text-muted)" />}
                    </div>
                    <div className="check-info">
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: checkedItems.has(idx) ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: checkedItems.has(idx) ? 'line-through' : 'none' }}>
                        {idx + 1}. {item.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.w}x{item.h}x{item.d} cm | Konum: ({Math.round(item.x)}, {Math.round(item.y)}, {Math.round(item.z)})
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
                  containerDims={activeContainerDims} 
                  packResult={packResult} 
                  animatingIndex={animatingIndex} 
                  onAnimationComplete={() => {}}
                  isPlaying={false}
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

