# Changelog

版本采用 [Semantic Versioning](https://semver.org/)。`0.x` 阶段的兼容性以各版本说明为准。

## [0.1.0] - 2026-10-13

首个公开版本。

- 从 Finder 快速操作导出任意目录的 Markdown，复用 Obsidian 原生 PDF 渲染和仓库设置。
- 默认保存到同目录、同名 PDF；重名时通过 macOS 保存窗口改名、取消或确认替换。
- 导出完成并验证文件后才写入目标，处理取消、渲染失败及检测到的文件冲突。
- 目标仓库已运行时跳过 URI 的前台激活；保留重名和原生渲染授权提示。
- 提供手动生成 Finder 快速操作的脚本、自动检查及带校验值的安装包。

支持环境、冷启动窗口和未公开接口限制见 [README](README.md#兼容性与限制)。

[0.1.0]: https://github.com/Schnee013/obsidian-finder-pdf/releases/tag/0.1.0
