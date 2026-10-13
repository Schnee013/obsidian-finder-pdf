import { App, finishRenderMath, MarkdownView, Modal, TFile, type Component } from 'obsidian';
import { messagesFor, type Messages } from './i18n';

interface NativePdfModal extends Modal {
  file: TFile;
  printToPdf(options: Record<string, unknown>): Promise<void>;
  print(container: HTMLElement, component: Component, includeName: boolean): Promise<void>;
}

/** The native PDF exporter is not in Obsidian's public plugin API. */
function captureExporter(app: App, file: TFile, messages: Messages): NativePdfModal {
  const invoke = (MarkdownView.prototype as unknown as { printToPdf?: () => void }).printToPdf;
  if (typeof invoke !== 'function') throw new Error(messages.nativePdfUnavailable);
  let captured: NativePdfModal | undefined;
  const originalOpen = (Modal.prototype as { open: (this: Modal) => void }).open;
  // A synchronous, narrowly scoped hook: restored before any async work begins.
  Modal.prototype.open = function () {
    const candidate = this as NativePdfModal;
    if (candidate.file === file && typeof candidate.printToPdf === 'function' && typeof candidate.print === 'function') {
      captured = candidate;
    } else originalOpen.call(this);
  };
  try { invoke.call({ app, file }); }
  finally { Modal.prototype.open = originalOpen; }
  if (!captured) throw new Error(messages.nativePdfNotFound);
  return captured;
}

export async function renderNative(app: App, file: TFile, filepath: string, messages: Messages = messagesFor()): Promise<void> {
  const modal = captureExporter(app, file, messages);
  const print = modal.print.bind(modal);
  modal.print = async (container, component, includeName) => {
    const result = await print(container, component, includeName);
    if (container.querySelector('mjx-container')) {
      // The print window clones styles before the first formula loads MathJax.
      await finishRenderMath();
      const mathStyle = document.getElementById('MJX-CHTML-styles') as HTMLStyleElement | null;
      if (mathStyle?.sheet) {
        const target = container.ownerDocument;
        const style = target.getElementById(mathStyle.id) ?? createEl('style', { parent: target.head });
        style.id = mathStyle.id;
        style.textContent = Array.from(mathStyle.sheet.cssRules, rule => rule.cssText).join('\n');
      }
    }
    await container.ownerDocument.fonts.ready;
    return result;
  };
  const vault = app.vault as typeof app.vault & { getConfig(key: string): unknown };
  const config = (vault.getConfig('pdfExportSettings') ?? {}) as Record<string, unknown>;
  const marginsType = Number(config.margin ?? 0);
  const scaleFactor = Number(config.downscalePercent ?? 100);
  const options: Record<string, unknown> = {
    filepath, open: false,
    includeName: Boolean(config.includeName),
    pageSize: config.pageSize ?? 'Letter',
    landscape: Boolean(config.landscape),
    marginsType, scaleFactor,
    scale: Math.max(0.1, Math.min(2, scaleFactor / 100)),
  };
  if (marginsType === 1 || marginsType === 2) options.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  try { await modal.printToPdf(options); }
  finally {
    modal.containerEl.remove();
    // Older Electron can drop Node fs callbacks while a print child window closes.
    // Resume on the browser's task queue after teardown, before touching files again.
    // https://github.com/electron/electron/issues/36858
    await new Promise<void>(resolve => window.setTimeout(resolve, 100));
  }
}
