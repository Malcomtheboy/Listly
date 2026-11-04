import dns from "node:dns/promises";
import net from "node:net";

// Fetches one listing page the user explicitly shared with us. This is a single
// user-initiated request (like opening the link in a browser), not crawling.
// Because the URL comes from the user, guard against it pointing at our own
// network (SSRF): only public http(s) hosts, re-checked on every redirect.

const MAX_BYTES = 1_500_000;
const MAX_TEXT = 15_000;
const TIMEOUT_MS = 8_000;

export type FetchedListing = { text: string; imageUrl: string | null; finalUrl: string };

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UserError("Det ser ikke ut som en gyldig lenke.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UserError("Bare http- og https-lenker støttes.");
  }
  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => []);
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new UserError("Fant ikke nettsiden.");
  }
  return url;
}

export class UserError extends Error {}

export async function fetchListing(raw: string): Promise<FetchedListing> {
  let url = await assertPublicUrl(raw);
  let response: Response | null = null;

  for (let hop = 0; hop < 4; hop++) {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (Listly listing check)", Accept: "text/html" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new UserError("Nettsiden ville ikke vise annonsen. Prøv å lime inn teksten eller ta et skjermbilde.");
  }

  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const html = Buffer.concat(chunks).toString("utf8");
  return { ...htmlToListingText(html), finalUrl: url.toString() };
}

function meta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, "i");
  return html.match(re)?.[1] ?? html.match(reversed)?.[1] ?? null;
}

export function htmlToListingText(html: string): { text: string; imageUrl: string | null } {
  const title = meta(html, "og:title");
  const description = meta(html, "og:description");
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
  const text = [title, description, body].filter(Boolean).join("\n").slice(0, MAX_TEXT);
  return { text, imageUrl: meta(html, "og:image") };
}
