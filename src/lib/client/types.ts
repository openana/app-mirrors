export interface MirrorEntry {
  name: string;
  status: string;
  upstream: string;
  size: string;
  last_update_ts: number;
  last_started_ts: number;
  last_ended_ts: number;
  next_schedule_ts: number;
  is_master?: boolean;
}

export interface DownloadInfo {
  category: string;
  distro: string;
  urls: { name: string; url: string }[];
}

export interface SiteData {
  site: { abbr: string; url: string };
  info: DownloadInfo[];
}