/**
 * @typedef {Object} Capabilities
 * @property {string} role
 * @property {string[]} capabilities
 * @property {{id: string, name: string}=} activeGym
 */

/** @param {string} path @param {RequestInit=} options */
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || data.message || 'Request failed');
    Object.assign(error, { status: response.status, code: data.code, details: data.details });
    throw error;
  }
  return data;
}

/** @returns {Promise<Capabilities>} */
export function getCapabilities() {
  return apiFetch('/api/me/capabilities', { cache: 'no-store' });
}
