import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { mkdtemp, mkdir, readFile, readlink, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markdownPath, pdfPath, savePdf } from '../src/files.ts';
import { messagesFor } from '../src/i18n.ts';

const bytes = '%PDF-1.7\nfixture\n%%EOF\n';
const render = async (path: string) => { await writeFile(path, bytes); };

function numbered(path: string, number: number): string {
  return path.slice(0, -4) + `(${number}).pdf`;
}

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
  assert.equal(await savePdf(source, render), target);
  assert.equal(await readFile(target, 'utf8'), bytes);
  assert.equal(await readFile(source, 'utf8'), '# original');
  assert.equal((await readdir(dir)).length, 2);
});

test('an existing PDF is preserved and the export is saved with number one', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  assert.equal(await savePdf(source, render), numbered(target, 1));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal(await readFile(numbered(target, 1), 'utf8'), bytes);
});

test('chooses the first free number in ascending order, including gaps', async t => {
  const { source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await writeFile(numbered(target, 1), 'old number one');
  await writeFile(numbered(target, 3), 'old number three');
  assert.equal(await savePdf(source, render), numbered(target, 2));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal(await readFile(numbered(target, 1), 'utf8'), 'old number one');
  assert.equal(await readFile(numbered(target, 3), 'utf8'), 'old number three');
  assert.equal(await readFile(numbered(target, 2), 'utf8'), bytes);
});

test('uses the unnumbered name when free, even if numbered copies exist', async t => {
  const { source, target } = await fixture(t);
  await writeFile(numbered(target, 1), 'old number one');
  assert.equal(await savePdf(source, render), target);
  assert.equal(await readFile(target, 'utf8'), bytes);
  assert.equal(await readFile(numbered(target, 1), 'utf8'), 'old number one');
});

test('repeated exports keep all previous PDFs', async t => {
  const { dir, source, target } = await fixture(t);
  for (let number = 0; number < 4; number++) {
    const expected = number === 0 ? target : numbered(target, number);
    assert.equal(await savePdf(source, render), expected);
    assert.equal(await readFile(expected, 'utf8'), bytes);
  }
  assert.equal((await readdir(dir)).length, 5);
  assert.equal(await readFile(source, 'utf8'), '# original');
});

test('preserves parentheses and numbers in the original Markdown name', async t => {
  const { dir } = await fixture(t);
  const source = join(dir, 'draft(4).markdown');
  await writeFile(source, '# draft');
  const target = join(dir, 'draft(4).pdf');
  await writeFile(target, 'old PDF');
  assert.equal(await savePdf(source, render), join(dir, 'draft(4)(1).pdf'));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
});

test('skips names occupied by directories, symlinks, and dangling symlinks', async t => {
  const { dir, source, target } = await fixture(t);
  const existing = join(dir, 'existing.pdf');
  const missing = join(dir, 'missing.pdf');
  await writeFile(existing, 'linked PDF');
  await symlink(existing, target);
  await mkdir(numbered(target, 1));
  await symlink(missing, numbered(target, 2));
  assert.equal(await savePdf(source, render), numbered(target, 3));
  assert.equal(await readlink(target), existing);
  assert.equal(await readlink(numbered(target, 2)), missing);
  assert.equal(await readFile(existing, 'utf8'), 'linked PDF');
  assert.equal(await readFile(numbered(target, 3), 'utf8'), bytes);
  await assert.rejects(readFile(missing), { code: 'ENOENT' });
});

test('a render failure preserves the original and cleans temporary files', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await assert.rejects(savePdf(source, async p => { await writeFile(p, 'partial'); throw new Error('render failed'); }));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal((await readdir(dir)).length, 2);
});

test('rejects missing or invalid output without saving a numbered PDF', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await assert.rejects(savePdf(source, async () => {}));
  await assert.rejects(savePdf(source, async p => { await writeFile(p, 'not a PDF'); }));
  await assert.rejects(savePdf(source, async p => { await writeFile(p, '%PDF-1.7\ntruncated'); }));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal((await readdir(dir)).length, 2);
});

test('files appearing during rendering are preserved and numbering continues', async t => {
  const { source, target } = await fixture(t);
  let renders = 0;
  assert.equal(await savePdf(source, async p => {
    renders++;
    await render(p);
    await writeFile(target, 'concurrent PDF');
    await writeFile(numbered(target, 1), 'concurrent number one');
  }), numbered(target, 2));
  assert.equal(renders, 1);
  assert.equal(await readFile(target, 'utf8'), 'concurrent PDF');
  assert.equal(await readFile(numbered(target, 1), 'utf8'), 'concurrent number one');
  assert.equal(await readFile(numbered(target, 2), 'utf8'), bytes);
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

test('concurrent exports use distinct numbers without rerendering or overwriting', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  await writeFile(numbered(target, 1), 'old number one');
  const count = 8;
  let renders = 0;
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  const results = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const content = `%PDF-1.7\nexport ${index}\n%%EOF\n`;
    const path = await savePdf(source, async temporary => {
      await writeFile(temporary, content);
      if (++renders === count) release();
      await ready;
    });
    return { path, content };
  }));
  assert.equal(renders, count);
  assert.deepEqual(results.map(result => result.path).sort(),
    Array.from({ length: count }, (_, index) => numbered(target, index + 2)).sort());
  for (const result of results) assert.equal(await readFile(result.path, 'utf8'), result.content);
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal(await readFile(numbered(target, 1), 'utf8'), 'old number one');
  assert.equal(await readFile(source, 'utf8'), '# original');
  assert.equal((await readdir(dir)).length, count + 3);
});

test('a copy failure is reported and temporary output is removed', async t => {
  const { dir, source, target } = await fixture(t);
  await writeFile(target, 'old PDF');
  const failure = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
  t.mock.method(fs, 'copyFile', async () => { throw failure; });
  await assert.rejects(savePdf(source, render), error => error === failure);
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal((await readdir(dir)).length, 2);
});

const localizedErrors = [
  {
    languages: ['en', 'en-US', 'de', '', 'zhx'],
    selectMarkdown: 'Please select a Markdown file.',
    notAFile: 'The selected item is not a file.',
    incompletePdf: 'Obsidian did not generate a complete PDF.',
  },
  {
    languages: ['zh', 'zh-CN', 'zh_TW', 'ZH-Hans'],
    selectMarkdown: '请选择 Markdown 文件。',
    notAFile: '所选项目不是文件。',
    incompletePdf: 'Obsidian 未能生成完整的 PDF。',
  },
];

for (const expected of localizedErrors) {
  for (const language of expected.languages) {
    test(`validation and failed saves use localized messages for ${language || 'an unset language'}`, async t => {
      const { dir, source, target } = await fixture(t);
      const messages = messagesFor(language);
      await assert.rejects(markdownPath('relative.md', messages), { message: expected.selectMarkdown });
      const directory = join(dir, 'directory.md');
      await mkdir(directory);
      await assert.rejects(markdownPath(directory, messages), { message: expected.notAFile });
      await writeFile(target, 'old PDF');
      await assert.rejects(savePdf(source, async p => { await writeFile(p, '%PDF-1.7\ntruncated'); },
        messages), { message: expected.incompletePdf });
      assert.equal(await readFile(target, 'utf8'), 'old PDF');
      assert.equal(await readFile(source, 'utf8'), '# original');
      assert.deepEqual((await readdir(dir)).sort(), [
        'directory.md', source.slice(dir.length + 1), target.slice(dir.length + 1),
      ].sort());
    });
  }
}
