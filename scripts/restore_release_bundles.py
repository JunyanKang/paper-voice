"""Restore byte-identical release ZIPs from a checked baseline and a small delta."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def restore(delta, directory, tag, download=True):
    directory.mkdir(parents=True, exist_ok=True)
    with ZipFile(delta) as patch:
        manifest = json.loads(patch.read('manifest.json'))
        old, new = manifest['baseline'], manifest['target']
        if not all(re.fullmatch(r'\d+\.\d+\.\d+', v) for v in (old, new)) or tag != 'v' + new:
            raise ValueError('Invalid release versions')
        entries = manifest['archives']
        if sorted(e['platform'] for e in entries) != ['Windows-x64', 'macOS-arm64']:
            raise ValueError('Expected exactly the two supported platforms')
        for entry in entries:
            platform = entry['platform']
            baseline = directory / f'Paper-Voice-{old}-{platform}.zip'
            if download:
                subprocess.run(['gh', 'release', 'download', 'v' + old, '--repo',
                                'JunyanKang/paper-voice', '--pattern', baseline.name,
                                '--dir', str(directory), '--clobber'], check=True)
            if sha256(baseline) != entry['baselineSHA256']:
                raise ValueError('Baseline hash mismatch')
            output = directory / f'Paper-Voice-{new}-{platform}.zip'
            with baseline.open('rb') as source, output.open('wb') as target:
                for part in entry['parts']:
                    if 'patch' in part:
                        target.write(patch.read(part['patch']))
                    else:
                        offset, remaining = part['offset'], part['size']
                        if min(offset, remaining) < 0 or offset + remaining > baseline.stat().st_size:
                            raise ValueError('Invalid baseline slice')
                        source.seek(offset)
                        while remaining:
                            block = source.read(min(remaining, 8 * 1024 * 1024))
                            if not block:
                                raise ValueError('Truncated baseline')
                            target.write(block)
                            remaining -= len(block)
            if sha256(output) != entry['sha256']:
                raise ValueError('Restored package does not match the validated local ZIP')
            with ZipFile(output) as archive:
                if archive.testzip() is not None:
                    raise ValueError('Restored package is corrupt')
            print(output.name, entry['sha256'], 'verified', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('delta', type=Path)
    parser.add_argument('directory', type=Path)
    parser.add_argument('tag')
    parser.add_argument('--local', action='store_true')
    args = parser.parse_args()
    restore(args.delta, args.directory, args.tag, download=not args.local)
