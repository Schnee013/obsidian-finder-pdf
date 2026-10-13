# Changelog

Versions follow [Semantic Versioning](https://semver.org/). During `0.x`, compatibility is described in each release's notes.

## [0.2.0] - 2026-10-13

- Save filename conflicts as `name(1).pdf`, `name(2).pdf`, and so on, using the first available number without opening a save dialog.
- Preserve existing files and handle concurrent exports with exclusive file creation, reusing the rendered PDF when names collide.

- Follow Obsidian's app language for plugin messages, with Chinese support and an English fallback.
- Generate an English Finder menu entry by default; use `--language zh` to keep the Chinese entry.
- Provide English documentation with a linked Chinese guide, and include both guides in the installation package.

## [0.1.0] - 2026-10-13

First public release.

- Export Markdown from any folder through a Finder Quick Action, using Obsidian's native PDF renderer and vault settings.
- Save a same-name PDF beside the source by default; use the macOS save dialog to rename, cancel, or confirm replacement on conflicts.
- Write to the destination only after export and PDF validation, protecting files on cancellation, render failures, and detected conflicts.
- Skip URI foreground activation when the target vault is already running, while retaining conflict dialogs and native rendering trust prompts.
- Include a manual Finder Quick Action generator, automated checks, and an installation package with checksums.

Supported environments, cold-start window behavior, and internal API limitations are described in the [README](README.md#compatibility-and-limitations).

[0.1.0]: https://github.com/Schnee013/obsidian-finder-pdf/releases/tag/0.1.0
[0.2.0]: https://github.com/Schnee013/obsidian-finder-pdf/releases/tag/0.2.0
