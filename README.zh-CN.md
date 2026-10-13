# Finder PDF

[English](README.md) | 简体中文

从 macOS Finder 右键菜单导出 Markdown，使用 Obsidian 原生 PDF 渲染和当前仓库的导出设置。

- 支持任意目录的 `.md` / `.markdown`，无须导入仓库或打开对应笔记。
- 默认生成同目录、同名的 PDF。
- 已有同名 PDF 时自动保存为 `name(1).pdf`、`name(2).pdf` 等，无须打开保存窗口。
- 目标仓库已运行时，常规导出不主动激活 Obsidian 主窗口。

只提供一个 Finder 入口，无设置页面、独立应用、额外渲染器或常驻服务。使用前请阅读[兼容性与限制](#兼容性与限制)，尤其是冷启动行为。

## 安装与使用

要求 macOS、Obsidian **1.14.4+**，以及一个可启用第三方插件的本地仓库。生成 Finder 快速操作时需要 Python 3；日常导出不需要 Python 或 Node.js。

### 在 Obsidian 中安装（0.2.1 起）

从 `0.2.1` 开始，推荐通过 [Obsidian 社区插件目录](https://community.obsidian.md/plugins/finder-pdf)安装。版本须完成目录审核并发布后，才可在 Obsidian 中安装。[官方公告](https://obsidian.md/blog/future-of-plugins/)说明，审核通过后，应用内搜索可能需要最多 24 小时才能同步。如果搜索暂时找不到 Finder PDF，可使用下方的手动安装方式。

1. 在用于 PDF 渲染的仓库中打开 **设置 → 第三方插件**，按需启用第三方插件。
2. 点击 **浏览**，搜索 **Finder PDF**。
3. 打开对应 `Schnee013/obsidian-finder-pdf` 仓库的 Finder PDF 条目，点击 **安装**，然后 **启用**。
4. 继续完成下方的 **生成 Finder 快速操作**。安装插件不会自动创建 macOS Finder 入口。

### 手动安装备选

1. 从 [GitHub Releases](https://github.com/Schnee013/obsidian-finder-pdf/releases) 下载 `finder-pdf-版本号.zip` 并解压。
2. 把其中的 `finder-pdf` 文件夹放到目标仓库的 `.obsidian/plugins/` 中。若仓库使用自定义配置目录，请替换 `.obsidian`。
3. 在 Obsidian 的第三方插件设置中启用 **Finder PDF**。

### 生成 Finder 快速操作

两种安装方式都需要下载并解压相应 [GitHub Release](https://github.com/Schnee013/obsidian-finder-pdf/releases) 的 ZIP，以取得生成脚本。若已通过 Obsidian 安装插件，只需使用 ZIP 中的脚本，无须再把其中的插件文件复制到仓库。

1. 在安装包的 `finder-pdf` 文件夹内运行下面的命令，把 `你的仓库名称` 改为启用了插件的仓库名称；同名仓库可使用仓库 ID。

```sh
python3 scripts/finder-action.py --vault '你的仓库名称' --language zh \
  --output "$HOME/Library/Services/用 Obsidian 导出 PDF.workflow"
```

2. 在 macOS“系统设置 → 通用 → 登录项与扩展 → Finder”中启用“用 Obsidian 导出 PDF”。不同 macOS 版本的设置位置可能稍有差异。
3. 在 Finder 中选中 Markdown 文件，右键 → **快速操作 → 用 Obsidian 导出 PDF**。部分系统版本也会把它列在“服务”中。

可在“系统设置 → 键盘 → 键盘快捷键 → 服务”中给这个操作设置快捷键，例如 `⌃⌥⌘P`。安装脚本不会修改快捷键或替你启用插件。

插件提示跟随 Obsidian 的应用语言：中文环境显示中文，其他语言环境显示英文。Finder 菜单语言在生成快速操作时选择，默认英文；上述命令通过 `--language zh` 保留中文菜单，与 Obsidian 语言独立。只需保留一个工作流，切换菜单语言时重新生成到原来的 `--output` 路径。

选定的 Obsidian 仓库提供主题、CSS、插件渲染和 PDF 导出设置。导出不修改源 Markdown，也不覆盖已有 PDF：插件依次尝试 `name.pdf`、`name(1).pdf`、`name(2).pdf`，保存到第一个可用名称。编号序列中有空位时优先使用空位。并发导出遇到重名时继续尝试下一个编号，无须重新渲染或输入文件名。

通过社区目录安装的插件可在 **设置 → 第三方插件 → 检查更新** 中找到 Finder PDF 并点击 **更新**。手动安装时，替换插件文件夹内的发布文件并重新启用插件。更新快速操作时重新运行生成脚本。卸载时，禁用并移除插件，删除 `~/Library/Services/用 Obsidian 导出 PDF.workflow`。

## 兼容性与限制

- **后台导出：**目标仓库已打开时，导出跳过 URI 的前台激活。同名文件在源目录自动编号保存；文档渲染需要信任授权时仍会出现原生提示。
- **冷启动：**快速操作会在必要时启动 Obsidian。尽管使用隐藏、后台启动参数，本机实测冷启动仍会显示主窗口，它在插件加载前就由主程序创建。要求不出现主窗口时，应让目标仓库保持在后台运行。
- **未公开接口：**原生 PDF 导出和 URI 调度使用 Obsidian 的内部接口。当前最低版本取已经验证的 1.14.4；以后升级需要复测，不保证所有未来版本自动兼容。
- **平台：**仅支持 macOS。插件使用 Node.js 和 Electron，因此 manifest 标记为桌面专用；Windows、Linux 和移动端不提供 Finder 入口。
- **外部引用：**仓库外笔记使用 Obsidian 的外部文件支持。图片、链接和嵌入内容受原生解析及访问权限限制，不会自动搜索整个磁盘中的同名笔记。

## 文件与网络访问

插件按 Finder 请求读取仓库外 Markdown 及其引用资源，在源目录写入新的 PDF，必要时使用编号名称，随后清理本次导出的临时文件。不修改笔记，不覆盖已有 PDF，不扫描全盘，无遥测、账号、上传或插件自行发起的网络请求。

桌面插件使用 Node.js 文件接口校验请求中的源路径，并在仓库外保存 PDF。这是从任意 Finder 目录导出 Markdown 所需的能力，因此社区目录可能显示 **Direct Filesystem Access（直接文件访问）** 警告。[Obsidian 开发者政策](https://docs.obsidian.md/community-directory/developer-policies)允许在明确说明用途后访问仓库外文件。

文档包含远程图片等资源时，Obsidian 原生渲染器可能按文档内容访问对应资源地址。插件不改变 Mermaid 或第三方渲染插件的信任、执行权限。

Finder 工作流通过本机 `obsidian://finder-pdf` URI 传递路径，不启动 HTTP 服务。工作流由用户手动生成；插件不安装或更新自己、其他插件或依赖。

## 开发与结构

开发环境需要 Node.js **22.6+** 和 Python 3。依赖版本由 `package-lock.json` 固定，使用 npm 官方源。

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm test
npm run package
```

`npm run package` 先进行 TypeScript 类型检查与构建，再核对版本和许可证，生成 `dist/` 发布文件。仅需编译时运行 `npm run build`。

| 路径 | 职责 |
| --- | --- |
| [`src/main.ts`](src/main.ts) | 插件生命周期、URI 请求队列和外部文件定位 |
| [`src/native.ts`](src/native.ts) | 原生 PDF 接口适配、公式样式及字体就绪处理 |
| [`src/files.ts`](src/files.ts) | 目标路径、临时导出、文件验证和自动编号保存 |
| [`src/i18n.ts`](src/i18n.ts) | 插件的中英文提示与语言回退 |
| [`scripts/finder-action.py`](scripts/finder-action.py) | 根据 manifest 版本和所选菜单语言生成一个 Finder 快速操作 |
| [`scripts/release.py`](scripts/release.py) | 版本一致性校验、含双语说明的安装包及 SHA-256 校验值 |
| [`tests/`](tests/) | 编号保存、并发导出、插件调用、本地化错误及工作流生成检查 |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | macOS 上的自动测试、编译及打包检查 |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | 从 main 构建发布文件，生成来源证明并上传供发布使用 |

构建输出为 Obsidian 加载的 CommonJS `main.js`，不把构建产物、依赖目录或本机配置提交到源码仓库。插件运行时没有第三方依赖，直接使用 Obsidian 和 Node.js/Electron 提供的接口。

原生导出适配只在同步捕获导出对象时短暂替换 Modal 方法，并立即恢复。文件先导出到目标目录的临时文件夹。打印子窗口关闭后返回浏览器事件循环，再同步完成 PDF 校验、排他编号保存和临时文件清理，以规避旧 Electron [关闭子窗口后可能丢失异步回调的问题](https://github.com/electron/electron/issues/36858)。最后的文件处理在桌面主线程上完成。项目不复制或分发 Obsidian 的实现代码。

## 验证范围

原始 0.1.0 导出功能的人工验证环境：macOS 26.0.1、Obsidian 1.14.4（安装器 1.8.9 / Electron 34.3.0），日期为 2026-10-13。

- Finder 快速操作可以导出仓库外 Markdown，生成同名同目录 PDF。
- 连续导出、已运行时导出和冷启动导出均能生成有效 PDF；窗口行为见[兼容性与限制](#兼容性与限制)。
- 已检查中文、表格、公式、代码、提示框及相对路径图片；保留原生 Mermaid 信任提示。

同一台机器上的 `0.2.2` 原生 Finder 检查验证了已有 PDF 时的两次连续导出：均生成有效的编号 PDF，源 Markdown 和原 PDF 字节保持不变，并正常清理各自的临时目录。

自动检查覆盖逐数字编号、编号空位、并发导出、已占用名称、失败保护、本地化错误、工作流元数据、菜单语言及参数编码。插件调用测试用模拟的 Obsidian 接口执行编号导出，并将请求 Electron 保存窗口或窗口激活视为失败。CI 不运行 Obsidian，不能代替原生渲染验证。英文界面、全新系统安装与其他 macOS/Obsidian 版本尚未经过人工验证。

## 版本与发布

版本变化记录在 [CHANGELOG.md](CHANGELOG.md)。发布时：

1. 同步 `manifest.json`、`package.json`、`package-lock.json` 中的版本，在 `versions.json` 中维护对应的最低 Obsidian 版本，并更新 Changelog。
2. 运行上述检查，提交并推送源码，确认 CI 通过。在 `main` 上运行 **Release artifacts** 流程，下载其 `finder-pdf-release` 产物，验证构建来源证明后再发布。标签必须与 manifest 版本完全一致，例如 `0.2.1`，不加 `v`。
3. 在 GitHub Release 中上传验证过的 `main.js`、`manifest.json`、`finder-pdf-版本号.zip` 和 `SHA256SUMS`，并把标签指向构建流程使用的准确提交。Obsidian 下载前两个文件；ZIP 为 Finder 入口设置及手动安装提供脚本、许可证和双语说明。ZIP 和校验文件属于配套下载，因此目录可能提示它们不用于应用内安装。

安装包采用固定文件元数据，校验值用于核对下载内容；GitHub 构建证明用于验证发布文件的源码和构建流程。社区目录审核与发布遵循[官方提交指南](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)、[开发者政策](https://docs.obsidian.md/community-directory/developer-policies)与[插件要求](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)。

## 许可证

[MIT](LICENSE) © 2026 Schnee013。本项目是独立的社区插件，与 Obsidian 官方没有隶属关系。
