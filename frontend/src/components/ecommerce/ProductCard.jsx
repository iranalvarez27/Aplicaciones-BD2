export const money = (centavos, moneda = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: moneda || 'USD',
}).format(centavos / 100);

const LABELS = { visual: 'Imagen', texto: 'Descripción', metadata: 'Atributos', compras: 'Compras' };

export default function ProductCard({ producto, onSelect, puesto }) {
  const aportes = Object.entries(producto.aportes_pct || {}).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const resumenAportes = aportes.map(([m, v]) => `${LABELS[m]} ${v.toFixed(0)}%`).join(' · ');
  return <button className="shop-card" onClick={() => onSelect(producto.id)}>
    <div className="shop-card-image">
      {puesto && <span className="shop-rank" aria-label={`Puesto ${puesto}`}>{puesto}</span>}
      <img src={producto.media_url} alt={producto.nombre} loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
    </div>
    <span className="shop-category">{producto.subcategoria || producto.categoria}</span>
    <span className="shop-card-title">{producto.nombre}</span>
    <strong className="shop-price">{money(producto.precio_centavos, producto.moneda)}</strong>
    {producto.similitud != null && <span className="shop-similarity">Parecido {Math.round(producto.similitud * 100)}%</span>}
    {producto.compradores != null &&<span className="shop-buyers">{producto.compradores.toLocaleString('es')} compradores</span>}
    {aportes.length > 0 && <>
      <span className="shop-contributions" title={resumenAportes} aria-label={resumenAportes}>
        {aportes.map(([m, v]) => <span key={m} className={`shop-signal-${m}`} style={{ width: `${v}%` }} />)}
      </span>
      <span className="shop-reason" title={resumenAportes}>{aportes.slice(0, 2).map(([m, v]) => `${LABELS[m]} ${v.toFixed(0)}%`).join(' + ')}</span>
    </>}
  </button>;
}
