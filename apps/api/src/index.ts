import dns from "node:dns";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { AiUnavailableError, extractListing, isGeminiConfigured } from "./extract.js";
import { fetchListing, UserError } from "./fetch-listing.js";
import { detectCategory, ruleFlags, scoreFlags } from "./red-flags.js";
import { isCategory, type Analysis, type Flag } from "./types.js";

dns.setDefaultResultOrder("ipv4first");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;

app.use(helmet());
app.use(cors());
// Screenshots arrive as base64, so allow a few MB.
app.use(express.json({ limit: "8mb" }));

// Every analysis costs an AI call. Until there is sign-in (see README), this is
// the only thing stopping one client from burning the whole quota.
app.use(
  "/api/analyze",
  rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: isGeminiConfigured() });
});

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

app.post("/api/analyze", async (req, res) => {
  const { url, text, image, category: requested } = (req.body ?? {}) as {
    url?: unknown;
    text?: unknown;
    image?: { base64?: unknown; mimeType?: unknown };
    category?: unknown;
  };

  try {
    let listingText = typeof text === "string" ? text.trim().slice(0, 15_000) : "";
    let imageUrl: string | null = null;
    let sourceUrl: string | null = null;

    // A bare link pasted into the text box counts as a URL.
    const link = typeof url === "string" && url.trim() ? url.trim() : /^https?:\/\/\S+$/.test(listingText) ? listingText : null;
    if (link) {
      const page = await fetchListing(link);
      listingText = page.text;
      imageUrl = page.imageUrl;
      sourceUrl = page.finalUrl;
    }

    const imageInput =
      image && typeof image.base64 === "string" && typeof image.mimeType === "string" && IMAGE_TYPES.has(image.mimeType)
        ? { base64: image.base64, mimeType: image.mimeType }
        : undefined;

    if (!listingText && !imageInput) {
      res.status(400).json({ error: "Lim inn en lenke, tekst eller et skjermbilde av annonsen." });
      return;
    }
    if (listingText && listingText.length < 40 && !imageInput) {
      res.status(400).json({ error: "Det er for lite tekst til å vurdere. Lim inn hele annonsen." });
      return;
    }

    // The app sends the category the user picked; the share sheet sends none, so guess.
    const category = isCategory(requested) ? requested : detectCategory(listingText, sourceUrl ?? link);
    const extraction = await extractListing({ text: listingText || undefined, image: imageInput }, category);
    const rules: Flag[] =
      extraction.category === "car"
        ? ruleFlags(listingText, "car", extraction.facts)
        : ruleFlags(listingText, "rental", extraction.facts);
    const flags = [...rules, ...extraction.flags];
    const { score, verdict } = scoreFlags(flags);

    const analysis: Analysis = {
      ...(extraction.category === "car"
        ? { category: "car" as const, facts: extraction.facts }
        : { category: "rental" as const, facts: extraction.facts }),
      flags,
      score,
      verdict,
      summary: extraction.summary,
      imageUrl,
      sourceUrl,
      analyzedAt: new Date().toISOString(),
    };
    res.json(analysis);
  } catch (error) {
    if (error instanceof UserError) {
      res.status(422).json({ error: error.message });
      return;
    }
    if (error instanceof AiUnavailableError) {
      console.warn("analyze: AI unavailable", error.cause);
      res.status(503).json({ error: "AI-tjenesten er overbelastet akkurat nå. Prøv igjen om et minutt." });
      return;
    }
    console.error("analyze failed", error);
    res.status(502).json({ error: "Analysen feilet. Prøv igjen om litt." });
  }
});

app.listen(PORT, () => {
  console.log(`Listly API on http://localhost:${PORT} (AI ${isGeminiConfigured() ? "on" : "OFF: set GEMINI_API_KEY"})`);
});
