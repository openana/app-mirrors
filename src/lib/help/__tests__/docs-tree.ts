/**
 * Fixture-tree harness for the help pipeline tests (spec "Testing Decisions", seam 1).
 *
 * Fixture paths mirror today's on-disk docs layout: Base Docs pages are direct
 * children of the root, Site Overrides live under <root>/local/<page>. When the
 * storage layout moves (spec ticket 03), change baseFile/localFile here only —
 * the tests themselves stay untouched.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Path of a Base Docs file inside a fixture tree. */
export function baseFile(page: string, file: string): string {
  return path.join(page, file);
}

/** Path of a Site Override file inside a fixture tree. */
export function localFile(page: string, file: string): string {
  return path.join('local', page, file);
}

const createdRoots: string[] = [];

/** Write a fixture docs tree into a fresh temp dir and return its root. */
export async function makeDocsTree(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zdoc-fixture-'));
  createdRoots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
  }
  return root;
}

/** Remove every fixture tree created by makeDocsTree (call from afterAll). */
export async function removeDocsTrees(): Promise<void> {
  await Promise.all(
    createdRoots.map((root) => fs.rm(root, { recursive: true, force: true })),
  );
}
