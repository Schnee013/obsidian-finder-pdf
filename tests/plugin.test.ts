import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

test('plugin exports numbered copies without requesting Electron dialogs or window focus', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'finder-pdf-plugin-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, 'Note.md');
  const target = join(dir, 'Note.pdf');
  const bytes = '%PDF-1.7\nnative export fixture\n%%EOF\n';
  await writeFile(source, '# Note');
  await writeFile(target, 'old PDF');

  class Plugin {
    app: unknown;
    constructor(app: unknown) { this.app = app; }
  }
  class FileSystemAdapter { getBasePath() { return dir; } }
  class TFile {}
  const opened: Modal[] = [];
  class Modal { open() { opened.push(this); } }
  const originalOpen = Object.getOwnPropertyDescriptor(Modal.prototype, 'open');
  let renders = 0;
  let removals = 0;
  let prints = 0;
  let mathFinishes = 0;
  const styles: { id: string; textContent: string; parent: unknown }[] = [];
  const printDocument = {
    head: {},
    getElementById: (id: string) => styles.find(style => style.id === id),
    fonts: { ready: Promise.resolve() },
  };
  const container = {
    ownerDocument: printDocument,
    querySelector: (selector: string) => selector === 'mjx-container' ? {} : null,
  };
  class PdfModal extends Modal {
    file: TFile;
    containerEl = { remove() { removals++; } };
    constructor(file: TFile) { super(); this.file = file; }
    async print(_container: unknown, _component?: unknown, _includeName?: boolean) {
      assert.equal(this.file, file);
      prints++;
    }
    async printToPdf(options: Record<string, unknown>) {
      assert.equal(options.open, false);
      renders++;
      await this.print(container, {}, true);
      await writeFile(options.filepath as string, bytes);
    }
  }
  class MarkdownView {
    file!: TFile;
    printToPdf() {
      new Modal().open();
      new PdfModal(this.file).open();
    }
  }
  const obsidian = {
    Plugin, FileSystemAdapter, TFile, Modal, MarkdownView,
    getLanguage: () => 'en',
    finishRenderMath: async () => { mathFinishes++; },
  };
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/main.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs',
    external: ['obsidian', 'electron'], write: false,
  });
  const nodeRequire = createRequire(import.meta.url);
  const module = { exports: {} };
  let electronRequests = 0;
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, Buffer, console, window: { setTimeout },
    document: {
      getElementById: () => ({
        id: 'MJX-CHTML-styles',
        sheet: { cssRules: [{ cssText: 'mjx-container { color: inherit; }' }] },
      }),
    },
    createEl(tag: string, options: { parent: unknown }) {
      assert.equal(tag, 'style');
      assert.equal(options.parent, printDocument.head);
      const style = { id: '', textContent: '', parent: options.parent };
      styles.push(style);
      return style;
    },
    require(name: string) {
      if (name === 'obsidian') return obsidian;
      if (name === 'electron') {
        electronRequests++;
        throw new Error('Unexpected Electron window or save dialog request');
      }
      return nodeRequire(name);
    },
  });
  const FinderPdf = (module.exports as {
    default: new (app: unknown) => { exportFile(source: string): Promise<string> };
  }).default;
  const file = new TFile();
  const plugin = new FinderPdf({
    vault: {
      adapter: new FileSystemAdapter(),
      getFileByPath: () => file,
      getConfig: () => ({}),
    },
  });
  assert.equal(await plugin.exportFile(source), join(dir, 'Note(1).pdf'));
  assert.equal(await plugin.exportFile(source), join(dir, 'Note(2).pdf'));
  assert.equal(await readFile(target, 'utf8'), 'old PDF');
  assert.equal(await readFile(join(dir, 'Note(1).pdf'), 'utf8'), bytes);
  assert.equal(await readFile(join(dir, 'Note(2).pdf'), 'utf8'), bytes);
  assert.equal(await readFile(source, 'utf8'), '# Note');
  assert.equal(electronRequests, 0);
  assert.equal(renders, 2);
  assert.equal(removals, 2);
  assert.equal(prints, 2);
  assert.equal(mathFinishes, 2);
  assert.equal(styles.length, 1);
  assert.equal(styles[0].textContent, 'mjx-container { color: inherit; }');
  assert.equal(opened.length, 2);
  assert.ok(opened.every(modal => modal.constructor === Modal));
  assert.deepEqual(Object.getOwnPropertyDescriptor(Modal.prototype, 'open'), originalOpen);
  assert.equal((await readdir(dir)).length, 4);
});
