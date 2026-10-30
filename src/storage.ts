import { tweets } from './data';

export const STORAGE_KEY = 'signal-pond:saved:v1';
export function readSaved(): { ids: string[]; available: boolean } {
  let raw: string | null;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { return { ids: [], available: false }; }
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && tweets.some(tweet => tweet.id === id)) : [];
    return { ids: [...new Set(ids)], available: true };
  } catch { return { ids: [], available: true }; }
}

export function writeSaved(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); return true; }
  catch { return false; }
}
