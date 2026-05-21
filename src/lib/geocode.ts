// Server-side geocoding via Nominatim (OpenStreetMap).
// Free, no key, fair-use: 1 req/s max, requires a UA. Cache 24h.

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
} | null;

const UA = "the-trip/1.0 (https://github.com/LeenVandelied/the-trip)";

export async function geocode(addressText: string): Promise<GeocodeResult> {
  const q = addressText.trim();
  if (!q) return null;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 }, // 24h
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const first = arr[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: first.display_name };
  } catch {
    return null;
  }
}
