import { useEffect, useState } from 'react';
import { Star, MapPin } from 'lucide-react';
import { fetchEcommerceBestSellers } from '../../utils/api';
import { money } from './ProductCard';
import logo from '../../assets/lacachina-logo.png';

const DESTACADAS = ['Audio', 'Laptops & Computers', 'Monitors', 'Cameras', 'Smartwatches'];

export default function HeroShowcase({ productos, ubicacion, onSelect, onBrowse, onStores, onError }) {
  const [categoria, setCategoria] = useState(DESTACADAS[0]);
  const [destacados, setDestacados] = useState({});

  useEffect(() => {
    if (destacados[categoria]) return;
    const controller = new AbortController();
    fetchEcommerceBestSellers({ category: categoria, limit: 1 }, controller.signal)
      .then(data => { if (data.productos[0]) setDestacados(d => ({ ...d, [categoria]: data.productos[0] })); })
      .catch(e => { if (e.name !== 'AbortError') onError(e.message); });
    return () => controller.abort();
  }, [categoria, destacados, onError]);

  const producto = destacados[categoria];

  return <section className="shop-showcase">
    <div className="shop-showcase-copy">
      <h1>Encuentra la tecnología que necesitas</h1>
      <p>Laptops, audio, cámaras y más, con reseñas y compras reales de Amazon. Compra en línea y retira en una tienda cerca de {ubicacion}.</p>
      <div className="shop-showcase-actions">
        <button className="shop-primary" onClick={onBrowse}>Ver productos</button>
        <button className="shop-showcase-link" onClick={onStores}><MapPin size={16} aria-hidden="true" /> Buscar tiendas cerca</button>
      </div>
      <p className="shop-showcase-count"><strong>{productos.toLocaleString('es')}</strong> productos en el catálogo</p>
    </div>

    <div className="shop-showcase-stage">
      <div className="shop-laptop">
        <div className="shop-laptop-lid">
          <button className="shop-laptop-screen" onClick={() => producto && onSelect(producto.id)} disabled={!producto}
            aria-label={producto ? `Ver ${producto.nombre}` : 'Cargando producto destacado'}>
            <span className="shop-screen-bar">
              <img src={logo} alt="LaCachina" /><i>{categoria}</i>
            </span>
            {producto ? <span className="shop-screen-page" key={producto.id}>
              <span className="shop-screen-photo"><img src={producto.media_url} alt="" /></span>
              <span className="shop-screen-info">
                <small>Más vendido en {categoria}</small>
                <strong>{producto.nombre}</strong>
                <span className="shop-screen-price">{money(producto.precio_centavos, producto.moneda)}</span>
                <span className="shop-screen-meta">
                  {!!producto.rating && <><Star size={12} aria-hidden="true" /> {producto.rating.toFixed(1)}</>}
                  <span>{producto.compradores.toLocaleString('es')} compradores</span>
                </span>
                <span className="shop-screen-cta">Ver producto</span>
              </span>
            </span> : <span className="shop-screen-loading">Cargando el más vendido…</span>}
          </button>
        </div>
        <div className="shop-laptop-base" aria-hidden="true"><span /></div>
      </div>
      <div className="shop-showcase-picker" role="group" aria-label="Elegir categoría destacada">
        {DESTACADAS.map(c => <button key={c} className={c === categoria ? 'is-active' : ''} aria-pressed={c === categoria} onClick={() => setCategoria(c)}>{c}</button>)}
      </div>
    </div>
  </section>;
}
