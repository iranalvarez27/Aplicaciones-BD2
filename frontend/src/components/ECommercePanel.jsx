import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ShoppingCart, Search, SlidersHorizontal, X, MapPin, RefreshCw, WifiOff,
  Headphones, Camera, Cpu, Laptop, Monitor, Wifi, Keyboard, Watch, HardDrive, Package,
  Image as ImageIcon, FileText, Tags, Users, Store, Camera as CameraIcon } from 'lucide-react';
import StoresPage from './ecommerce/StoresPage';
import ProductRail from './ecommerce/ProductRail';
import PhotoSearch from './ecommerce/PhotoSearch';
import { fetchEcommerceStatus, fetchEcommerceCatalog, fetchEcommerceBestSellers, fetchEcommerceProductStores, fetchEcommerceProduct, fetchEcommerceRecommendations,
  recordEcommerceInteraction, purchaseEcommerceCart, SinConexionError, PHOTO_EXTENSIONS } from '../utils/api';
import ProductCard, { money } from './ecommerce/ProductCard';
import StoreMap from './ecommerce/StoreMap';
import './ecommerce/shop.css';
import logo from '../assets/tecno-store-logo.png';

const LOCATIONS = [
  { name: 'New York, NY', coords: [40.7128, -74.0060] },
  { name: 'Los Angeles, CA', coords: [34.0522, -118.2437] },
  { name: 'Chicago, IL', coords: [41.8781, -87.6298] },
  { name: 'Houston, TX', coords: [29.7604, -95.3698] },
  { name: 'Phoenix, AZ', coords: [33.4484, -112.0740] },
  { name: 'Seattle, WA', coords: [47.6062, -122.3321] },
  { name: 'Miami, FL', coords: [25.7617, -80.1918] },
  { name: 'Denver, CO', coords: [39.7392, -104.9903] },
];
const LOCATION_KEY = 'bd2_ecommerce_ubicacion';
const CATEGORY_ICONS = {
  Audio: Headphones, Cameras: Camera, Components: Cpu, 'Laptops & Computers': Laptop, Monitors: Monitor,
  Networking: Wifi, Peripherals: Keyboard, Smartwatches: Watch, Storage: HardDrive,
};
const SIGNALS = [
  { key: 'visual', label: 'Imagen', detail: 'Fotos parecidas: embeddings ResNet-50 en índice HNSW o IVF', Icon: ImageIcon },
  { key: 'texto', label: 'Descripción', detail: 'Textos similares: TF-IDF sobre SPIMI y embeddings MiniLM', Icon: FileText },
  { key: 'metadata', label: 'Atributos', detail: 'Misma categoría, marca y precio cercano', Icon: Tags },
  { key: 'compras', label: 'Compras', detail: 'Lo que otros clientes compraron junto con este producto', Icon: Users },
];

function ubicacionGuardada() {
  try {
    const indice = LOCATIONS.findIndex(l => l.name === localStorage.getItem(LOCATION_KEY));
    return indice >= 0 ? indice : 0;
  } catch { return 0; }
}
const INITIAL = { pesos: { visual: .25, texto: .25, metadata: .25, compras: .25 }, metodo: 'HNSW', metrica: 'cosine', texto: 'TF_IDF', solo_stock: false };
const LABELS = { visual: 'Imagen', texto: 'Descripción', metadata: 'Atributos', compras: 'Compras' };

function usuarioDemo() {
  const key = 'bd2_ecommerce_usuario';
  try {
    const actual = Number(localStorage.getItem(key));
    if (Number.isInteger(actual) && actual > 200 && actual < 2147483647) return actual;
    const id = 1000 + Math.floor(Math.random() * 1000000000);
    localStorage.setItem(key, String(id));
    return id;
  } catch { return 1001; }
}

