/**
 * Mirror site configuration.
 *
 * Each entry defines a mirror site that users can select in the help pages.
 * The `endpoint` is used for the `{{endpoint}}` template variable in code blocks.
 *
 * To add a new mirror site, add an entry to the `mirrorSites` array below.
 */

export interface MirrorSite {
  /** Unique identifier for the site */
  id: string;
  /** Display name shown in the selector */
  name: string;
  /** The mirror domain/hostname (used for the `{{endpoint}}` template variable) */
  endpoint: string;
  /** Whether the site supports HTTPS */
  supportsHttps: boolean;
}

export const mirrorSites: MirrorSite[] = [
  {
    id: 'xjtu',
    name: 'mirrors.xjtu.edu.cn',
    endpoint: 'mirrors.xjtu.edu.cn',
    supportsHttps: true,
  },
  {
    id: 'xjtu4',
    name: 'mirrors4.xjtu.edu.cn',
    endpoint: 'mirrors4.xjtu.edu.cn',
    supportsHttps: true,
  },
  {
    id: 'xjtu6',
    name: 'mirrors6.xjtu.edu.cn',
    endpoint: 'mirrors6.xjtu.edu.cn',
    supportsHttps: true,
  },
];

/**
 * Default mirror site ID.
 * Change this to set the default selection.
 */
export const defaultMirrorSiteId = 'xjtu';