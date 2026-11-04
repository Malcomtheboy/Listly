export type Severity = "high" | "medium" | "low";

export type Flag = {
  severity: Severity;
  title: string;
  detail: string;
  // "rule" = our own deterministic check, "ai" = spotted by the model.
  source: "rule" | "ai";
};

export type ListingFacts = {
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

export type Verdict = "looks-ok" | "check-carefully" | "high-risk";

export type Analysis = {
  facts: ListingFacts;
  flags: Flag[];
  score: number;
  verdict: Verdict;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  analyzedAt: string;
};
