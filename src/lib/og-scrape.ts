// Server-only: fetch an URL and extract its Open Graph metadata.
// Light implementation (regex on <meta>) — no extra dependency.
// Many sites (Airbnb, Booking, etc.) expose decent og:* tags.

export type OgMeta = {
  title: string | null;
  image: string | null;
  description: string | null;
};

const UA =
  "Mozilla/5.0 (compatible; the-trip/1.0; +https://github.com/LeenVandelied/the-trip)";

export async function scrapeOg(url: string): Promise<OgMeta> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "fr,en;q=0.7",
      },
      redirect: "follow",
      // Allow up to 8s, otherwise we give up — the lodging entry still gets saved.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: null, image: null, description: null };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return { title: null, image: null, description: null };
    // Read at most 256KB — OG tags live in <head>, no need to slurp megabytes.
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      buf.byteLength > 256 * 1024 ? buf.slice(0, 256 * 1024) : buf,
    );
    return {
      title: pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html),
      image: pickMeta(html, ["og:image", "twitter:image", "twitter:image:src"]),
      description: pickMeta(html, ["og:description", "twitter:description", "description"]),
    };
  } catch {
    return { title: null, image: null, description: null };
  }
}

function pickMeta(html: string, propsOrNames: string[]): string | null {
  for (const key of propsOrNames) {
    const m =
      // <meta property="og:title" content="...">
      html.match(
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${escapeReg(key)}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
      ) ??
      // <meta content="..." property="og:title">
      html.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeReg(key)}["']`,
          "i",
        ),
      );
    if (m && m[1]) return decodeEntities(m[1]).trim();
  }
  return null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : null;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
