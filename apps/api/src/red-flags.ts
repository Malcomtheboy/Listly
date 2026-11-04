import type { CarFacts, Category, Flag, RentalFacts, Verdict } from "./types.js";

// Our own deterministic checks. These run on every listing regardless of what
// the AI says, so the well-known scam patterns are never missed because the
// model had an off day. Patterns cover Norwegian and English listings.
type Rule = {
  severity: Flag["severity"];
  title: string;
  detail: string;
  patterns: RegExp[];
};

// Tricks that show up whatever is being sold.
const SHARED_RULES: Rule[] = [
  {
    severity: "high",
    title: "Uvanlig betalingsmåte",
    detail: "Western Union, MoneyGram, gavekort og krypto er nesten bare brukt av svindlere. Pengene kan ikke hentes tilbake.",
    patterns: [/western\s*union/, /moneygram/, /gavekort/, /gift\s*card/, /bitcoin|krypto|crypto/],
  },
  {
    severity: "medium",
    title: "Kun kontakt via e-post eller WhatsApp",
    detail: "Svindlere unngår telefon og møter. Be om å ringe og å møte selgeren.",
    patterns: [/kun\s+(på\s+)?(e-?post|mail|whatsapp)/, /only\s+(by\s+|via\s+)?(e-?mail|whatsapp)/],
  },
  {
    severity: "medium",
    title: "Kunstig hastverk",
    detail: "Press om å bestemme seg raskt er en vanlig taktikk for å hindre at du sjekker ting.",
    patterns: [/\bhaster\b/, /mange\s+interesserte/, /først\s+til\s+mølla/, /first\s+come/, /\burgent\b/],
  },
];

const RENTAL_RULES: Rule[] = [
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
];

const CAR_RULES: Rule[] = [
  {
    severity: "high",
    title: "Bilen eller selgeren er «i utlandet»",
    detail: "En bil du ikke kan se, som skal «sendes» til deg, finnes ofte ikke. Kjøp bare bil du har sett og prøvekjørt.",
    patterns: [/i\s+utlandet/, /\babroad\b/, /out\s+of\s+the\s+country/, /står\s+i\s+(sverige|tyskland|spania|polen|danmark|england|uk)/],
  },
  {
    severity: "high",
    title: "Betaling via fraktfirma eller «deponering»",
    detail: "Svindlere ber deg betale til et «fraktfirma» eller en falsk deponeringstjeneste som skal holde pengene. Det er svindlerens egen konto.",
    patterns: [/fraktfirma|transportfirma|shipping\s+company|escrow|deponerings?tjeneste/],
  },
  {
    severity: "high",
    title: "Forskudd for å reservere bilen",
    detail: "Betal aldri for å «holde av» en bil du ikke har sett. Ekte selgere venter til du har prøvekjørt.",
    patterns: [
      /(forskudd\w*|betal\w*|depositum)[^.]{0,40}(reserv\w*|holde\s+av)/,
      /(reserv\w*|holde\s+av)[^.]{0,40}(forskudd\w*|betal\w*|depositum)/,
      /deposit[^.]{0,30}(reserve|hold)/,
    ],
  },
  {
    severity: "medium",
    title: "Ingen prøvekjøring",
    detail: "Insister på å se og prøvekjøre bilen. En selger som nekter har ofte noe å skjule.",
    patterns: [/ingen\s+prøvekjør\w*/, /ikke\s+(mulig\s+(å\s+)?)?prøvekjør\w*/, /no\s+test\s*drives?/],
  },
];

const RULES: Record<Category, Rule[]> = {
  rental: [...SHARED_RULES, ...RENTAL_RULES],
  car: [...SHARED_RULES, ...CAR_RULES],
};

function matchRules(rules: Rule[], text: string): Flag[] {
  const haystack = text.toLowerCase();
  return rules
    .filter((rule) => rule.patterns.some((p) => p.test(haystack)))
    .map((rule) => ({ severity: rule.severity, title: rule.title, detail: rule.detail, source: "rule" }));
}

export function ruleFlags(text: string, category: "rental", facts: RentalFacts): Flag[];
export function ruleFlags(text: string, category: "car", facts: CarFacts): Flag[];
export function ruleFlags(text: string, category: Category, facts: RentalFacts | CarFacts): Flag[] {
  const flags = matchRules(RULES[category], text);
  if (category === "car") {
    const car = facts as CarFacts;
    if (car.price === null) flags.push(missing("Pris mangler", "Annonsen oppgir ikke prisen."));
    if (car.regNumber === null)
      flags.push(missing("Registreringsnummer mangler", "Be om regnr. og sjekk at modell og årgang stemmer hos Statens vegvesen."));
    if (car.mileageKm === null) flags.push(missing("Kilometerstand mangler", "Spør om kilometerstand og service-historikk."));
    if (car.year === null) flags.push(missing("Årsmodell mangler", "Spør hvilket år bilen er registrert første gang."));
    return flags;
  }

  const rental = facts as RentalFacts;
  // Norwegian law caps the deposit at six months' rent (husleieloven § 3-5).
  if (rental.currency === "NOK" && rental.price && rental.deposit && rental.deposit > rental.price * 6) {
    flags.push({
      severity: "medium",
      title: "Depositum over lovlig maks",
      detail: "Depositum kan maks være 6 måneders husleie i Norge.",
      source: "rule",
    });
  }
  if (rental.price === null) flags.push(missing("Pris mangler", "Annonsen oppgir ikke månedsleie."));
  if (rental.address === null) flags.push(missing("Adresse mangler", "Uten adresse kan du ikke sjekke at boligen finnes."));
  if (rental.deposit === null) flags.push(missing("Depositum ikke oppgitt", "Spør hvor stort depositumet er før du går videre."));
  return flags;
}

function missing(title: string, detail: string): Flag {
  return { severity: "low", title, detail, source: "rule" };
}

// Used when the app did not say what kind of listing this is (e.g. it came in
// through the share sheet). The URL is the strongest hint; otherwise count words.
const CAR_URL = /finn\.no\/(mobility|car|bil)|bilbasen|autotrader|bytbil|blocket\.se\/.*bil/;
const RENTAL_URL = /finn\.no\/realestate|hybel\.no|rightmove|spareroom|zoopla|openrent|qasa/;
// Word boundaries written out by hand: \b treats æ/ø/å as non-letters.
const word = (alternatives: string) => new RegExp(`(?<![a-zæøå])(${alternatives})(?![a-zæøå])`, "g");
const CAR_WORDS = word(
  "km|kilometerstand|regnr|registreringsnummer|eu-kontroll|girkasse|automatgir|manuell|diesel|bensin|hybrid|elbil|årsmodell|hestekrefter|hk|mileage|gearbox",
);
const RENTAL_WORDS = word("husleie|depositum|leie|utleie|hybel|leilighet|soverom|kollektiv|innflytting|rent|bedroom|tenancy|landlord|flat");

export function detectCategory(text: string, url?: string | null): Category {
  const u = (url ?? "").toLowerCase();
  if (CAR_URL.test(u)) return "car";
  if (RENTAL_URL.test(u)) return "rental";
  const lower = text.toLowerCase();
  const car = lower.match(CAR_WORDS)?.length ?? 0;
  const rental = lower.match(RENTAL_WORDS)?.length ?? 0;
  return car > rental ? "car" : "rental";
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
