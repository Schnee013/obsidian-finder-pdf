import fs, { promises as asyncFs } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import { messagesFor, type Messages } from './i18n.ts';

export async function markdownPath(input: string, messages: Messages = messagesFor()): Promise<string> {
  if (!isAbsolute(input) || !/\.(md|markdown)$/i.test(input) || input.includes('\0')) {
    throw new Error(messages.selectMarkdown);
  }
  const stat = await asyncFs.stat(input);
  if (!stat.isFile()) throw new Error(messages.notAFile);
  return input;
}

export function pdfPath(input: string): string {
  return join(dirname(input), basename(input, extname(input)) + '.pdf');
}

/** Never touch the destination until rendering has completed successfully. */
export async function savePdf(
  source: string,
  render: (temporaryPdf: string) => Promise<void>,
  messages: Messages = messagesFor(),
): Promise<string> {
  const initial = pdfPath(source);
  const directory = dirname(initial);
  const stem = basename(initial, '.pdf');
  const temporaryDirectory = await asyncFs.mkdtemp(join(directory, '.finder-pdf-'));
  const temporaryPdf = join(temporaryDirectory, basename(initial));
  try {
    await render(temporaryPdf);
    // Older Electron can lose async fs callbacks after a print child window closes.
    // Finish validation, exclusive copying and cleanup without another fs callback.
    const output = fs.openSync(temporaryPdf, 'r');
    try {
      const header = Buffer.alloc(5);
      fs.readSync(output, header, 0, 5, 0);
      const size = fs.fstatSync(output).size;
      const trailer = Buffer.alloc(Math.min(1024, size));
      fs.readSync(output, trailer, 0, trailer.length, size - trailer.length);
      if (header.toString() !== '%PDF-' || !/%%EOF\s*$/.test(trailer.toString())) {
        throw new Error(messages.incompletePdf);
      }
    } finally { fs.closeSync(output); }
    for (let number = 0; ; number++) {
      const destination = number === 0 ? initial : join(directory, `${stem}(${number}).pdf`);
      try {
        // Exclusive creation handles existing names and concurrent exports alike.
        fs.copyFileSync(temporaryPdf, destination, fs.constants.COPYFILE_EXCL);
        return destination;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
