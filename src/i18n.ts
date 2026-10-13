const en = {
  exportFailed: 'PDF export failed: ',
  selectMarkdown: 'Please select a Markdown file.',
  notAFile: 'The selected item is not a file.',
  saveAsPdf: 'Please save the file with a .pdf extension.',
  incompletePdf: 'Obsidian did not generate a complete PDF.',
  localVaultOnly: 'Only local macOS vaults are supported.',
  cannotReadFile: 'Obsidian could not read this file. Version 1.14.4 or later is required.',
  nativePdfUnavailable: 'Native PDF export is unavailable in this version of Obsidian.',
  nativePdfNotFound: 'Could not find the native PDF exporter. Please check your Obsidian version.',
};

export type Messages = Readonly<typeof en>;

const zh: Messages = {
  exportFailed: 'PDF 导出失败：',
  selectMarkdown: '请选择 Markdown 文件。',
  notAFile: '所选项目不是文件。',
  saveAsPdf: '请保存为 PDF 文件。',
  incompletePdf: 'Obsidian 未能生成完整的 PDF。',
  localVaultOnly: '仅支持 macOS 本地仓库。',
  cannotReadFile: 'Obsidian 无法读取该文件，需要 1.14.4 或更高版本。',
  nativePdfUnavailable: '当前 Obsidian 版本的原生 PDF 接口不可用。',
  nativePdfNotFound: '未找到原生 PDF 导出接口，请检查 Obsidian 版本。',
};

/** Follow Obsidian's app language, with English as the fallback. */
export function messagesFor(language = 'en'): Messages {
  return /^zh(?:[-_]|$)/i.test(language) ? zh : en;
}
