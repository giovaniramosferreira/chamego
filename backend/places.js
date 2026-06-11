const KEY = () => process.env.GOOGLE_MAPS_API_KEY;
const BASE = 'https://places.googleapis.com/v1';
const FIELDS = 'places.displayName,places.rating,places.priceLevel,places.googleMapsUri,places.photos,places.formattedAddress';

async function searchText(textQuery) {
  try {
    const res = await fetch(`${BASE}/places:searchText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', maxResultCount: 3 }),
    });
    if (!res.ok) { console.error('Places error', res.status, await res.text()); return []; }
    return (await res.json()).places || [];
  } catch (e) { console.error('Places network', e.message); return []; }
}

const PRECO = {
  PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

const toCard = (p, categoria) => ({
  categoria,
  nome: p.displayName?.text || '',
  nota: p.rating ?? null,
  preco: PRECO[p.priceLevel] || '',
  endereco: p.formattedAddress || '',
  mapsUrl: p.googleMapsUri || '',
  fotoUrl: p.photos?.[0]?.name ? `/api/places/photo?name=${encodeURIComponent(p.photos[0].name)}` : '',
});

export async function buildRoteiro({ cidade, bairro }) {
  const loc = `${bairro}, ${cidade}`;
  const [cafes, passeios, restaurantes, bares] = await Promise.all([
    searchText(`café charmoso para casal em ${loc}`),
    searchText(`parque ou passeio romântico em ${loc}`),
    searchText(`restaurante romântico jantar em ${loc}`),
    searchText(`bar aconchegante para casal em ${loc}`),
  ]);
  return {
    dia: [...cafes.map(p => toCard(p, 'Café da manhã')), ...passeios.map(p => toCard(p, 'Passeio'))].slice(0, 4),
    noite: [...restaurantes.map(p => toCard(p, 'Jantar')), ...bares.map(p => toCard(p, 'Drinks'))].slice(0, 4),
  };
}

export async function autocomplete(input) {
  if (!input || input.length < 2) return [];
  try {
    const res = await fetch(`${BASE}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY() },
      body: JSON.stringify({ input, languageCode: 'pt-BR', includedRegionCodes: ['br'] }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.suggestions || []).map(s => s.placePrediction?.text?.text).filter(Boolean);
  } catch { return []; }
}

export async function photoStream(name, maxWidth = 900) {
  return fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${KEY()}`);
}
