import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis, SavedAnalysis } from './types';

const KEY = 'listly.saved.v1';
const MAX_SAVED = 50;

export async function listSaved(): Promise<SavedAnalysis[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // Entries saved before cars were added carry no category; they are all rentals.
    const all = raw ? (JSON.parse(raw) as (Omit<SavedAnalysis, 'category'> & { category?: SavedAnalysis['category'] })[]) : [];
    return all.map((a) => ({ ...a, category: a.category ?? 'rental' }) as SavedAnalysis);
  } catch {
    return [];
  }
}

export async function getSaved(id: string): Promise<SavedAnalysis | null> {
  return (await listSaved()).find((a) => a.id === id) ?? null;
}

export async function saveAnalysis(analysis: Analysis): Promise<SavedAnalysis> {
  const saved = { ...analysis, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } as SavedAnalysis;
  const all = [saved, ...(await listSaved())].slice(0, MAX_SAVED);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return saved;
}

export async function removeSaved(id: string): Promise<void> {
  const all = (await listSaved()).filter((a) => a.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function clearSaved(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
