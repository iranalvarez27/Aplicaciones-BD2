import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair } from 'lucide-react';
import { fetchEcommerceStores, fetchEcommerceNearbyStores } from '../../utils/api';

const K_OPTIONS = [5, 10, 20];
const km = metros => `${(metros / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} km`;

function StoresMap({ tiendas, cercanas, punto, onPick }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const capaRef = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    const mapa = L.map(container.current).setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(mapa);
    tiendas.forEach(t => {
      const texto = document.createElement('span');
      texto.textContent = `${t.nombre} · ${t.ciudad}, ${t.estado}`;
      L.circleMarker(t.ubicacion, { radius: 3, weight: 0, fillColor: '#7a5cfa', fillOpacity: .45 }).addTo(mapa).bindTooltip(texto);
    });
    capaRef.current = L.layerGroup().addTo(mapa);
    mapa.on('click', e => onPickRef.current([Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4))]));
    mapRef.current = mapa;
    const observer = new ResizeObserver(() => mapa.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); mapa.stop(); mapa.remove(); };
  }, [tiendas]);

  useEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    capa.clearLayers();
    L.circleMarker(punto, { radius: 8, color: '#3157f6', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(capa).bindTooltip('Tu punto');
    cercanas.forEach((t, i) => {
      L.polyline([punto, t.ubicacion], { color: '#3157f6', weight: 1.5, opacity: .5, dashArray: '4 6' }).addTo(capa);
      const texto = document.createElement('span');
      texto.textContent = `${i + 1}. ${t.nombre} · ${km(t.dist_m)}`;
      L.circleMarker(t.ubicacion, { radius: 7, color: '#fff', weight: 2, fillColor: '#12b39a', fillOpacity: 1 }).addTo(capa).bindTooltip(texto);
    });
    if (cercanas.length) mapRef.current.fitBounds([punto, ...cercanas.map(t => t.ubicacion)], { padding: [40, 40], maxZoom: 12, animate: false });
  }, [cercanas, punto]);

  return <div ref={container} className="shop-map shop-map-large" aria-label="Mapa de las sucursales. Haz clic para elegir otro punto." />;
}

export default function StoresPage({ ubicacion, onUseSQL, onError }) {
  const [tiendas, setTiendas] = useState(null);
  const [cercanas, setCercanas] = useState(null);
  const [k, setK] = useState(5);
  const [puntoMapa, setPuntoMapa] = useState(null);
  const punto = puntoMapa || ubicacion.coords;

  useEffect(() => {
    const controller = new AbortController();
    fetchEcommerceStores(controller.signal).then(setTiendas)
      .catch(e => { if (e.name !== 'AbortError') onError(e.message); });
    return () => controller.abort();
  }, [onError]);

  useEffect(() => {
    const controller = new AbortController();
    fetchEcommerceNearbyStores(punto, k, controller.signal).then(data => setCercanas({ ...data, punto, k }))
      .catch(e => { if (e.name !== 'AbortError') onError(e.message); });
    return () => controller.abort();
  }, [punto, k, onError]);

  const listas = cercanas && cercanas.punto === punto && cercanas.k === k ? cercanas : null;
  const traza = listas?.trazas?.[0];

  return <>
    <div className="shop-listing-head">
      <div>
        <h1>Tiendas cerca de ti</h1>
        <p className="shop-muted">
          {puntoMapa ? `Punto elegido en el mapa (${punto[0]}, ${punto[1]})` : `Desde ${ubicacion.name}`}
          {tiendas && ` · ${tiendas.tiendas.length.toLocaleString('es')} sucursales en EE. UU.`}
        </p>
      </div>
      <div className="shop-stores-actions">
        <label>Mostrar
          <select value={k} onChange={e => setK(Number(e.target.value))}>{K_OPTIONS.map(v => <option key={v} value={v}>{v} tiendas</option>)}</select>
        </label>
        {puntoMapa && <button className="shop-button" onClick={() => setPuntoMapa(null)}><MapPin size={15} /> Volver a {ubicacion.name}</button>}
      </div>
    </div>
    <div className="shop-locator">
      <div className="shop-locator-map">
        {tiendas ? <StoresMap tiendas={tiendas.tiendas} cercanas={listas?.tiendas || []} punto={punto} onPick={setPuntoMapa} />
          : <p className="shop-empty" role="status">Cargando sucursales…</p>}
        <p className="shop-map-hint"><Crosshair size={14} aria-hidden="true" /> Haz clic en el mapa para buscar desde otro punto.</p>
      </div>
      <ol className="shop-near-list" aria-busy={!listas}>
        {listas?.tiendas.map(t => <li key={t.id}>
          <div><strong>{t.nombre}</strong><small>{t.ciudad}, {t.estado}</small></div>
          <span>{km(t.dist_m)}</span>
        </li>)}
        {!listas && <li className="shop-near-loading">Buscando las tiendas más cercanas…</li>}
      </ol>
    </div>
    {traza && <details className="shop-traces" open>
      <summary>Consulta espacial: k-NN sobre el índice R-Tree · {traza.tiempo_ms.toFixed(2)} ms</summary>
      <article><pre>{traza.sql}</pre><p>{traza.plan.join(' → ')}</p><button className="shop-button" onClick={() => onUseSQL(traza.sql)}>Copiar SQL</button></article>
    </details>}
  </>;
}
