# Build and release

Paper Voice publishes two user-facing assets: a macOS DMG and a Windows EXE. The plugin, update feed and verified voice chunks are served separately through GitHub Pages.

## Plugin

```sh
python3 scripts/build.py
python3 scripts/release_metadata.py
```

The XPI includes only `addon/`. ZIP timestamps and permissions are normalized so separate platform builds produce identical bytes. `release_metadata.py` checks the manifest and writes the actual SHA512 into `updates.json`.

## Download service

```sh
python3 scripts/prepare_downloads.py
python3 scripts/stage_distribution.py --preserve-published
```

The current runtime source is the validated macOS and Windows ZIPs from release **1.3.10**, downloaded into `dist/`. Keep that historical release available. `prepare_downloads.py` extracts licensed runtimes, produces shared voice models plus platform engines, splits them into 32 MiB chunks, and writes SHA256 inventories in `installers/runtime-*.json`. Generated runtime files are not committed.

The **Publish download service** workflow performs this preparation and deploys `.build/download-site/`. It verifies that runtime manifests match the committed copies. User-facing XPIs are exported to the system Downloads folder under Paper Voice; download chunks remain in the internal cache. Quiet tests require an explicit `--plugin-dir` to avoid the real Downloads folder.

Versioned XPIs are recorded in `catalog.json`; subsequent deployments retain older XPI URLs so existing installers remain usable. This deployment currently retains the same versioned voice runtime. If changing the runtime ID, retain the previous runtime chunks as well before publishing a new installer. The staging script enforces a 950 MiB site limit; migrate binary hosting before exceeding it.

GitHub Pages uses the account's custom domain redirect. Test the full HTTPS redirect chain, not just the first response. The plugin manifest points to the Pages `updates.json` feed.

## Native installers

After building the XPI, run on each target platform:

```sh
python scripts/build_installer.py
python scripts/validate_installation.py
```

Mac builds require Xcode command line tools on Apple Silicon. Windows builds use the .NET Framework compiler and WinForms. The output is `dist/Paper-Voice-<version>-macOS.dmg` or `dist/Paper-Voice-<version>-Windows.exe`. The installers contain only their UI, fonts, configuration, licenses and installation helper; no voice runtime or XPI is embedded.

Both interfaces share a 640 × 510 layout, the bundled Voice Sans subset, three download rows and fixed footer positions. Help and language occupy the left group; Plugin only / Cancel and the primary action occupy the right group. Source lives in `installers/macos/Installer.swift` and `installers/windows/Installer.cs`. Font licenses are in `installers/assets/`.

**Validate download installers** builds and runs both platforms. Acceptance checks use disposable paths, including spaces and Chinese characters, and cover plugin-only behavior, cancellation, four-language speech synthesis, reuse, missing or corrupt downloads, repair and cleanup. Artifacts include installers and native screenshots; test reports are workflow artifacts only.

`--quiet`, `--package-dir`, `--destination`, `--pointer`, `--download-dir`, `--plugin-dir` and `--screenshot` exist for isolated validation. With no `--package-dir`, the actual HTTPS downloader is exercised. Never point validation at a user's existing voices.

## Publish checklist

1. Set the same version in `package.json` and `addon/manifest.json`; update the changelog and bilingual product documents.
2. Build and deploy the download service. Download the public XPI and compare it with the embedded installer hash and public update hash.
3. Validate native installers on both platforms, inspect screenshots, and test the plugin in an isolated Zotero profile. Exercise manual/automatic voice paths and the updater.
4. Create a release containing **only the DMG and EXE** as uploaded assets. Download both public assets and compare their hashes. GitHub's automatic source archive links are separate from uploaded assets.
5. Do not publish test profiles, test reports, voice chunks, XPI or update JSON as current release attachments.

Old clients through **1.3.10** use the previous Releases update URL. Because the new release contains only installers, these users must run the new installer once with **Plugin only** and install its XPI to migrate. Voices from **1.2.5 or earlier** require a full voice update. Future plugin updates preserve the configured voice location and reading progress.

`scripts/package_release.py` and **Restore release bundles** are historical pre-1.4 tooling. The ZIP packager refuses current versions. Rebuilding a historical package should use its historical checkout.

Developer ID notarization and Authenticode signing require the publisher's own certificates. Current builds do not claim these signatures.
