import { useEffect, useState } from 'react';
import { uploadSearchPhoto, searchSimilarPhoto, fetchEcommerceProduct } from '../../utils/api';
import ProductCard from './ProductCard';

const METODOS = [['HNSW', 'HNSW (grafo)'], ['IVF', 'IVF (clusters)'], ['EXACT', 'Exacto (todas las fotos)']];

const pasosDelPlan = nodo => nodo ? [nodo.method || nodo.node_type, ...(nodo.children || []).flatMap(pasosDelPlan)].filter(Boolean) : [];

const subidas = new WeakMap();
const subirUnaVez = file => {
  if (!subidas.has(file)) subidas.set(file, uploadSearchPhoto(file));
  return subidas.get(file);
};

export default function PhotoSearch({ foto, onSelect, onUseSQL, onError }) {
  const [subida, setSubida] = useState(null);
  const [metodo, setMetodo] = useState('HNSW');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let vigente = true;
    subirUnaVez(foto.file).then(path => { if (vigente) setSubida({ file: foto.file, path }); })
      .catch(e => { if (vigente) { setSubida({ file: foto.file, error: e.message }); onError(e.message); } });
    return () => { vigente = false; };
  }, [foto.file, onError]);

  const path = subida?.file === foto.file ? subida.path : null;

  useEffect(() => {
    if (!path) return;
    let vigente = true;
    const inicio = performance.now();
    searchSimilarPhoto(path, { metodo }).then(async data => {
      const filas = data.rows.map(([id, score]) => ({ id, score }));
      const productos = await Promise.all(filas.map(f => fetchEcommerceProduct(f.id)));
      if (vigente) setResultado({ path, metodo, data, productos: productos.map((p, i) => ({ ...p, similitud: filas[i].score })), ms: performance.now() - inicio });
    }).catch(e => { if (vigente) { setResultado({ path, metodo, error: e.message }); onError(e.message); } });
    return () => { vigente = false; };
  }, [path, metodo, onError]);

  const actual = resultado?.path === path && resultado?.metodo === metodo ? resultado : null;
  const vector = actual?.data?.vector;
  const fallo = (subida?.file === foto.file && subida.error) || actual?.error;
  const estado = fallo ? null : !path ? 'Subiendo la foto al motor…' : !actual ? 'Calculando el embedding de tu foto y buscando en el índice…' : null;

  return <>
    <section className="shop-photo-head">
      <img src={foto.preview} alt="Tu foto" />
      <div>
        <h1>Productos parecidos a tu foto</h1>
        <p className="shop-muted">El motor calcula el vector de tu foto con ResNet-50 y busca las fotos más cercanas del catálogo.</p>
        <label className="shop-photo-method">Índice
          <select value={metodo} onChange={e => setMetodo(e.target.value)} disabled={!path}>{METODOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        {vector && <p className="shop-photo-stats">
          Vector de {vector.extraccion.dimension_vector} dimensiones en {vector.extraccion.tiempo_extraccion_ms.toFixed(0)} ms
          · búsqueda en {vector.metricas.tiempo_busqueda_ms.toFixed(1)} ms sobre {vector.metricas.vectores_indexados.toLocaleString('es')} fotos
          · índice {vector.indice_usado}
        </p>}
      </div>
    </section>
    {estado && <p className="shop-empty" role="status">{estado}</p>}
    {fallo && <p className="shop-empty">No se pudo buscar con esta foto. Prueba con otra imagen JPG, PNG o WEBP.</p>}
    {actual?.productos && <>
      <div className="shop-section-title"><h2>{actual.productos.length} resultados</h2><span>Ordenados por similitud de coseno</span></div>
      <div className="shop-grid">{actual.productos.map(p => <ProductCard key={p.id} producto={p} onSelect={onSelect} />)}</div>
      <details className="shop-traces">
        <summary>Consulta y plan de ejecución · {actual.data.execution_time_ms.toFixed(1)} ms en el motor</summary>
        <article><pre>{actual.data.query}</pre><p>{pasosDelPlan(actual.data.plan).join(' → ')}</p>
          <span>{vector?.metricas.distancias_calculadas} distancias calculadas</span>
          <button className="shop-button" onClick={() => onUseSQL(actual.data.query)}>Copiar SQL</button></article>
      </details>
    </>}
  </>;
}
