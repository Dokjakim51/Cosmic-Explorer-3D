export async function loadJson(path, { signal } = {}) {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}
