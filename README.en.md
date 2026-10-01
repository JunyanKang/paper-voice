<p align="right"><a href="README.md">简体中文</a> · <b>English</b></p>

<p align="center"><img src="docs/assets/paper-voice-hero.png" width="880" alt="Paper Voice — natural paper reading for Zotero"></p>

<h1 align="center">Make room to listen.</h1>

<p align="center">Listen to papers in Zotero, with highlighting to keep your place and translation close to the original.</p>
<p align="center">Free to use · Four languages · Offline voices · English and Chinese interface</p>
<p align="center"><a href="#download">Download</a> · <a href="#quick-start">Quick start</a> · <a href="#user-guide">User guide</a> · <a href="#common-questions">Common questions</a></p>

## Download

New to Paper Voice? Choose the complete package for your computer. It includes the installer, offline voices and Zotero plugin.

**Windows · Intel / AMD 64-bit computers**

[Download for Windows →](https://github.com/JunyanKang/paper-voice/releases/download/v1.2.12/Paper-Voice-1.2.12-Windows-x64.zip)

**Mac · Apple Silicon (M series), macOS 14 or later**

[Download for Mac →](https://github.com/JunyanKang/paper-voice/releases/download/v1.2.12/Paper-Voice-1.2.12-macOS-arm64.zip)

Already installed? Choose **Check for updates** in the plugin settings, or [download the `.xpi` plugin file](https://github.com/JunyanKang/paper-voice/releases/download/v1.2.12/paper-voice-1.2.12.xpi).

For Zotero 10. [Release notes](CHANGELOG.md) · [Compatibility notes](docs/COMPATIBILITY.en.md)

## Quick start

### 1. Install offline voices

Extract the complete ZIP and open the **Paper Voice installer**. Choose English or 简体中文, then select **Install voices**. When the green **✓ Voices ready** message appears beside step 1, move on to the next step.

<p align="center"><img src="docs/assets/installer-macos-en.png" width="600" alt="Paper Voice installer showing the green Voices ready confirmation beside the first step"></p>

On Windows, keep the installer and `Resources` folder together. On Mac, the voice resources are included inside the installer app.

### 2. Add the plugin to Zotero

In Zotero, open **Tools → Plugins → gear → Install Plugin From File** and select `paper-voice-1.2.12.xpi` from the package.

Using Zotero in Chinese? The menu is **工具 → 插件 → 从文件安装插件**. [Need more installation help?](docs/INSTALL.en.md)

### 3. Listen to your first passage

Open a PDF with selectable text. Paper Voice **detects the original language automatically**. **Select a passage and release the mouse to start listening.** Click the book mascot in the lower-right corner to open the controls; click × in the panel to collapse it.

<p align="center"><img src="docs/assets/quick-start-en.png" width="960" alt="English Paper Voice panel opened from the floating mascot, showing reading modes and repeat count"></p>
<p align="center"><sub>Start with the floating book mascot. The highlighted icon is your current mode; choose a repeat count to suit your reading.</sub></p>

## User guide

### Choose how much to read

The four modes run from **Sentence → Selection → Paragraph → Document**. Click an icon to switch; the mode button on the floating toolbar cycles in the same order.

While reading, **hover over the mode button** to open navigation. Document and Paragraph modes offer separate Sentence and Paragraph rows, each with Previous, Replay and Next. Sentence mode shows only sentence controls. The menu closes when you move away; pause, stop and translation stay in the toolbar. With the mode button focused, use ↑ / ↓ to enter navigation and Enter to activate a control.

Sentence navigation keeps your reading mode: Document continues forward; Paragraph reads from the target sentence to the end of its paragraph, then repeats the complete paragraph on subsequent cycles.

- **Sentence**: Select any part of a sentence to hear the complete sentence from the beginning. Use Previous sentence, Replay sentence and Next sentence to navigate.
- **Selection**: Hear exactly what you selected—a word, a sentence or a longer passage.
- **Paragraph**: Select any part of a paragraph to hear the complete paragraph from the beginning. Use Previous paragraph, Replay paragraph and Next paragraph to move through the paper.
- **Document**: Read from a chosen position to the end. Move by sentence or paragraph, then continue reading.

Sentence, Selection and Paragraph can read **once, 2, 3 or 5 times, or keep repeating**.

Switching modes keeps the current audio uninterrupted. Switching from Document to Sentence or Paragraph finishes the current sentence or paragraph, then stops. Switching to Document continues from your current position.

### Continue from the right place

After updating the plugin or restarting Zotero, reopen the same PDF to restore an unfinished reading session, paused. Click **Resume** or press **Space** to continue from the beginning of the interrupted sentence. Your mode, selected passage and remaining repeats are preserved. Sessions you stop or finish do not restore automatically.

Document mode offers four starting points: **First page, Current page, Last position and Selected sentence**.

To start at a specific sentence, choose **Selected sentence**, select a letter, word or the full sentence, then choose **Read from this sentence**. **Last position** returns to the most recent actual playback position in this PDF, across all four modes.

<p align="center"><img src="docs/assets/continuous-en.png" width="960" alt="Continuous reading with sentence highlighting, nearby translation, a starting-point selector and floating paragraph navigation controls"></p>
<p align="center"><sub>Highlighting marks the current passage; translation stays near the original. Collapse the panel to keep just the floating playback controls.</sub></p>

Scrolling, column changes and page turns follow the reading. Ordinary clicks and manual scrolling do not interrupt Document mode. Use the navigation buttons when you want to jump to another passage.

### Control playback with your keyboard

Use these keys in the PDF reading area while playing or paused:

| Action | Mac | Windows |
|---|---|---|
| Pause / resume | Space | Space |
| Stop reading | Esc | Esc |
| Previous / next sentence | ↑ / ↓ | ↑ / ↓ |
| Previous / next paragraph | Option + ↑ / ↓ | Alt + ↑ / ↓ |
| Replay current sentence | ← | ← |
| Replay current paragraph | → | → |
| Show / hide translation | Option + T | Alt + T |

After a jump, Document mode continues reading. Paragraph shortcuts read the complete target paragraph; in Selection mode, navigation expands the passage to a full sentence or paragraph. Option + P (Windows: Alt + P) also pauses or resumes.

Keys keep their normal behavior in search, notes, and settings controls. When the navigation menu has focus, ↑ / ↓ selects a button and Enter activates it.

The panels use lightly translucent frosted glass and soft fades. Adjust **Transparency** in Settings for all floating surfaces; 0% is fully opaque. Text and controls stay clear. The book companion has five reading gestures and five idle gestures, appearing about once every five minutes. System Reduce Motion disables these interactions. Under **Appearance → Companion gestures**, turn automatic gestures off or select **Preview** to see one immediately. Hovering over the companion immediately plays the next gesture and restarts the timer. Each set shuffles five gestures without repeats within a round; the companion keeps its latest pose after each gesture. Set **Gesture interval** to 1, 3, 5, 10, 15 or 30 minutes; changes restart the timer and are saved.

### Choose a voice and turn on translation

Click **Settings** in the panel’s upper-right corner and choose **Voice**, **Translation** or **Appearance**. Playback and settings share one fixed-size frame in both interface languages. **Text language** defaults to Auto-detect; you can also choose a language manually. Pick a voice and select **Preview voice** to hear it. Adjust speed from **0.60–1.60×**; voice and speed changes take effect the next time you start reading.

Under **Appearance**, choose Porcelain, Botanical, Tidal, Amber or Midnight. Panels, controls and translation captions change together. Import a PNG, JPG or WebP for a personal background; Paper Voice crops and compresses it, then adds a contrast-protecting tint. Images stay on your device. Switch back to a preset or remove your image at any time.

<p align="center"><img src="docs/assets/settings-voice-en.png" width="280" alt="Voice settings"> <img src="docs/assets/settings-translation-en.png" width="280" alt="Translation settings"> <img src="docs/assets/settings-appearance-en.png" width="280" alt="Appearance settings"> </p>
<p align="center"><sub>Voice, Translation and Appearance share the same compact frame. Click a screenshot to see it at full size.</sub></p>

**American English**: Heart and Bella (female); Michael and Fenrir (male).<br>
**British English**: Emma (female); George (male).<br>
**Chinese (Mandarin)**: **Yunxi** (male) by default; also Yunjian (male), Xiaobei and Xiaoxiao (female).<br>
**Japanese**: **Tebukuro** (female) by default; also Alpha (female) and Kumo (male).<br>
**French**: Siwis (female).

Language detection runs locally. Short selections use the surrounding PDF text; mixed-language passages can switch voices automatically. Uncertain or unsupported languages prompt you to choose manually. Each language remembers your last voice. Preview voice plays a sample in the selected reading language.

**Show translation** displays a translation near the passage being read. **Read translation** plays only the translation while the original PDF stays highlighted and in view. It supports Chinese (Simplified and Traditional), Japanese, French and English, with a voice matching the target language. Other languages remain available for displayed translation. Tencent is the default; Microsoft and Google are also available. Google requires access to its service. Use Microsoft or Google for Traditional Chinese.

The floating translation button shows the target language: **简 / 繁 / 日 / 한 / FR / EN / DE / ES / RU**. **Click** to cycle through the languages supported by the selected service; **double-click** to hide translation. Clicking while translation is off selects the next language and shows it again. The background indicates whether translation is on. Option / Alt + T still toggles it directly.

Hover over the floating **translation button** to reveal **Read translation**. Click to hear the translation; click again to hear the original. During playback, changes take effect at the next sentence. Displayed translation and translated audio have independent switches.

Captions use a compact 12 px size by default. Choose a font and a size from 10–20 px in **Caption font**; changes apply immediately and are saved.

Translation languages include Simplified Chinese, Traditional Chinese, Japanese, Korean, French, English, German, Spanish and Russian. Set the interface independently to **English, 简体中文 or System**.

<sub>Settings screenshots show Paper Voice 1.2.12; other screenshots show Paper Voice 1.2.6 on macOS with a purpose-made demonstration document. Windows has the same plugin controls; system menus may look different. Click an image to see it at full size.</sub>

## Common questions

<details>
<summary><b>Do voices need the internet, a subscription or a separate Python installation?</b></summary>

No. The complete package includes the Kokoro speech engine, models and runtime. Once installed, it generates speech locally without using your operating system’s built-in voices. No speech subscription or API key is needed. Translation and plugin updates use the internet.

</details>

<details>
<summary><b>Why are some citation markers not read aloud?</b></summary>

Paper Voice skips recognizable numeric citations, author–year references, figure/table references, identifiable figure captions and publication details to make narration easier to follow. It only processes the text used for speech; your PDF and annotations stay unchanged.

</details>

<details>
<summary><b>What should I check if selecting text produces no sound?</b></summary>

First, check that the PDF has selectable text; scanned pages need OCR. Then preview a voice in Settings to check that the voices are installed, and check your computer’s volume and output device. If automatic reading is off, select text and press Play.

</details>

<details>
<summary><b>Do I need the complete package for every update?</b></summary>

**The multilingual voices in 1.2.6 need a one-time download and installation of the new complete package.** The earlier voice pack still supports English. For routine plugin updates afterward, choose Check for updates in Settings, or install the latest `.xpi`. Your existing voice pack continues to work unless the release notes say otherwise. The plugin uses `updates.json` automatically; you do not need to download it.

</details>

---

[Installation help](docs/INSTALL.en.md) · [Compatibility notes](docs/COMPATIBILITY.en.md) · [Privacy](PRIVACY.md) · [Report an issue](https://github.com/JunyanKang/paper-voice/issues)

Created by [Junyan Kang](https://github.com/JunyanKang) · [MIT License](LICENSE)

<sub>Language detection uses <a href="https://github.com/komodojp/tinyld">TinyLD</a>. Chinese and Japanese pronunciation uses <a href="https://github.com/hexgrad/misaki">Misaki</a> and bundled dictionaries. Voices powered by <a href="https://github.com/thewh1teagle/kokoro-onnx">Kokoro ONNX</a> and <a href="https://huggingface.co/hexgrad/Kokoro-82M">Kokoro-82M</a>. Icons by <a href="https://lucide.dev">Lucide</a>. Translation integration draws on <a href="https://github.com/windingwind/zotero-pdf-translate">Translate for Zotero</a>.</sub>
