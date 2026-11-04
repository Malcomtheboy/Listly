import type { Flag, ListingFacts, Verdict } from "./types.js";

// Our own deterministic checks. These run on every listing regardless of what
// the AI says, so the well-known scam patterns are never missed because the
// model had an off day. Patterns cover Norwegian and English listings.
type Rule = {
  severity: Flag["severity"];
  title: string;
  detail: string;
  patterns: RegExp[];
};

const RULES: Rule[] = [
  {
    severity: "high",
    title: "Uvanlig betalingsmåte",
    detail: "Western Union, MoneyGram, gavekort og krypto er nesten bare brukt av svindlere. Pengene kan ikke hentes tilbake.",
    patterns: [/western\s*union/, /moneygram/, /gavekort/, /gift\s*card/, /bitcoin|krypto|crypto/],
  },
  {
    severity: "high",
    title: "Betaling før visning",
    detail: "Betal aldri depositum eller husleie før du har sett boligen og skrevet kontrakt.",
    patterns: [
      /(depositum|husleie|betal\w*)[^.]{0,40}før\s+(visning|du\s+(ser|har\s+sett))/,
      /(deposit|pay\w*)[^.]{0,40}before\s+(the\s+)?viewing/,
      /ingen\s+visning|no\s+viewings?/,
    ],
  },
  {
    severity: "high",
    title: "Utleier er «i utlandet»",
    detail: "En utleier som ikke kan møte deg og vil sende nøklene i posten er et klassisk svindelmønster.",
    patterns: [/i\s+utlandet/, /\babroad\b/, /out\s+of\s+the\s+country/, /working\s+overseas/],
  },
  {
    severity: "high",
    title: "Nøkler sendes i posten",
    detail: "Ekte utleiere gir deg nøklene ved innflytting, ikke via post eller budtjeneste.",
    patterns: [/nøkl\w*[^.]{0,30}(post|sende|bud)/, /send\w*[^.]{0,20}nøkl/, /keys?[^.]{0,30}(by\s+post|courier|mail)/],
  },
  {
    severity: "high",
    title: "Betaling «via Airbnb» utenfor plattformen",
    detail: "Svindlere sender falske Airbnb-/Booking-lenker. Leieforhold betales aldri via Airbnb.",
    patterns: [/(via|through|gjennom)\s+(airbnb|booking\.com)/],
  },
  {
    severity: "medium",
    title: "Depositum til privat konto",
    detail: "I Norge skal depositum stå på en egen depositumskonto i leietakers navn (husleieloven § 3-5), ikke på utleiers konto.",
    // "min private konto", "privatkonto", "personlige konto"...
    patterns: [/depositum[^.]{0,60}(min|privat\w*|personlig\w*)\s*konto/, /(min|privat\w*|personlig\w*)\s*konto[^.]{0,60}depositum/],
  },
  {
    severity: "medium",
    title: "Kun kontakt via e-post eller WhatsApp",
    detail: "Svindlere unngår telefon og møter. Be om å ringe og å møte utleier.",
    patterns: [/kun\s+(på\s+)?(e-?post|mail|whatsapp)/, /only\s+(by\s+|via\s+)?(e-?mail|whatsapp)/],
  },
  {
    severity: "medium",
    title: "Kunstig hastverk",
    detail: "Press om å bestemme seg raskt er en vanlig taktikk for å hindre at du sjekker ting.",
    patterns: [/\bhaster\b/, /mange\s+interesserte/, /først\s+til\s+mølla/, /first\s+come/, /\burgent\b/],
  },
];

export function ruleFlags(text: string, facts: ListingFacts): Flag[] {
  const haystack = text.toLowerCase();
  const flags: Flag[] = RULES.filter((rule) => rule.patterns.some((p) => p.test(haystack))).map((rule) => ({
    severity: rule.severity,
    title: rule.title,
    detail: rule.detail,
    source: "rule",
  }));

  // Norwegian law caps the deposit at six months' rent (husleieloven § 3-5).
  if (facts.currency === "NOK" && facts.price && facts.deposit && facts.deposit > facts.price * 6) {
    flags.push({
      severity: "medium",
      title: "Depositum over lovlig maks",
      detail: "Depositum kan maks være 6 måneders husleie i Norge.",
      source: "rule",
    });
  }

  if (facts.price === null) flags.push(missing("Pris mangler", "Annonsen oppgir ikke månedsleie."));
  if (facts.address === null) flags.push(missing("Adresse mangler", "Uten adresse kan du ikke sjekke at boligen finnes."));
  if (facts.deposit === null) flags.push(missing("Depositum ikke oppgitt", "Spør hvor stort depositumet er før du går videre."));

  return flags;
}

function missing(title: string, detail: string): Flag {
  return { severity: "low", title, detail, source: "rule" };
}

const PENALTY: Record<Flag["severity"], number> = { high: 30, medium: 12, low: 5 };

export function scoreFlags(flags: Flag[]): { score: number; verdict: Verdict } {
  // The same problem can be caught by both a rule and the AI; count each title once.
  const seen = new Set<string>();
  let score = 100;
  for (const flag of flags) {
    const key = flag.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    score -= PENALTY[flag.severity];
  }
  score = Math.max(0, Math.min(100, score));
  const hasHigh = flags.some((f) => f.severity === "high");
  // Never present a listing with a high-severity signal as "looks ok", whatever the score.
  const verdict: Verdict = hasHigh || score < 50 ? "high-risk" : score < 75 ? "check-carefully" : "looks-ok";
  return { score, verdict };
}
