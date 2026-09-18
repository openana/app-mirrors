import useSWR from 'swr';
import type { MirrorEntry } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchMirrorsJson(url: string): Promise<MirrorEntry[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch mirrors: ${res.status}`);
  return res.json();
}

export function useMirrors() {
  return useSWR(`${API_URL}/mirrors.json`, fetchMirrorsJson, {
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus: true,
  });
}