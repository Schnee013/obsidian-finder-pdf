# Finder PDF

English | [简体中文](README.zh-CN.md)

Export Markdown from the macOS Finder context menu using Obsidian's native PDF renderer and your vault's export settings.

- Export `.md` and `.markdown` files from any folder, without importing them into a vault or opening the notes.
- Save a PDF with the same name beside the source file by default.
- Use the native macOS save dialog to rename, cancel, or confirm replacement when a PDF already exists.
- Export without activating Obsidian's main window when the target vault is already running.

The plugin provides one Finder entry, with no settings page, standalone app, additional renderer, or background service. Read [Compatibility and limitations](#compatibility-and-limitations) before use, especially the cold-start behavior.

## Installation and use

Requires macOS, Obsidian **1.14.4+**, and a local vault where community plugins can be enabled. Python 3 is needed to generate the Finder Quick Action; routine exports do not require Python or Node.js.

1. Download `finder-pdf-VERSION.zip` from [GitHub Releases](https://github.com/Schnee013/obsidian-finder-pdf/releases) and extract it.
2. Place the `finder-pdf` folder in the target vault's `.obsidian/plugins/` directory. Replace `.obsidian` if your vault uses a custom configuration folder.
3. Enable **Finder PDF** in Obsidian's community plugin settings. The project is not yet listed in the Obsidian community plugin directory, so installation is currently manual.
4. In the package's `finder-pdf` folder, run the following command. Replace `Your Vault Name` with the name of the vault where you enabled the plugin; use a vault ID if names are ambiguous.

```sh
python3 scripts/finder-action.py --vault 'Your Vault Name' \
  --output "$HOME/Library/Services/Export PDF with Obsidian.workflow"
```

5. Enable **Export PDF with Obsidian** in macOS **System Settings → General → Login Items & Extensions → Finder**. The location can vary by macOS version.
6. Select Markdown files in Finder, then right-click → **Quick Actions → Export PDF with Obsidian**. Some macOS versions also list it under **Services**.

You can assign a keyboard shortcut, such as `⌃⌥⌘P`, in **System Settings → Keyboard → Keyboard Shortcuts → Services**. The script does not change shortcuts or enable the plugin for you.

Plugin messages follow Obsidian's app language: Chinese languages use Chinese messages, and other languages use English. The Finder action's menu language is chosen when you generate it: English is the default; add `--language zh` for Chinese. This choice is independent of Obsidian's language. Use one workflow bundle, and regenerate the same `--output` path when changing its menu language.

The selected vault supplies the theme, CSS, plugin rendering, and PDF export settings. Exporting leaves the source Markdown unchanged. If the destination already exists, the save dialog lets you choose a new name or confirm replacement of the original name.

To update, replace the release files in the plugin folder and re-enable the plugin. Rerun the generation script to update the Quick Action. To uninstall, disable and remove the plugin, then delete `~/Library/Services/Export PDF with Obsidian.workflow`, or the workflow path you chose.

## Compatibility and limitations

- **Background export:** when the target vault is open, routine exports skip the URI's foreground activation. Filename conflicts still show the system save dialog, and rendering may still require native trust prompts.
- **Cold start:** the Quick Action starts Obsidian when needed. In the original manual checks, a cold start still showed the main window despite hidden, background launch options: the main app creates it before the plugin loads. Keep the target vault running in the background if the main window must stay hidden.
- **Internal APIs:** native PDF export and URI dispatch use Obsidian's internal interfaces. The minimum version is the tested 1.14.4. Future upgrades need retesting; compatibility with all future versions is not guaranteed.
- **Platform:** macOS only. The plugin uses Node.js and Electron and is marked desktop-only in the manifest. There is no Finder entry on Windows, Linux, or mobile.
- **External references:** notes outside the vault use Obsidian's external-file support. Images, links, and embeds remain subject to native resolution and access permissions. The plugin does not search the whole disk for notes with matching names.

## File and network access

The plugin reads external Markdown and its referenced resources in response to Finder requests. It writes the PDF beside the source or to the location chosen in the save dialog, then removes the export's temporary files. It does not modify notes, scan the whole disk, collect telemetry, use accounts, upload files, or make its own network requests.

When a document includes remote images or other resources, Obsidian's native renderer may access those URLs. The plugin preserves Mermaid and third-party rendering plugins' trust and execution permissions.

The Finder workflow passes paths through the local `obsidian://finder-pdf` URI and does not start an HTTP service. Users generate the workflow manually. The plugin does not install or update itself, other plugins, or dependencies.

## Development and structure

Development requires Node.js **22.6+** and Python 3. Dependency versions are pinned in `package-lock.json` and use the official npm registry.

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm test
npm run package
```

`npm run package` type-checks and builds the TypeScript source, validates versions and the license, then writes release files to `dist/`. Use `npm run build` to compile without packaging.

| Path | Responsibility |
| --- | --- |
| [`src/main.ts`](src/main.ts) | Plugin lifecycle, URI request queue, external-file lookup, and system save dialog |
| [`src/native.ts`](src/native.ts) | Native PDF adapter, math styles, and font readiness |
| [`src/files.ts`](src/files.ts) | Destination paths, temporary export, PDF validation, conflicts, and replacement |
| [`src/i18n.ts`](src/i18n.ts) | English and Chinese plugin messages and language fallback |
| [`scripts/finder-action.py`](scripts/finder-action.py) | Generate one Finder Quick Action using the manifest version and selected menu language |
| [`scripts/release.py`](scripts/release.py) | Version consistency, installation package with both language guides, and SHA-256 checksums |
| [`tests/`](tests/) | File saving, localized errors, and workflow generation checks |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Automated tests, build, and packaging checks on macOS |

The build produces the CommonJS `main.js` loaded by Obsidian. Build output, dependencies, and local configuration are kept out of the source repository. The plugin has no third-party runtime dependencies; it uses the interfaces provided by Obsidian and Node.js/Electron.

The native adapter briefly replaces a Modal method while synchronously capturing the exporter, then restores it immediately. Files are first exported to a temporary folder in the destination directory. The PDF header and end marker are checked before saving. After the print window closes, file processing resumes on the browser event loop to avoid an older Electron [child-window callback issue](https://github.com/electron/electron/issues/36858). The project does not copy or distribute Obsidian's implementation code.

## Validation scope

Original manual validation: macOS 26.0.1, Obsidian 1.14.4 (installer 1.8.9 / Electron 34.3.0), on 2026-10-13.

- The Finder Quick Action exported Markdown outside the vault to a same-name PDF beside the source.
- Rename, cancel, and replacement confirmation were exercised in the system save dialog. Cancellation preserved the existing PDF.
- Consecutive exports, exports with the app running, and cold-start exports produced valid PDFs. Window behavior is described under [Compatibility and limitations](#compatibility-and-limitations).
- Chinese text, tables, math, code, callouts, and relative-path images were checked. Native Mermaid trust prompts were retained.

Automated checks cover file saving, cancellation, failure protection, detected concurrent conflicts, localized errors, workflow metadata, menu languages, and argument encoding. CI does not run Obsidian and cannot replace manual checks of native rendering and system dialogs. The added English interface, a fresh system installation, and other macOS/Obsidian versions have not been manually validated.

## Versions and releases

Version changes are recorded in [CHANGELOG.md](CHANGELOG.md). To release:

1. Synchronize the version in `manifest.json`, `package.json`, and `package-lock.json`. Maintain the corresponding minimum Obsidian version in `versions.json`, and update the changelog.
2. Run the checks above, commit the source, and confirm CI passes. The tag must exactly match the manifest version, for example `0.1.0`, without a `v` prefix.
3. Upload `dist/main.js`, `dist/manifest.json`, `dist/finder-pdf-VERSION.zip`, and `dist/SHA256SUMS` to the GitHub Release. The first two files are for Obsidian downloads. The ZIP also includes the workflow generator, license, and English and Chinese installation guides for manual installation.

The package uses fixed file metadata, and checksums let users verify downloads. A future submission to the Obsidian community directory requires a separate review under the [official submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [developer policies](https://docs.obsidian.md/community-directory/developer-policies), and [plugin requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins).

## License

[MIT](LICENSE) © 2026 Schnee013. This is an independent community plugin and is not affiliated with Obsidian.
