#!/usr/bin/env python3
"""Validate release metadata and package the already-built plugin using only stdlib."""
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parent.parent

def read_json(name):
    return json.loads((root / name).read_text())

manifest = read_json('manifest.json')
package = read_json('package.json')
lock = read_json('package-lock.json')
version = manifest['version']
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise SystemExit('Obsidian requires an x.y.z release version without a v prefix.')
if not all(value == version for value in [package['version'], lock['version'], lock['packages']['']['version']]):
    raise SystemExit('manifest.json, package.json and package-lock.json versions must match.')
if read_json('versions.json').get(version) != manifest['minAppVersion']:
    raise SystemExit('versions.json must map this version to minAppVersion.')
if package['license'] != 'MIT' or manifest['isDesktopOnly'] is not True:
    raise SystemExit('This plugin requires the MIT license and desktop-only manifest.')
if f'## [{version}]' not in (root / 'CHANGELOG.md').read_text():
    raise SystemExit('Add the release to CHANGELOG.md first.')
license_text = (root / 'LICENSE').read_text().strip()
if license_text not in (root / 'main.js').read_text():
    raise SystemExit('Build main.js with the full license notice before packaging.')

files = ['main.js', 'manifest.json', 'LICENSE', 'README.md', 'README.zh-CN.md', 'scripts/finder-action.py']
output = root / 'dist'
output.mkdir(exist_ok=True)
for name in ['main.js', 'manifest.json']:
    (output / name).write_bytes((root / name).read_bytes())
archive = output / f'finder-pdf-{version}.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for name in files:
        # Fixed metadata keeps packages from identical source reproducible.
        entry = ZipInfo(f'finder-pdf/{name}', date_time=(1980, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        bundle.writestr(entry, (root / name).read_bytes())
assets = [output / 'main.js', output / 'manifest.json', archive]
(output / 'SHA256SUMS').write_text(''.join(
    f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in assets
))
print(f'Release {version}: version metadata valid; assets written to dist/.')
