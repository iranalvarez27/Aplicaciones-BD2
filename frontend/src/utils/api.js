

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

async function ecommerceRequest(path, { signal, body } = {}) {
  const response = await fetch(`/api/ecommerce${path}`, {
    signal,
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join('. ') : data.detail;
    throw new Error(detail || 'No se pudo completar la solicitud');
  }
  return data;
}

export const fetchEcommerceStatus = signal => ecommerceRequest('/status', { signal });
export const fetchEcommerceCatalog = (params, signal) => ecommerceRequest(`/catalog?${new URLSearchParams(params)}`, { signal });
export const fetchEcommerceProduct = (id, signal) => ecommerceRequest(`/products/${id}`, { signal });
export const fetchEcommerceRecommendations = (body, signal) => ecommerceRequest('/recommend', { body, signal });
export const recordEcommerceInteraction = body => ecommerceRequest('/interactions', { body });
export const purchaseEcommerceCart = body => ecommerceRequest('/purchases', { body });
