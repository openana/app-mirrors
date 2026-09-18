import useSWR from 'swr';
import type { SiteData } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchDownloadJson(url: string): Promise<SiteData[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch downloads: ${res.status}`);
  return res.json();
}

export function useDownloadList() {
  return useSWR(`${API_URL}/download.json`, fetchDownloadJson, {
    refreshInterval: 10 * 60 * 1000, // 10 minutes
  });
}