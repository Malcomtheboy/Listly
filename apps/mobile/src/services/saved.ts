import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis, SavedAnalysis } from './types';

const KEY = 'listly.saved.v1';
const MAX_SAVED = 50;

export async function listSaved(): Promise<SavedAnalysis[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
  } catch {
    return [];
  }
}

export async function getSaved(id: string): Promise<SavedAnalysis | null> {
  return (await listSaved()).find((a) => a.id === id) ?? null;
}

export async function saveAnalysis(analysis: Analysis): Promise<SavedAnalysis> {
  const saved: SavedAnalysis = { ...analysis, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const all = [saved, ...(await listSaved())].slice(0, MAX_SAVED);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return saved;
}

export async function removeSaved(id: string): Promise<void> {
  const all = (await listSaved()).filter((a) => a.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
