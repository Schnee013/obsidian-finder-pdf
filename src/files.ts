import { constants, promises as fs } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';

export type SaveDialog = (defaultPath: string) => Promise<string | null>;

export async function markdownPath(input: string): Promise<string> {
  if (!isAbsolute(input) || !/\.(md|markdown)$/i.test(input) || input.includes('\0')) {
    throw new Error('请选择 Markdown 文件。');
  }
  const stat = await fs.stat(input);
  if (!stat.isFile()) throw new Error('所选项目不是文件。');
  return input;
}

export function pdfPath(input: string): string {
  return join(dirname(input), basename(input, extname(input)) + '.pdf');
}

export async function exists(path: string): Promise<boolean> {
  try { await fs.lstat(path); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function fingerprint(path: string): Promise<string | null> {
  try {
    const s = await fs.lstat(path);
    return `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Never touch the destination until rendering has completed successfully. */
export async function savePdf(
  source: string,
  render: (temporaryPdf: string) => Promise<void>,
  ask: SaveDialog,
): Promise<string | null> {
  const initial = pdfPath(source);
  let destination = initial;
  let approved: string | null = null;
  if (await exists(destination)) {
    const selected = await ask(destination);
    if (!selected) return null;
    destination = selected;
    approved = await fingerprint(destination);
  }
  if (extname(destination).toLowerCase() !== '.pdf') throw new Error('请保存为 PDF 文件。');
  // Keeping the temporary file on the destination filesystem makes rename atomic.
  const temporaryDirectory = await fs.mkdtemp(join(dirname(destination), '.finder-pdf-'));
  const temporaryPdf = join(temporaryDirectory, basename(destination));
  try {
    await render(temporaryPdf);
    const output = await fs.open(temporaryPdf, 'r');
    try {
      const header = Buffer.alloc(5);
      await output.read(header, 0, 5, 0);
      const size = (await output.stat()).size;
      const trailer = Buffer.alloc(Math.min(1024, size));
      await output.read(trailer, 0, trailer.length, size - trailer.length);
      if (header.toString() !== '%PDF-' || !/%%EOF\s*$/.test(trailer.toString())) {
        throw new Error('Obsidian 未能生成完整的 PDF。');
      }
    } finally { await output.close(); }
    for (;;) {
      if (approved !== null && await fingerprint(destination) === approved) {
        // The native save panel already confirms replacement of its chosen path.
        // Stage on the chosen filesystem, even when the save panel changes it.
        const stage = await fs.mkdtemp(join(dirname(destination), '.finder-pdf-'));
        try {
          const staged = join(stage, 'output.pdf');
          await fs.copyFile(temporaryPdf, staged);
          if (await fingerprint(destination) !== approved) { approved = null; continue; }
          await fs.rename(staged, destination);
        } finally { await fs.rm(stage, { recursive: true, force: true }); }
        return destination;
      }
      try {
        // Exclusive copy also handles a file appearing after the initial check.
        await fs.copyFile(temporaryPdf, destination, constants.COPYFILE_EXCL);
        return destination;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const selected = await ask(destination);
        if (!selected) return null;
        if (extname(selected).toLowerCase() !== '.pdf') throw new Error('请保存为 PDF 文件。');
        destination = selected;
        approved = await fingerprint(destination);
      }
    }
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}
