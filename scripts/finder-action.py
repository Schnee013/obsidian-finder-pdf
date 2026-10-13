#!/usr/bin/env python3
"""Generate the one Finder Quick Action. Run manually; never runs inside the plugin."""
import argparse
import json
import plistlib
import uuid
from pathlib import Path
from urllib.parse import quote

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--vault', required=True, help='Obsidian vault ID or name')
parser.add_argument('--output', type=Path, required=True, help='Destination .workflow bundle')
args = parser.parse_args()
manifest = json.loads((Path(__file__).resolve().parent.parent / 'manifest.json').read_text())
if args.output.suffix != '.workflow':
    parser.error('--output must end in .workflow')

script = '''set -eu
for selected_file in "$@"; do
  case "$selected_file" in
    *.[mM][dD]|*.[mM][aA][rR][kK][dD][oO][wW][nN]) ;;
    *) continue ;;
  esac
  encoded_file=$(/usr/bin/osascript -l JavaScript -e 'function run(argv) { return encodeURIComponent(argv[0]); }' "$selected_file")
  /usr/bin/open -g -j -a Obsidian "obsidian://finder-pdf?vault=VAULT_ID&source=${encoded_file}"
done
'''.replace('VAULT_ID', quote(args.vault, safe=''))

action = {
    'AMAccepts': {'Container': 'List', 'Optional': False, 'Types': ['com.apple.cocoa.string']},
    'AMProvides': {'Container': 'List', 'Types': ['com.apple.cocoa.string']},
    'AMActionVersion': '2.0.3',
    'AMApplication': ['Automator'],
    'AMParameterProperties': {k: {} for k in ['COMMAND_STRING', 'inputMethod', 'shell', 'source']},
    'ActionBundlePath': '/System/Library/Automator/Run Shell Script.action',
    'ActionName': 'Run Shell Script',
    'ActionParameters': {'COMMAND_STRING': script, 'CheckedForUserDefaultShell': True,
                         'inputMethod': 1, 'shell': '/bin/zsh', 'source': script},
    'BundleIdentifier': 'com.apple.RunShellScript',
    'CFBundleVersion': '2.0.3',
    'CanShowSelectedItemsWhenRun': False,
    'CanShowWhenRun': False,
    'Category': ['AMCategoryUtilities'],
    'Class Name': 'RunShellScriptAction',
    'InputUUID': str(uuid.uuid4()), 'OutputUUID': str(uuid.uuid4()), 'UUID': str(uuid.uuid4()),
    'UnlocalizedApplications': ['Automator'],
    'isViewVisible': 1,
}
workflow = {
    'AMApplicationVersion': '2.10', 'AMDocumentVersion': '2',
    'actions': [{'action': action, 'isViewVisible': 1}], 'connectors': {},
    'workflowMetaData': {
        'serviceApplicationBundleID': 'com.apple.finder',
        'serviceApplicationPath': '/System/Library/CoreServices/Finder.app',
        'serviceInputTypeIdentifier': 'com.apple.Automator.fileSystemObject',
        'serviceOutputTypeIdentifier': 'com.apple.Automator.nothing',
        'serviceProcessesInput': False,
        'systemImageName': 'NSActionTemplate',
        'workflowTypeIdentifier': 'com.apple.Automator.servicesMenu',
    },
}
info = {
    'CFBundleIdentifier': 'community.finder-pdf.quick-action',
    'CFBundleName': 'Finder PDF',
    'CFBundleDevelopmentRegion': 'en',
    'CFBundleShortVersionString': manifest['version'],
    'NSServices': [{
    'NSMenuItem': {'default': '用 Obsidian 导出 PDF'},
    'NSMessage': 'runWorkflowAsService', 'NSIconName': 'NSActionTemplate',
    'NSRequiredContext': {'NSApplicationIdentifier': 'com.apple.finder'},
    'NSSendFileTypes': ['net.daringfireball.markdown'],
}]}
contents = args.output / 'Contents'
contents.mkdir(parents=True, exist_ok=True)
for name, data in [('document.wflow', workflow), ('Info.plist', info)]:
    with (contents / name).open('wb') as output:
        plistlib.dump(data, output)
print(args.output)
