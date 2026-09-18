import useSWR from 'swr';
import type { DownloadInfo } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchDownloadJson(url: string): Promise<DownloadInfo[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch downloads: ${res.status}`);
  return res.json();
}

export function useDownloadList() {
  return useSWR(`${API_URL}/downloads.json`, fetchDownloadJson, {
    refreshInterval: 10 * 60 * 1000, // 10 minutes
  });
}