#!/usr/bin/env npx tsx
/**
 * Build script for help docs — reads from zdoc/ directory and outputs
 * compiled JSON files that the frontend can load at runtime.
 */

import { getContentBySegments, getAvailableSegments } from '../src/lib/help/parse-markdown';
import fs from 'node:fs/promises';
import path from 'node:path';

const DOCS_DIR = path.resolve(process.cwd(), 'zdoc');
const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'help');

async function main() {
  console.log('Building help docs...');
  console.log(`Source: ${DOCS_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const segments = await getAvailableSegments(DOCS_DIR);
  console.log(`Found ${segments.length} help pages`);

  const routes: Record<string, { title: string; cname: string }> = {};

  for (const segment of segments) {
    const slug = segment.join('/');
    console.log(`  Processing: ${slug}`);

    try {
      const data = await getContentBySegments(DOCS_DIR, segment, 'zh');
      if (!data) {
        console.log(`    Skipped (no data)`);
        continue;
      }

      // Write the compiled page data
      const outputPath = path.join(OUTPUT_DIR, `${slug}.json`);
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2));

      // Record the route
      routes[`/help/${slug}/`] = {
        title: data.meta.title,
        cname: data.meta.cname,
      };

      console.log(`    ✓ ${data.meta.title}`);
    } catch (err) {
      console.error(`    ✗ Error: ${(err as Error).message}`);
    }
  }

  // Write routes.json
  const routesPath = path.join(OUTPUT_DIR, 'routes.json');
  await fs.writeFile(routesPath, JSON.stringify(routes, null, 2));
  console.log(`\nRoutes written to ${routesPath}`);
  console.log(`Total: ${Object.keys(routes).length} pages`);

  // Generate index page
  const indexHtml = Object.entries(routes)
    .map(([href, meta]) => `<li><a href="${href}">${meta.title}</a></li>`)
    .join('\n    ');

  const indexContent = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <title>Help Documentation</title>
  <link rel="stylesheet" href="/src/styles/index.scss" />
</head>
<body>
  <h1>Help Documentation</h1>
  <ul>
    ${indexHtml}
  </ul>
</body>
</html>`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), indexContent);
  console.log('Index page generated');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});