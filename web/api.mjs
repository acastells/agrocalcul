/** Call the same-origin API. The custom header is part of the CSRF boundary. */
export async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-agro-request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Connexió no disponible.');
  }
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'No s’ha pogut desar.'), {
      status: response.status,
    });
  return data;
}
