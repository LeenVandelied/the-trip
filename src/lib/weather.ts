// Open-Meteo daily forecast — free, no key.

type Daily = {
  weather_code?: number;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
};

const EMOJI: Array<[number[], string]> = [
  [[0], "☀️"],
  [[1, 2, 3], "🌤️"],
  [[45, 48], "🌫️"],
  [[51, 53, 55, 56, 57], "🌦️"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️"],
  [[71, 73, 75, 77, 85, 86], "❄️"],
  [[95, 96, 99], "⛈️"],
];

export function weatherEmoji(code: number | undefined | null): string {
  if (code == null) return "—";
  for (const [codes, e] of EMOJI) if (codes.includes(code)) return e;
  return "—";
}

export async function fetchDailyWeather(
  lat: number,
  lng: number,
  isoDate: string,
): Promise<Daily | null> {
  // Open-Meteo forecast accepts dates up to 14 days out + 80 days of historical.
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", isoDate);
  url.searchParams.set("end_date", isoDate);
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } }); // 6h cache
    if (!res.ok) return null;
    const j = (await res.json()) as { daily?: { weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] } };
    const d = j.daily;
    if (!d || !d.weather_code?.[0]) return null;
    return {
      weather_code: d.weather_code[0],
      temperature_2m_max: d.temperature_2m_max?.[0],
      temperature_2m_min: d.temperature_2m_min?.[0],
    };
  } catch {
    return null;
  }
}
