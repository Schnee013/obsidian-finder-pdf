import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markdownPath, pdfPath, savePdf } from '../src/files.ts';

const bytes = '%PDF-1.7\nfixture\n%%EOF\n';
const render = async (path: string) => { await writeFile(path, bytes); };
const noDialog = async (): Promise<null> => { throw new Error('Unexpected save dialog'); };

async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const dir = await mkdtemp(join(tmpdir(), 'finder-pdf-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, "中文 name ' & $().MD");
  await writeFile(source, '# original');
  return { dir, source, target: pdfPath(source) };
}

test('exports beside an arbitrary Markdown file, without a dialog or source changes', async t => {
  const { dir, source, target } = await fixture(t);
  assert.equal(await markdownPath(source), source);
  assert.equal(await savePdf(source, render, noDialog), target);
  assert.equal(await readFile(target, 'utf8'), bytes);
  assert.equal(await readFile(source, 'utf8'), '# original');
  assert.equal((await readdir(dir)).length, 2);
});

test('cancelling a conflict leaves the existing PDF unchanged and skips rendering', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  assert.equal(await savePdf(source, async () => { throw new Error('Must not render'); }, async p => {
    assert.equal(p, target); return null;
  }), null);
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
});

test('renaming in the system dialog preserves the original PDF', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  const renamed = join(dir, '新名字.pdf');
  assert.equal(await savePdf(source, render, async () => renamed), renamed);
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal(await readFile(renamed, 'utf8'), bytes);
});

test('system-confirmed replacement writes the generated PDF', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await savePdf(source, render, async () => target);
  assert.equal(await readFile(target, 'utf8'), bytes);
});

test('a render failure preserves the original and cleans temporary files', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await assert.rejects(savePdf(source, async p => { await writeFile(p, 'partial'); throw new Error('render failed'); }, async () => target));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal((await readdir(dir)).length, 2);
});

test('rejects missing or invalid native output without replacing anything', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await assert.rejects(savePdf(source, async () => {}, async () => target));
  await assert.rejects(savePdf(source, async p => { await writeFile(p, 'not a PDF'); }, async () => target));
  await assert.rejects(savePdf(source, async p => { await writeFile(p, '%PDF-1.7\ntruncated'); }, async () => target));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
});

test('a PDF appearing during rendering triggers a conflict instead of overwriting', async t => {
  const { source, target } = await fixture(t);
  let dialogs = 0;
  assert.equal(await savePdf(source, async p => {
    await render(p); await writeFile(target, 'concurrent PDF');
  }, async () => { dialogs++; return null; }), null);
  assert.equal(dialogs, 1);
  assert.equal(await readFile(target, 'utf8'), 'concurrent PDF');
});

test('rejects relative paths, non-Markdown files, and directories', async t => {
  const { dir } = await fixture(t);
  await assert.rejects(markdownPath('relative.md'));
  await assert.rejects(markdownPath(join(dir, 'file.pdf')));
  await assert.rejects(markdownPath(join(dir, 'missing.md')));
  const directory = join(dir, 'directory.md');
  await mkdir(directory);
  await assert.rejects(markdownPath(directory));
});

test('does not overwrite a newly chosen filename if it appears while rendering', async t => {
  const { dir, source, target } = await fixture(t);
  const renamed = join(dir, 'new.pdf');
  await writeFile(target, 'old PDF');
  let dialogs = 0;
  assert.equal(await savePdf(source, async p => {
    await render(p); await writeFile(renamed, 'concurrent PDF');
  }, async () => ++dialogs === 1 ? renamed : null), null);
  assert.equal(dialogs, 2);
  assert.equal(await readFile(renamed, 'utf8'), 'concurrent PDF');
});

test('asks again if a confirmed destination changes before rendering completes', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  let dialogs = 0;
  assert.equal(await savePdf(source, async p => {
    await render(p); await writeFile(target, 'changed while printing');
  }, async () => ++dialogs === 1 ? target : null), null);
  assert.equal(dialogs, 2);
  assert.equal(await readFile(target, 'utf8'), 'changed while printing');
});
