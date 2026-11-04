// Mirrors apps/api/src/types.ts — keep the two in sync.
export type Severity = 'high' | 'medium' | 'low';

export type Flag = {
  severity: Severity;
  title: string;
  detail: string;
  source: 'rule' | 'ai';
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

export type Verdict = 'looks-ok' | 'check-carefully' | 'high-risk';

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

export type SavedAnalysis = Analysis & { id: string };

export type ListingInput = { url?: string; text?: string; image?: { base64: string; mimeType: string } };
