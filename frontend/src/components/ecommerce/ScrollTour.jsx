import { useEffect, useRef, useState } from 'react';
import { Search, Camera, MapPin } from 'lucide-react';
import { fetchEcommerceCatalog, fetchEcommerceRecommendations, fetchEcommerceNearbyStores, fetchEcommerceProduct, searchSimilarToCatalogPhoto } from '../../utils/api';
import { money } from './ProductCard';
import logo from '../../assets/tecno-store-logo.png';

const CONSULTA = 'wireless headphones';
const PRODUCTO_BASE = 4;
const SENALES = { visual: 'Imagen', texto: 'Descripción', metadata: 'Atributos', compras: 'Compras' };
const km = m => `${(m / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} km`;

async function cargarTour(coords) {
  const [busqueda, recomendacion, tiendas, base] = await Promise.all([
    fetchEcommerceCatalog({ search: CONSULTA, limit: 4, category: '' }),
    fetchEcommerceRecommendations({ product_id: PRODUCTO_BASE, k: 3, lat: coords[0], lon: coords[1] }),
    fetchEcommerceNearbyStores(coords, 3),
    fetchEcommerceProduct(PRODUCTO_BASE),
  ]);
  const similares = await searchSimilarToCatalogPhoto(base.ruta, 4);
  const filas = similares.rows.filter(([id]) => id !== base.id).slice(0, 3);
  const parecidos = await Promise.all(filas.map(([id]) => fetchEcommerceProduct(id)));
  return {
    busqueda, recomendacion, tiendas, base,
    foto: { productos: parecidos.map((p, i) => ({ ...p, score: filas[i][1] })), vector: similares.vector },
  };
}

function Pantalla({ paso, datos, ciudad }) {
  if (!datos) return <div className="shop-tour-screen">
    <div className="shop-screen-bar"><img src={logo} alt="" /><b>Tecno Store</b></div>
    <div className="shop-tour-body" role="status" aria-label="Consultando al motor">
      <div className="shop-skeleton-row is-tour" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="shop-skeleton-card"><i /><b /><em /></div>)}</div>
      <small className="shop-tour-foot">Consultando al motor…</small>
    </div>
  </div>;
  const { busqueda, recomendacion, tiendas, base, foto } = datos;
  return <div className="shop-tour-screen" key={paso}>
    <div className="shop-screen-bar"><img src={logo} alt="" /><b>Tecno Store</b>
      <i>{['Búsqueda', 'Recomendaciones', 'Tiendas', 'Búsqueda por foto'][paso]}</i></div>
    {paso === 0 && <div className="shop-tour-body">
      <div className="shop-tour-query"><Search size={13} aria-hidden="true" /> {CONSULTA}</div>
      <div className="shop-tour-grid">{busqueda.productos.map(p => <div key={p.id} className="shop-tour-item">
        <img src={p.media_url} alt="" /><span>{p.nombre}</span><b>{money(p.precio_centavos, p.moneda)}</b></div>)}</div>
    </div>}
    {paso === 1 && <div className="shop-tour-body">
      <div className="shop-tour-base"><img src={base.media_url} alt="" /><span>{base.nombre}</span></div>
      {recomendacion.recomendaciones.map(r => <div key={r.id} className="shop-tour-reco">
        <img src={r.media_url} alt="" />
        <div><span>{r.nombre}</span>
          <span className="shop-contributions">{Object.entries(r.aportes_pct).filter(([, v]) => v > 0).map(([m, v]) =>
            <span key={m} className={`shop-signal-${m}`} style={{ width: `${v}%` }} title={`${SENALES[m]} ${v.toFixed(0)}%`} />)}</span></div>
      </div>)}
      <small className="shop-tour-foot">Calculado por el motor en {Math.round(recomendacion.tiempo_total_ms).toLocaleString('es')} ms</small>
    </div>}
    {paso === 2 && <div className="shop-tour-body">
      <div className="shop-tour-query"><MapPin size={13} aria-hidden="true" /> {ciudad}</div>
      <ol className="shop-tour-stores">{tiendas.tiendas.map(t => <li key={t.id}><span>{t.nombre}</span><b>{km(t.dist_m)}</b></li>)}</ol>
      <small className="shop-tour-foot">{tiendas.trazas[0]?.plan[0]}</small>
    </div>}
    {paso === 3 && <div className="shop-tour-body shop-tour-photo">
      <div className="shop-tour-base"><img src={base.media_url} alt="" /><span><Camera size={12} aria-hidden="true" /> Tu foto</span></div>
      <div className="shop-tour-grid is-three">{foto.productos.map(p => <div key={p.id} className="shop-tour-item">
        <img src={p.media_url} alt="" /><span>{p.nombre}</span><b className="shop-similarity">Parecido {Math.round(p.score * 100)}%</b></div>)}</div>
      <small className="shop-tour-foot">Vector de {foto.vector.extraccion.dimension_vector} dimensiones · búsqueda en {foto.vector.metricas.tiempo_busqueda_ms.toFixed(1)} ms sobre {foto.vector.metricas.vectores_indexados.toLocaleString('es')} fotos</small>
    </div>}
  </div>;
}

