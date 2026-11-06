import Constants from 'expo-constants';
import type { Analysis, ListingInput } from './types';

// In development the API runs on the same machine as the Expo dev server, so
// reuse its host (works on a phone on the same Wi-Fi).
function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
      ?.expoClient?.hostUri;

  const host = hostUri?.split(':')[0];
  if (host && host !== '') return `http://${host}:3100`;

  return 'http://localhost:3100';
}

const API_URL = resolveApiUrl();

export async function analyzeListing(input: ListingInput): Promise<Analysis> {
  if (!__DEV__ && !API_URL.startsWith('https://')) {
    throw new Error('En sikker tilkobling til serveren er ikke satt opp.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      // The server gives up on the AI after two ~12 s attempts; never spin longer than that.
      signal: AbortSignal.timeout(35_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error('Det tok for lang tid å få svar. Prøv igjen om litt.');
    }
    throw new Error('Fikk ikke kontakt med serveren. Sjekk nettet og prøv igjen.');
  }

  const body = (await response.json().catch(() => null)) as (Analysis & { error?: string }) | null;
  if (!response.ok || !body) {
    if (response.status === 429) throw new Error('Du har sjekket mange annonser på kort tid. Vent et minutt.');
    throw new Error(body?.error ?? 'Analysen feilet. Prøv igjen om litt.');
  }
  return body;
}
