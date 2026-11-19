

export async function uploadMediaApi(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content_base64: base64Data,
            content_type: file.type
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Fallo en la subida del archivo');
        }
        const data = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export class SinConexionError extends Error {
  constructor() {
    super('No se pudo conectar con el motor de la tienda. Verifica que el backend esté corriendo en el puerto 8000.');
    this.name = 'SinConexionError';
  }
}

async function ecommerceRequest(path, { signal, body } = {}) {
  let response;
  try {
    response = await fetch(`/api/ecommerce${path}`, {
      signal,
      ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new SinConexionError();
  }
  const data = await response.json().catch(() => null);
  if (data === null) throw new SinConexionError();
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join('. ') : data.detail;
    throw new Error(detail || 'No se pudo completar la solicitud');
  }
  return data;
}


async function engineRequest(path, body) {
  let response;
  try {
    response = await fetch(`/motor${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new SinConexionError();
  }
  const data = await response.json().catch(() => null);
  if (data === null) throw new SinConexionError();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'El motor rechazó la solicitud');
  return data;
}

const leerBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('No se pudo leer la foto'));
  reader.readAsDataURL(file);
});

export const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
const RUTA_SUBIDA = /^uploads\/[0-9a-f]{32}_foto\.(jpg|jpeg|png|webp|bmp)$/;

export async function uploadSearchPhoto(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const data = await engineRequest('/api/media/upload', {
    filename: `foto${extension}`, content_base64: await leerBase64(file), content_type: file.type,
  });
  if (!RUTA_SUBIDA.test(data.path || '')) throw new Error('El motor devolvió una ruta de archivo inesperada');
  return data.path;
}

const TABLA_VISUAL = { HNSW: 'ecommerce_imagenes_hnsw', IVF: 'ecommerce_imagenes_ivf', EXACT: 'ecommerce_imagenes_hnsw' };

export async function searchSimilarPhoto(path, { k = 12, metodo = 'HNSW' } = {}) {
  if (!RUTA_SUBIDA.test(path) || !TABLA_VISUAL[metodo]) throw new Error('Parámetros de búsqueda inválidos');
  const sql = `SELECT id, SIMILARITY_SCORE() AS score FROM ${TABLA_VISUAL[metodo]} `
    + `WHERE SIMILAR_TO('${path}', k=${Number(k)}) USING ${metodo} WITH METRIC=cosine`;
  const data = await engineRequest('/api/query', { query: sql });
  if (data.status !== 'success') throw new Error(data.error || 'La búsqueda por foto falló');
  return data;
}

const RUTA_CATALOGO = /^bench\/data\/amazon_img\/imgs\/[A-Za-z0-9]+\.jpg$/;

export async function searchSimilarToCatalogPhoto(ruta, k = 4) {
  if (!RUTA_CATALOGO.test(ruta)) throw new Error('Foto del catálogo inválida');
  const sql = `SELECT id, SIMILARITY_SCORE() AS score FROM ecommerce_imagenes_hnsw WHERE SIMILAR_TO('${ruta}', k=${Number(k)}) USING HNSW WITH METRIC=cosine`;
  const data = await engineRequest('/api/query', { query: sql });
  if (data.status !== 'success') throw new Error(data.error || 'La búsqueda por foto falló');
  return data;
}

export const fetchEcommerceStatus = signal => ecommerceRequest('/status', { signal });
export const fetchEcommerceCatalog = (params, signal) => ecommerceRequest(`/catalog?${new URLSearchParams(params)}`, { signal });
export const fetchEcommerceProduct = (id, signal) => ecommerceRequest(`/products/${id}`, { signal });
export const fetchEcommerceRecommendations = (body, signal) => ecommerceRequest('/recommend', { body, signal });
export const fetchEcommerceBestSellers = (params, signal) => ecommerceRequest(`/best-sellers?${new URLSearchParams(params)}`, { signal });
export const fetchEcommerceProductStores = (id, [lat, lon], signal) => ecommerceRequest(`/products/${id}/stores?${new URLSearchParams({ lat, lon })}`, { signal });
export const fetchEcommerceStores = signal => ecommerceRequest('/stores', { signal });
export const fetchEcommerceNearbyStores = ([lat, lon], k, signal) => ecommerceRequest(`/stores/nearby?${new URLSearchParams({ lat, lon, k })}`, { signal });
export const recordEcommerceInteraction = body => ecommerceRequest('/interactions', { body });
export const purchaseEcommerceCart = body => ecommerceRequest('/purchases', { body });
