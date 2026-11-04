export type Severity = "high" | "medium" | "low";

export type Flag = {
  severity: Severity;
  title: string;
  detail: string;
  // "rule" = our own deterministic check, "ai" = spotted by the model.
  source: "rule" | "ai";
};

export type Category = "rental" | "car";

export function isCategory(value: unknown): value is Category {
  return value === "rental" || value === "car";
}

export type RentalFacts = {
  title: string | null;
  price: number | null;
  currency: string | null;
  deposit: number | null;
  address: string | null;
  city: string | null;
  sizeM2: number | null;
  rooms: number | null;
  billsIncluded: string[];
  availableFrom: string | null;
  contact: string | null;
  platform: string | null;
};

export type CarFacts = {
  title: string | null;
  price: number | null;
  currency: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  regNumber: string | null;
  fuel: string | null;
  gearbox: string | null;
  location: string | null;
  seller: string | null;
  platform: string | null;
};

export type Verdict = "looks-ok" | "check-carefully" | "high-risk";

type AnalysisBase = {
  flags: Flag[];
  score: number;
  verdict: Verdict;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  analyzedAt: string;
};

export type Analysis = AnalysisBase & ({ category: "rental"; facts: RentalFacts } | { category: "car"; facts: CarFacts });
