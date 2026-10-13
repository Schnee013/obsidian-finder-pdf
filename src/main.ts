import { FileSystemAdapter, getLanguage, Notice, Platform, Plugin, TFile } from 'obsidian';
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';
import { markdownPath, savePdf } from './files';
import { renderNative } from './native';
import { messagesFor } from './i18n';

interface ElectronWindow { focus(): void; }

interface ElectronDialog {
  showSaveDialog(window: ElectronWindow, options: {
    defaultPath: string;
    filters: { name: string; extensions: string[] }[];
  }): Promise<{ canceled: boolean; filePath?: string }>;
}

type UriAction = { action?: string; source?: string; [key: string]: unknown };
type UriDispatch = (params: UriAction) => void;

export default class FinderPdf extends Plugin {
  private queue: Promise<unknown> = Promise.resolve();
  private stopped = false;

  onload(): void {
    if (!Platform.isMacOS) return;
    const handle: UriDispatch = params => {
      if (typeof params.source !== 'string') return;
      const source = params.source;
      this.app.workspace.onLayoutReady(() => {
        this.queue = this.queue.then(async () => {
          if (this.stopped) return;
          try { await this.exportFile(source); }
          catch (error) {
            console.error('Finder PDF:', error);
            new Notice(`${messagesFor(getLanguage()).exportFailed}${error instanceof Error ? error.message : String(error)}`);
          }
        });
      });
    };
    this.registerObsidianProtocolHandler('finder-pdf', handle);

    // Obsidian focuses its window before invoking registered URI handlers.
    // Bypass that step only for our action, both before and after URI startup.
    let active = true;
    this.register(() => { active = false; });
    const intercept = (original: UriDispatch): UriDispatch => function (this: unknown, params) {
      if (active && params?.action === 'finder-pdf') handle(params);
      else original.call(this, params);
    };
    const protocol = (this.app.workspace as typeof this.app.workspace & {
      protocolHandler: { dispatch: UriDispatch };
    }).protocolHandler;
    const original = protocol.dispatch;
    const dispatch = intercept(original);
    protocol.dispatch = dispatch;
    this.register(() => {
      if (protocol.dispatch === dispatch) protocol.dispatch = original;
    });
    const host = window as unknown as { OBS_ACT?: UriDispatch | UriAction };
    if (typeof host.OBS_ACT === 'function') {
      const previous = host.OBS_ACT;
      const receive = intercept(previous);
      host.OBS_ACT = receive;
      this.register(() => { if (host.OBS_ACT === receive) host.OBS_ACT = previous; });
    }
  }

  onunload(): void { this.stopped = true; }

  async exportFile(input: string): Promise<string | null> {
    const messages = messagesFor(getLanguage());
    const source = await markdownPath(input, messages);
    const physical = await realpath(source);
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) throw new Error(messages.localVaultOnly);
    const root = await realpath(adapter.getBasePath());
    const inside = relative(root, physical);
    const isInside = inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside);
    // Obsidian 1.14.4 represents external files as file:<absolute native path>.
    const file = (isInside ? this.app.vault.getFileByPath(inside) : null)
      ?? this.app.vault.getFileByPath(`file:${physical}`);
    if (!(file instanceof TFile)) throw new Error(messages.cannotReadFile);
    const remote = (require('electron') as { remote: {
      dialog: ElectronDialog; getCurrentWindow(): ElectronWindow;
      app: { focus(options: { steal: boolean }): void };
    } }).remote;
    const result = await savePdf(source, path => renderNative(this.app, file, path, messages), async defaultPath => {
      // A Finder action runs in the background; a conflict needs an active app.
      remote.app.focus({ steal: true });
      const window = remote.getCurrentWindow();
      window.focus();
      const result = await remote.dialog.showSaveDialog(window, {
        defaultPath,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      return result.canceled ? null : result.filePath ?? null;
    }, messages);
    return result;
  }
}