function Laptop({ children }) {
  return <div className="shop-laptop shop-tour-laptop">
    <div className="shop-laptop-lid">{children}</div>
    <div className="shop-laptop-base" aria-hidden="true"><span /></div>
  </div>;
}

export default function ScrollTour({ ubicacion, onPhoto, onError }) {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState(null);
  const seccion = useRef(null);
  const pasos = useRef([]);

  useEffect(() => {
    let vigente = true;
    const observer = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      observer.disconnect();
      cargarTour(ubicacion.coords).then(d => { if (vigente) setDatos({ ...d, ciudad: ubicacion.name }); })
        .catch(e => { if (vigente) onError(e.message); });
    }, { rootMargin: '1500px 0px' });
    observer.observe(seccion.current);
    return () => { vigente = false; observer.disconnect(); };
  }, [ubicacion, onError]);

  useEffect(() => {
    const contenedor = seccion.current.closest('.shop') || window;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      const centro = window.innerHeight / 2;
      const actual = pasos.current.findIndex(el => {
        const caja = el?.getBoundingClientRect();
        return caja && caja.top <= centro && caja.bottom >= centro;
      });
      if (actual >= 0) setPaso(actual);
    };
    const alDesplazar = () => { if (!cuadro) cuadro = requestAnimationFrame(medir); };
    contenedor.addEventListener('scroll', alDesplazar, { passive: true });
    return () => { contenedor.removeEventListener('scroll', alDesplazar); cancelAnimationFrame(cuadro); };
  }, []);

  const textos = [
    { titulo: 'Busca como hablas', texto: `Escribe en inglés lo que necesitas. El motor mezcla BM25 con embeddings MiniLM, así que "${CONSULTA}" también encuentra audífonos que no usan esas palabras exactas.` },
    { titulo: 'Recomendaciones que se explican', texto: 'Cada sugerencia muestra cuánto pesaron la imagen, la descripción, los atributos y las compras de otros clientes.' },
    { titulo: 'Retira cerca de ti', texto: `Las sucursales más cercanas a ${ubicacion.name}, ordenadas por distancia con un índice R-Tree.` },
    { titulo: 'Busca con una foto', texto: 'Sube una imagen y el motor calcula su vector con ResNet-50 para encontrar los productos más parecidos del catálogo.', accion: true },
  ];
  const datosActuales = datos?.ciudad === ubicacion.name ? datos : null;

  return <section className="shop-tour" ref={seccion} aria-label="Cómo funciona Tecno Store">
    <div className="shop-tour-steps">
      {textos.map((t, i) => <article key={t.titulo} ref={el => { pasos.current[i] = el; }} data-paso={i} className={`shop-tour-step ${paso === i ? 'is-active' : ''}`}>
        <h2>{t.titulo}</h2>
        <p>{t.texto}</p>
        {t.accion && <button className="shop-primary" onClick={onPhoto}><Camera size={16} aria-hidden="true" /> Probar con una foto</button>}
        <div className="shop-tour-inline"><Laptop><Pantalla paso={i} datos={datosActuales} ciudad={ubicacion.name} /></Laptop></div>
      </article>)}
    </div>
    <div className="shop-tour-stage">
      <div className="shop-tour-sticky">
        <Laptop><Pantalla paso={paso} datos={datosActuales} ciudad={ubicacion.name} /></Laptop>
        <div className="shop-tour-dots" aria-hidden="true">{textos.map((t, i) => <span key={t.titulo} className={paso === i ? 'is-active' : ''} />)}</div>
      </div>
    </div>
  </section>;
}
