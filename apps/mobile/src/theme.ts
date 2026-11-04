import { Platform, useColorScheme, type ViewStyle } from 'react-native';
import type { Severity, Verdict } from './services/types';

const light = {
  bg: '#F4F5FB',
  card: '#FFFFFF',
  cardAlt: '#F0F1F8',
  text: '#11142D',
  muted: '#6E7191',
  faint: '#A0A3BD',
  border: '#E6E7F0',
  input: '#F4F5FB',
  // Brand: a confident indigo-to-violet, kept apart from the verdict colours
  // so "brand" never reads as "good" or "bad".
  brand: '#4C3FE0',
  brandSoft: '#ECEAFE',
  brandGradient: ['#3B2FD1', '#6A4CF5', '#8B5CF6'] as readonly [string, string, string],
  onBrand: '#FFFFFF',
  high: '#E5484D',
  highBg: '#FFECEC',
  medium: '#D97706',
  mediumBg: '#FFF4E0',
  low: '#5B6380',
  lowBg: '#EEF0F6',
  ok: '#14946B',
  okBg: '#E2F6EE',
  shadow: '#1B1F5C',
};

const dark: typeof light = {
  bg: '#0B0C17',
  card: '#151729',
  cardAlt: '#1C1F35',
  text: '#F3F3FA',
  muted: '#9A9CB8',
  faint: '#5F6283',
  border: '#24273F',
  input: '#10121F',
  brand: '#8B7CFF',
  brandSoft: '#221F45',
  brandGradient: ['#2A1F9E', '#4B34D6', '#6D45E8'],
  onBrand: '#FFFFFF',
  high: '#FF6B70',
  highBg: '#3A1A20',
  medium: '#FBBF4C',
  mediumBg: '#3A2B12',
  low: '#A3A9C7',
  lowBg: '#22253A',
  ok: '#3DD9A0',
  okBg: '#12322A',
  shadow: '#000000',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function shadow(t: Theme, depth: 1 | 2 = 1): ViewStyle {
  const opacity = depth === 1 ? 0.06 : 0.14;
  const radius = depth === 1 ? 12 : 24;
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 ${depth * 4}px ${radius}px rgba(27,31,92,${opacity})` } as ViewStyle,
    android: { elevation: depth * 3 },
    default: { shadowColor: t.shadow, shadowOpacity: opacity, shadowRadius: radius / 2, shadowOffset: { width: 0, height: depth * 4 } },
  })!;
}

export function severityColors(t: Theme, s: Severity) {
  return s === 'high' ? { fg: t.high, bg: t.highBg } : s === 'medium' ? { fg: t.medium, bg: t.mediumBg } : { fg: t.low, bg: t.lowBg };
}

// Deliberately never "trygg"/"safe": we can only report the signs we found.
export const VERDICT_LABEL: Record<Verdict, string> = {
  'looks-ok': 'Ingen store faresignaler',
  'check-carefully': 'Sjekk nøye',
  'high-risk': 'Høy risiko',
};

export const VERDICT_ICON: Record<Verdict, 'shield-checkmark' | 'alert-circle' | 'warning'> = {
  'looks-ok': 'shield-checkmark',
  'check-carefully': 'alert-circle',
  'high-risk': 'warning',
};

export function verdictColors(t: Theme, v: Verdict) {
  return v === 'looks-ok' ? { fg: t.ok, bg: t.okBg } : v === 'check-carefully' ? severityColors(t, 'medium') : severityColors(t, 'high');
}

export const VERDICT_GRADIENT: Record<Verdict, readonly [string, string]> = {
  'looks-ok': ['#0E8A63', '#22B783'],
  'check-carefully': ['#C2620A', '#F59E0B'],
  'high-risk': ['#C42B3A', '#F0525A'],
};

export function formatMoney(amount: number | null, currency: string | null): string | null {
  if (amount === null) return null;
  const n = new Intl.NumberFormat('nb-NO').format(amount);
  if (!currency) return n;
  if (currency === 'NOK') return `${n} kr`;
  if (currency === 'GBP') return `£${n}`;
  if (currency === 'EUR') return `€${n}`;
  return `${n} ${currency}`;
}

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Akkurat nå';
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'I går' : `${days} dager siden`;
}
