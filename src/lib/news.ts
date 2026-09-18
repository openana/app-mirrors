export interface NewsPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  content: string;
}

// Use Vite's glob import to load all markdown files from content/news
const newsModules = import.meta.glob<string>('@/content/news/*/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function parseFrontmatter(raw: string): { title: string; date: string; summary: string; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { title: '', date: '', summary: '', body: raw };

  const frontmatter = match[1] || '';
  const body = match[2] || '';

  const titleMatch = frontmatter.match(/title:\s*(.+)/);
  const dateMatch = frontmatter.match(/date:\s*(.+)/);
  const summaryMatch = frontmatter.match(/summary:\s*(.+)/);

  return {
    title: titleMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || '',
    date: dateMatch?.[1]?.trim() || '',
    summary: summaryMatch?.[1]?.trim().replace(/^["']|["']$/g, '') || '',
    body: body.trim(),
  };
}

function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

const allPosts: NewsPost[] = [];

for (const [filePath, raw] of Object.entries(newsModules)) {
  // Extract slug from path: /src/content/news/2025-01-15/new-mirror-site.md
  const slugMatch = filePath.match(/\/([^/]+)\/([^/]+)\.md$/);
  if (!slugMatch) continue;

  const dirName = slugMatch[1] || '';
  const { title, date, summary, body } = parseFrontmatter(raw);

  allPosts.push({
    slug: dirName,
    title,
    date,
    summary,
    content: simpleMarkdownToHtml(body),
  });
}

// Sort by date descending
allPosts.sort((a, b) => b.date.localeCompare(a.date));

export function getAllPosts(): NewsPost[] {
  return allPosts;
}

export function getPostBySlug(slug: string): NewsPost | undefined {
  return allPosts.find((p) => p.slug === slug);
}