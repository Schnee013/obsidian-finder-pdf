import json
import plistlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent


class FinderActionTests(unittest.TestCase):
    def generate(self, vault, output):
        return subprocess.run([sys.executable, str(ROOT / 'scripts/finder-action.py'),
                               '--vault', vault, '--output', str(output)],
                              capture_output=True, text=True)

    def test_finder_service_and_version(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'Finder PDF.workflow'
            result = self.generate('Example Vault', output)
            self.assertEqual(result.returncode, 0, result.stderr)
            info = plistlib.loads((output / 'Contents/Info.plist').read_bytes())
            workflow = plistlib.loads((output / 'Contents/document.wflow').read_bytes())
            manifest = json.loads((ROOT / 'manifest.json').read_text())
            self.assertEqual(info['CFBundleShortVersionString'], manifest['version'])
            service = info['NSServices'][0]
            self.assertEqual(service['NSRequiredContext']['NSApplicationIdentifier'], 'com.apple.finder')
            self.assertEqual(service['NSSendFileTypes'], ['net.daringfireball.markdown'])
            self.assertEqual(workflow['workflowMetaData']['serviceApplicationBundleID'], 'com.apple.finder')
            self.assertEqual(len(workflow['actions']), 1)

    def test_vault_name_is_encoded_as_data(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'Finder PDF.workflow'
            vault = "中文 Vault ' & $(echo unsafe)"
            result = self.generate(vault, output)
            self.assertEqual(result.returncode, 0, result.stderr)
            workflow = plistlib.loads((output / 'Contents/document.wflow').read_bytes())
            params = workflow['actions'][0]['action']['ActionParameters']
            script = params['COMMAND_STRING']
            self.assertIn('vault=' + quote(vault, safe='') + '&source=${encoded_file}', script)
            self.assertNotIn('$(echo unsafe)', script)
            self.assertIn('/usr/bin/open -g -j -a Obsidian', script)
            self.assertEqual(params['source'], script)
            self.assertEqual(params['inputMethod'], 1)

    def test_invalid_bundle_extension_does_not_create_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'incorrect.app'
            result = self.generate('Example Vault', output)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(output.exists())
