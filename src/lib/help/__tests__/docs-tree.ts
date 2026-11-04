/**
 * Fixture-tree harness for the help pipeline tests (spec "Testing Decisions", seam 1).
 *
 * Fixture paths mirror the on-disk docs layout: Base Docs pages live under
 * <root>/global/<page> (the mirrorz-docs submodule), Site Overrides under
 * <root>/local/<page>. Layout changes belong in baseFile/localFile here only —
 * the tests themselves stay untouched.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Path of a Base Docs file inside a fixture tree. */
export function baseFile(page: string, file: string): string {
  return path.join('global', page, file);
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

/**
 * Await a pipeline call expected to reject and return the error message,
 * so negative tests can assert on page, block and line info in it.
 */
export async function errorMessageFrom(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error('expected the pipeline to reject');
}

/** Remove every fixture tree created by makeDocsTree (call from afterAll). */
export async function removeDocsTrees(): Promise<void> {
  await Promise.all(
    createdRoots.map((root) => fs.rm(root, { recursive: true, force: true })),
  );
}