export default function ECommercePanel({ onUseSQL }) {
  const [status, setStatus] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [bestSellers, setBestSellers] = useState(null);
  const [filters, setFilters] = useState({ category: '', search: '', min_price: '', max_price: '' });
  const [draftSearch, setDraftSearch] = useState('');
  const [draftMinPrice, setDraftMinPrice] = useState('');
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [cursor, setCursor] = useState('');
  const [selected, setSelected] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [settings, setSettings] = useState(INITIAL);
  const [draftSettings, setDraftSettings] = useState(INITIAL);
  const [location, setLocation] = useState(ubicacionGuardada);
  const [view, setView] = useState('tienda');
  const [photo, setPhoto] = useState(null);
  const photoInput = useRef(null);
  const [detail, setDetail] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [statusTry, setStatusTry] = useState(0);
  const [message, setMessage] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [store, setStore] = useState('');
  const [buying, setBuying] = useState(false);
  const [revision, setRevision] = useState(0);
  const [user] = useState(usuarioDemo);
  const purchaseKey = useRef(null);
  const shopRef = useRef(null);

  useEffect(() => {
    shopRef.current?.scrollTo({ top: 0 });
  }, [filters, selected, view]);
  const position = LOCATIONS[location].coords;

  function changeLocation(indice) {
    setLocation(indice);
    try { localStorage.setItem(LOCATION_KEY, LOCATIONS[indice].name); } catch { return; }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchEcommerceStatus(controller.signal).then(data => { setOffline(false); setStatus(data); }).catch(e => {
      if (e.name === 'AbortError') return;
      if (e instanceof SinConexionError) setOffline(true);
      else setError(e.message);
    });
    return () => controller.abort();
  }, [statusTry]);

  const isListing = Boolean(filters.search || filters.category || filters.min_price !== '' || filters.max_price !== '');
  const showBestSellers = !selected && !filters.search && filters.min_price === '' && filters.max_price === '';

  useEffect(() => {
    if (!status?.listo || !showBestSellers) return;
    const controller = new AbortController();
    fetchEcommerceBestSellers({ category: filters.category, limit: 6 }, controller.signal)
      .then(data => setBestSellers({ ...data, categoria: filters.category }))
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [status, showBestSellers, filters.category, revision]);

  const hasBestSellers = showBestSellers && bestSellers?.categoria === filters.category && !!bestSellers.productos.length;
  const bestSellersSection = hasBestSellers && <section className="shop-best">
    <div className="shop-section-title">
      <h2>{filters.category ? `Más vendidos en ${filters.category}` : 'Los más vendidos'}</h2>
      <span>Según compradores reales del dataset</span>
    </div>
    <ProductRail label="Los más vendidos">{bestSellers.productos.map((p, i) => <ProductCard key={p.id} producto={p} puesto={i + 1} onSelect={selectProduct} />)}</ProductRail>
  </section>;

  function goHome() {
    setView('tienda'); setSelected(null); setCursor(''); setDraftSearch(''); setDraftMinPrice(''); setDraftMaxPrice('');
    setFilters({ category: '', search: '', min_price: '', max_price: '' });
  }

  function selectCategory(category) {
    setView('tienda'); setSelected(null); setCursor('');
    setFilters(f => ({ ...f, category }));
  }

  function submitSearch(e) {
    e.preventDefault();
    setView('tienda'); setSelected(null); setCursor('');
    setFilters(f => ({ ...f, search: draftSearch.trim() }));
  }

  function applyPrice(e) {
    e.preventDefault();
    const minCents = draftMinPrice.trim() !== '' ? Math.round(Number(draftMinPrice) * 100) : '';
    const maxCents = draftMaxPrice.trim() !== '' ? Math.round(Number(draftMaxPrice) * 100) : '';
    if ((minCents !== '' && (!Number.isFinite(minCents) || minCents < 0)) || (maxCents !== '' && (!Number.isFinite(maxCents) || maxCents < 0))) {
      setError('Ingresa un rango de precios válido');
      return;
    }
    if (minCents !== '' && maxCents !== '' && minCents > maxCents) {
      setError('El precio mínimo supera el máximo');
      return;
    }
    setCursor('');
    setFilters(f => ({ ...f, min_price: minCents, max_price: maxCents }));
  }

  useEffect(() => {
    if (!status?.listo) return;
    const controller = new AbortController();
    setLoadingCatalog(true);
    setError('');
    const params = { category: filters.category, search: filters.search, limit: 24 };
    if (filters.min_price !== '') params.min_price = filters.min_price;
    if (filters.max_price !== '') params.max_price = filters.max_price;
    if (cursor) params[filters.search ? 'cursor' : 'after_id'] = cursor;
    fetchEcommerceCatalog(params, controller.signal).then(data => {
      setCatalog(previous => ({ ...data, productos: cursor ? [...(previous?.productos || []), ...data.productos] : data.productos }));
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoadingCatalog(false); });
    return () => controller.abort();
  }, [filters, cursor, status]);

  const detailKey = `${selected}|${location}|${revision}`;
  const recommendationKey = `${detailKey}|${JSON.stringify(settings)}`;
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const key = `${selected}|${location}|${revision}`;
    Promise.all([
      fetchEcommerceProduct(selected, controller.signal),
      fetchEcommerceProductStores(selected, LOCATIONS[location].coords, controller.signal),
    ]).then(([producto, disponibilidad]) => {
      setDetail({ key, producto, ...disponibilidad });
      setStore(String(disponibilidad.tiendas[0]?.id || ''));
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [selected, location, revision]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const key = `${selected}|${location}|${revision}|${JSON.stringify(settings)}`;
    fetchEcommerceRecommendations({ product_id: selected, k: 10, ...settings,
      lat: LOCATIONS[location].coords[0], lon: LOCATIONS[location].coords[1] }, controller.signal)
      .then(rec => setRecommendation({ ...rec, key }))
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [selected, settings, location, revision]);

  const currentDetail = detail?.key === detailKey ? detail : null;
  const product = currentDetail?.producto || null;
  const productStores = currentDetail?.tiendas || [];
  const currentRecommendation = recommendation?.key === recommendationKey ? recommendation : null;

  function choosePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!PHOTO_EXTENSIONS.includes(extension)) { setError('Elige una foto JPG, PNG, WEBP o BMP'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('La foto pesa más de 10 MB'); return; }
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setView('foto'); setSelected(null); setCartOpen(false); setError('');
  }

  function openStores() {
    setView('tiendas'); setSelected(null); setCartOpen(false);
  }

  function selectProduct(id) {
    setView(v => (v === 'foto' ? 'foto' : 'tienda'));
    setSelected(id);
    setMessage('');
    recordEcommerceInteraction({ usuario_id: user, producto_id: id, tipo: 'vista' }).catch(e => setError(e.message));
  }

  function addToCart() {
    const tienda = productStores.find(t => t.id === Number(store));
    if (!tienda || buying) return;
    const existente = cart.find(p => p.id === product.id && p.tienda_id === tienda.id);
    if ((existente?.cantidad || 0) >= tienda.stock) { setError('Se alcanzó el stock disponible en esa sucursal'); return; }
    purchaseKey.current = null;
    setCart(old => existente ? old.map(p => p === existente ? { ...p, cantidad: p.cantidad + 1 } : p)
      : [...old, { ...product, tienda_id: tienda.id, tienda_nombre: tienda.nombre, cantidad: 1 }]);
    setMessage('Producto añadido al carrito');
    recordEcommerceInteraction({ usuario_id: user, producto_id: product.id, tipo: 'carrito' }).catch(e => setError(e.message));
  }

  async function buy() {
    if (!cart.length || buying) return;
    setBuying(true); setError('');
    purchaseKey.current ||= crypto.randomUUID();
    try {
      const result = await purchaseEcommerceCart({ usuario_id: user, solicitud: purchaseKey.current,
        items: cart.map(p => ({ producto_id: p.id, tienda_id: p.tienda_id, cantidad: p.cantidad })) });
      setCart([]); purchaseKey.current = null;
      setMessage(`Compra de demostración registrada por ${money(result.total_centavos)}. Inventario y recomendaciones actualizados.`);
      setRevision(r => r + 1);
    } catch (e) { setError(e.message); }
    finally { setBuying(false); }
  }

  return <div className="shop" ref={shopRef} aria-label="Tienda de recomendaciones">
    <div className="shop-top">
      <header className="shop-header">
        <button className="shop-brand" onClick={goHome} aria-label="Ir al inicio de la tienda">
          <img className="shop-brand-mark" src={logo} alt="" />
          <span><strong>Tecno Store</strong><small>Electrónica con recomendaciones inteligentes</small></span>
        </button>
        <form className="shop-header-search" role="search" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <input aria-label="Buscar productos" value={draftSearch} onChange={e => setDraftSearch(e.target.value)}
            placeholder="Busca en inglés: wireless headphones, ssd 1tb, webcam…" disabled={!status?.listo} />
          <button type="button" className="shop-photo-button" onClick={() => photoInput.current?.click()} disabled={!status?.listo}
            aria-label="Buscar con una foto" title="Buscar con una foto"><CameraIcon size={18} /></button>
          <input ref={photoInput} type="file" accept={PHOTO_EXTENSIONS.join(',')} onChange={choosePhoto} hidden />
          <button type="submit" disabled={!status?.listo}>Buscar</button>
        </form>
        <label className="shop-location" title="Tu ubicación: define qué tiendas aparecen como cercanas">
          <MapPin size={17} aria-hidden="true" />
          <span><small>Tu ubicación</small>
            <select aria-label="Tu ubicación" value={location} onChange={e => changeLocation(Number(e.target.value))}>
              {LOCATIONS.map(({ name }, i) => <option key={name} value={i}>{name}</option>)}
            </select></span>
        </label>
        <button className={`shop-cart-button ${view === 'tiendas' ? 'is-open' : ''}`} onClick={openStores} disabled={!status?.listo} aria-pressed={view === 'tiendas'}>
          <Store size={20} aria-hidden="true" /><span>Tiendas</span>
        </button>
        <button className={`shop-cart-button ${cartOpen ? 'is-open' : ''}`} onClick={() => setCartOpen(v => !v)}>
          <ShoppingCart size={20} aria-hidden="true" /><span>Carrito</span>
          <b aria-label="productos en el carrito">{cart.reduce((n, p) => n + p.cantidad, 0)}</b>
        </button>
      </header>
      {status?.listo && !!catalog?.categorias?.length && <nav className="shop-categories" aria-label="Categorías">
        <button className={!filters.category ? 'is-active' : ''} onClick={() => selectCategory('')}>Todas</button>
        {catalog.categorias.map(c => <button key={c} className={filters.category === c ? 'is-active' : ''} onClick={() => selectCategory(c)}>{c}</button>)}
      </nav>}
    </div>
    {error && <div className="shop-error" role="alert">{error}<button aria-label="Cerrar error" onClick={() => setError('')}><X size={16} /></button></div>}
    {message && <div className="shop-success" role="status">{message}</div>}
    {offline && <div className="shop-state" role="alert">
      <span className="shop-state-icon"><WifiOff size={26} /></span>
      <h2>No se pudo conectar con el motor de la tienda</h2>
      <p>El catálogo, la búsqueda y las recomendaciones vienen del motor de base de datos (Proyecto-BD2). Verifica que esté corriendo en el puerto 8000 y vuelve a intentarlo.</p>
      <code>python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000</code>
      <button className="shop-primary" onClick={() => { setOffline(false); setStatusTry(n => n + 1); }}><RefreshCw size={16} /> Reintentar</button>
    </div>}
    {!status && !offline && !error && <p className="shop-empty" role="status">Conectando con el catálogo…</p>}
    {status && !status.listo && <div className="shop-state">
      <span className="shop-state-icon"><Package size={26} /></span>
      <h2>La tienda todavía no está preparada</h2>
      <p>El motor está activo, pero faltan las tablas e índices del e-commerce. Ejecuta la preparación en Proyecto-BD2 con el backend detenido y luego vuelve a iniciarlo.</p>
      <code>python -m recomendacion.preparar</code>
      <button className="shop-primary" onClick={() => setStatusTry(n => n + 1)}><RefreshCw size={16} /> Volver a comprobar</button>
    </div>}
    {cartOpen && <section className="shop-cart">
      <h2>Tu carrito</h2>
      {!cart.length && <p>Selecciona un producto y una sucursal para añadirlo.</p>}
      {cart.map(p => <div className="shop-cart-line" key={`${p.id}-${p.tienda_id}`}>
        <img src={p.media_url} alt="" /><div><strong>{p.nombre}</strong><small>{p.tienda_nombre} · Cantidad {p.cantidad}</small></div>
        <span>{money(p.precio_centavos * p.cantidad)}</span><button aria-label={`Quitar ${p.nombre}`} disabled={buying} onClick={() => { purchaseKey.current = null; setCart(old => old.filter(item => item !== p)); }}><X size={17} /></button>
      </div>)}
      {!!cart.length && <div className="shop-cart-total"><strong>Total {money(cart.reduce((sum, p) => sum + p.precio_centavos * p.cantidad, 0))}</strong><button className="shop-primary" disabled={buying} onClick={buy}>{buying ? 'Registrando compra…' : 'Confirmar compra de demostración'}</button></div>}
    </section>}
    {status?.listo && view === 'foto' && photo && !selected && <PhotoSearch key={photo.preview} foto={photo} onSelect={selectProduct} onUseSQL={onUseSQL} onError={setError} />}
    {status?.listo && view === 'tiendas' &&<StoresPage key={location} ubicacion={LOCATIONS[location]} onUseSQL={onUseSQL} onError={setError} />}
    {status?.listo && view === 'tienda' && !selected && !isListing && <>
      <section className="shop-hero">
        <div>
          <h1>Encuentra la tecnología que necesitas</h1>
          <p className="shop-hero-lead">Laptops, audio, cámaras, almacenamiento y más, con reseñas y compras reales de Amazon. Compra en línea y retira en una tienda cerca de {LOCATIONS[location].name}.</p>
          <div className="shop-hero-actions">
            <button className="shop-primary" onClick={() => document.getElementById('shop-catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Ver productos</button>
            <span className="shop-hero-count"><strong>{status.productos.toLocaleString('es')}</strong> productos disponibles</span>
          </div>
        </div>
        <aside className="shop-signals" aria-label="Cómo se eligen las recomendaciones">
          <h2>Recomendaciones con cuatro señales</h2>
          <p>Cada ficha mezcla estas señales y te muestra cuánto pesó cada una.</p>
          <div className="shop-signal-band" aria-hidden="true" />
          <ul>
            {SIGNALS.map(({ key, label, detail, Icon }) => <li key={key}>
              <span className={`shop-signal-${key}`}><Icon size={17} aria-hidden="true" /></span>
              <div><strong>{label}</strong><small>{detail}</small></div>
            </li>)}
          </ul>
        </aside>
      </section>
      {!!catalog?.categorias?.length && <section>
        <div className="shop-section-title"><h2>Compra por categoría</h2></div>
        <div className="shop-cat-grid">{catalog.categorias.map(c => {
          const Icon = CATEGORY_ICONS[c] || Package;
          return <button key={c} className="shop-cat-card" onClick={() => selectCategory(c)}><span><Icon size={24} /></span>{c}</button>;
        })}</div>
      </section>}
      {bestSellersSection}
      <div className="shop-section-title" id="shop-catalogo"><h2>Explora el catálogo</h2><span>Ordenado por código de producto</span></div>
    </>}
    {status?.listo && view === 'tienda' && !selected && isListing && <>
      <div className="shop-listing-head">
        <div>
          <p className="shop-breadcrumb"><button onClick={goHome}>Inicio</button> / {filters.category || 'Todas las categorías'}</p>
          <h1>{filters.search ? <>Resultados para “{filters.search}”</> : filters.category || 'Todos los productos'}</h1>
          {filters.search && <p className="shop-muted">Búsqueda híbrida del motor: BM25 + embeddings MiniLM + popularidad.</p>}
        </div>
        <button className="shop-button" onClick={goHome}>Limpiar filtros</button>
      </div>
      <form className="shop-filters" onSubmit={applyPrice}>
        <label>Categoría
          <select value={filters.category} onChange={e => selectCategory(e.target.value)}>
            <option value="">Todas las categorías</option>{catalog?.categorias.map(c => <option key={c}>{c}</option>)}
          </select></label>
        <label>Precio mínimo (USD)<input type="number" min="0" step="0.01" value={draftMinPrice} onChange={e => setDraftMinPrice(e.target.value)} placeholder="0" /></label>
        <label>Precio máximo (USD)<input type="number" min="0" step="0.01" value={draftMaxPrice} onChange={e => setDraftMaxPrice(e.target.value)} placeholder="Sin límite" /></label>
        <button className="shop-primary" type="submit">Aplicar precio</button>
      </form>
      {bestSellersSection}
      {hasBestSellers && <div className="shop-section-title"><h2>Todos los productos de {filters.category}</h2></div>}
    </>}
    {status?.listo && view === 'tienda' && !selected && <>
      <div className="shop-grid" aria-busy={loadingCatalog}>{catalog?.productos.map(p => <ProductCard key={p.id} producto={p} onSelect={selectProduct} />)}</div>
      {loadingCatalog && <p className="shop-empty" role="status">Cargando productos…</p>}
      {!loadingCatalog && catalog?.productos.length === 0 && <p className="shop-empty">No hay productos con estos filtros.</p>}
      {catalog?.busqueda_acotada && <p className="shop-empty">Mostrando los primeros 500 resultados. Puedes precisar la búsqueda.</p>}
      {catalog?.next_cursor && <button className="shop-more shop-button" disabled={loadingCatalog} onClick={() => setCursor(catalog.next_cursor)}>Mostrar más productos</button>}
      {!!catalog?.trazas?.length && <details className="shop-traces"><summary>Consultas y planes de ejecución del catálogo</summary>
        {catalog.trazas.map((t, i) => <article key={i}><pre>{t.sql}</pre><p>{t.plan.join(' → ')}</p><span>{t.tiempo_ms.toFixed(2)} ms</span><button className="shop-button" onClick={() => onUseSQL(t.sql)}>Copiar SQL</button></article>)}
      </details>}
    </>}
    {(view === 'tienda' || view === 'foto') && selected && <>
      <button className="shop-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> {view === 'foto' ? 'Volver a los resultados de tu foto' : 'Volver al catálogo'}</button>
      {!product && <p className="shop-empty" role="status">Cargando el producto y su disponibilidad…</p>}
      {product && <>
        <section className="shop-detail">
          <div className="shop-detail-image"><img src={product.media_url} alt={product.nombre} /></div>
          <div className="shop-detail-copy"><p className="shop-category">{product.subcategoria}</p><h1>{product.nombre}</h1>
            <div className="shop-detail-price">{money(product.precio_centavos, product.moneda)}</div>
            {!!product.rating && <p className="shop-muted">Valoración del dataset {product.rating.toFixed(1)} / 5</p>}
            <details><summary>Descripción y características</summary><p className="shop-description">{product.descripcion}</p></details>
            {productStores.length ? <>
              <label className="shop-stock">Recoger en una sucursal<select value={store} onChange={e => setStore(e.target.value)}>{productStores.map(t => <option value={t.id} key={t.id}>{t.nombre} · {(t.dist_m / 1000).toFixed(1)} km · {t.stock} disponibles</option>)}</select></label>
              <button className="shop-primary" disabled={!store || buying} onClick={addToCart}><ShoppingCart size={17} /> Añadir al carrito</button>
            </> : <p className="shop-muted">Sin stock en las sucursales de demostración.</p>}
          </div>
        </section>
        <details className="shop-controls"><summary><SlidersHorizontal size={17} /> Ajustar recomendaciones</summary><form onSubmit={e => { e.preventDefault(); setSettings({ ...draftSettings }); }}>
          <div className="shop-sliders">{Object.entries(draftSettings.pesos).map(([m, value]) => <label key={m}>{LABELS[m]}<output>{Math.round(value * 100)}</output><input type="range" min="0" max="1" step="0.05" value={value} onChange={e => setDraftSettings(s => ({ ...s, pesos: { ...s.pesos, [m]: Number(e.target.value) } }))} /></label>)}</div>
          <div className="shop-selectors"><label>Índice visual<select value={draftSettings.metodo} onChange={e => setDraftSettings(s => ({ ...s, metodo: e.target.value }))}>{['HNSW', 'IVF', 'EXACT'].map(v => <option key={v}>{v}</option>)}</select></label>
            <label>Métrica<select value={draftSettings.metrica} onChange={e => setDraftSettings(s => ({ ...s, metrica: e.target.value }))}><option value="cosine">Coseno</option><option value="euclidean">Euclidiana</option><option value="dot">Producto punto</option></select></label>
            <label>Texto<select value={draftSettings.texto} onChange={e => setDraftSettings(s => ({ ...s, texto: e.target.value }))}><option>BM25</option><option>TF_IDF</option></select></label>
            <label className="shop-check"><input type="checkbox" checked={draftSettings.solo_stock} onChange={e => setDraftSettings(s => ({ ...s, solo_stock: e.target.checked }))} /> Solo con stock</label>
            <button className="shop-primary" disabled={Object.values(draftSettings.pesos).every(v => v === 0)}>Aplicar</button>
          </div>
        </form></details>
        {!currentRecommendation && <p className="shop-empty" role="status">Calculando recomendaciones con las cuatro señales…</p>}
        {currentRecommendation && <>
          <div className="shop-section-title"><h2>También puede interesarte</h2><span title="tiempo_total_ms que devuelve el motor">Calculado por el motor en {Math.round(currentRecommendation.tiempo_total_ms).toLocaleString('es')} ms</span></div>
          <div className="shop-legend">{Object.entries(LABELS).map(([m, label]) => <span key={m}><i className={`shop-signal-${m}`} />{label}</span>)}</div>
          {Object.entries(currentRecommendation.errores_modalidades).map(([m, detail]) => <p className="shop-error" key={m}>{LABELS[m]} no disponible. {detail}</p>)}
          {!!currentRecommendation.recomendaciones.length && <ProductRail label="También puede interesarte">{currentRecommendation.recomendaciones.map(p => <ProductCard key={p.id} producto={p} onSelect={selectProduct} />)}</ProductRail>}
          {!currentRecommendation.recomendaciones.length && <p className="shop-empty">No hay recomendaciones con esta configuración.</p>}
        </>}
        {!!productStores.length && <section className="shop-stores">
          <div className="shop-section-title"><h2>Sucursales con stock cerca de {LOCATIONS[location].name}</h2><span>Inventario simulado del motor</span></div>
          <StoreMap tiendas={productStores} ubicacion={position} />
        </section>}
        <details className="shop-traces"><summary>Consultas y planes de ejecución</summary>
          {currentRecommendation && <>
            <p>Las barras muestran la contribución de cada estrategia al ranking.</p>
            <div className="shop-modalities">{Object.entries(currentRecommendation.modalidades).map(([m, state]) => <span key={m}>{LABELS[m]} · {state.replaceAll('_', ' ')}</span>)}</div>
          </>}
          {[...(currentDetail?.trazas || []), ...(currentRecommendation?.trazas || [])].map((t, i) => <article key={i}><pre>{t.sql}</pre><p>{t.plan.join(' → ')}</p><span>{t.tiempo_ms.toFixed(2)} ms</span><button className="shop-button" onClick={() => onUseSQL(t.sql)}>Copiar SQL</button></article>)}
        </details>
      </>}
    </>}
  </div>;
}
