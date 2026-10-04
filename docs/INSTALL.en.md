<p align="center"><img src="../addon/assets/mascot.png" width="64" alt="Paper Voice"></p>

<h1 align="center">Install Paper Voice</h1>

<p align="center"><a href="INSTALL.md">简体中文</a> · <b>English</b></p>
<p align="center">Download the complete package, install the voices and plugin, and start listening.</p>
<p align="center"><a href="../README.en.md">Product home</a> · <a href="GUIDE.en.md">User guide</a> · <a href="COMPATIBILITY.en.md">Compatibility</a></p>

## Before you start

For **Zotero 10**. The installer supports English and Simplified Chinese.

Download the complete ZIP for your computer from [Releases](https://github.com/JunyanKang/paper-voice/releases/latest), then extract it.

**Windows · Intel / AMD x64**: Open `Paper Voice Setup.exe` after extracting the complete Windows package.

**Mac · Apple Silicon, macOS 14+**: Open `Paper Voice Installer.app` after extracting the complete Mac package.

## 1. Install offline voices

Open the installer and choose **English** or **简体中文** at the bottom of the window. The default follows your system language.

Click **Install voices**. When **✓ Voices ready** appears beside step 1, the voice setup is complete. No account or separate voice download is required.

<p align="center"><img src="assets/installer-macos-en.png" width="560" alt="The installer shows Voices ready beside step one when setup is complete"></p>
<p align="center"><sub>Mac installer · Once Voices ready appears, add the Zotero plugin.</sub></p>

On Windows, keep the `Resources` folder beside the installer. On Mac, resources are included inside the app.

## 2. Add the plugin to Zotero

In Zotero, open **Tools → Plugins → gear → Install Plugin From File** and select the included `paper-voice-version.xpi` file.

## 3. Listen to your first passage

Open a PDF with selectable text and select a passage to listen and see its translation. Click the floating book mascot to choose a voice or reading mode. If auto-reading is off, use the reading button in the selection popup.

Selection translation is on by default and needs internet access. For fully offline use, turn off **Selection**, **Show translation** and **Read translation** under **Settings → Translate**.

Explore the [user guide](GUIDE.en.md) for reading modes, voice choices and translation.

<p align="center"><img src="assets/quick-start-en.png" width="900" alt="Paper Voice main reading panel"></p>
<p align="center"><sub>Select text in a PDF to start. The sample uses the Horizon theme.</sub></p>

## Updates

- **Upgrading from 1.2.5 or earlier:** download the latest complete package and run the installer to reinstall offline voices once.
- **Already installed a complete package from 1.2.6 or later:** update only the `.xpi` plugin. No voice download is needed.

Use **Check → Install update** in Settings, or download the `.xpi` from [Releases](https://github.com/JunyanKang/paper-voice/releases/latest) and install it through Zotero's plugin manager. The `updates.json` file is for automatic updates; you do not need to download it. After updating, reopen the same PDF and select **Resume** to continue an unfinished reading session.

## Installation help

**System security prompt:** The installer is not currently notarized with Apple Developer ID or signed with Windows Authenticode. Confirm that you downloaded it from this project's GitHub Releases. macOS provides the app-specific opening option in System Settings → Privacy & Security; Windows displays the source and publisher in its security prompt. You do not need to disable system-wide protection.

**Missing DLL on Windows:** Run `Resources/VC_redist.x64.exe` to install the Microsoft Visual C++ runtime, then try again.

**Missing installation files:** Extract the complete ZIP. Keep the Windows installer and its `Resources` folder together.

Downloads and plugin updates require access to GitHub. Voice synthesis works offline after installation; translation is optional and requires a network connection.

For help, open an [issue](https://github.com/JunyanKang/paper-voice/issues) with your OS version, Zotero version and the error message. Do not attach private papers or your personal Zotero database.

## Uninstall

Disable or remove Paper Voice in Zotero's plugin manager. Your papers and annotations are unaffected.

If you no longer need the offline voices, delete the following folder and its backups with the same name prefix:

- Mac: `~/Library/Application Support/Zotero/paper-voice-engine`
- Windows: `%APPDATA%\Zotero\Zotero\paper-voice-engine`

Personal settings and reading progress are stored in Zotero preferences under `extensions.paperVoice.*`.

---

[Product home](../README.en.md) · [User guide](GUIDE.en.md) · [Compatibility](COMPATIBILITY.en.md) · [Privacy](../PRIVACY.en.md)
