<p align="right"><a href="README.md">简体中文</a> · <b>English</b></p>

<p align="center"><img src="docs/assets/paper-voice-hero.png" alt="Paper Voice — Read deeply. Listen naturally. For Zotero." width="960"></p>

<h1 align="center">Make room to listen.</h1>

<p align="center">Natural voices for your English papers, right inside Zotero.<br>Select a passage. Follow the thought. Stay with the original.</p>

<p align="center"><a href="https://github.com/JunyanKang/paper-voice/releases/latest"><b>Download Paper Voice</b></a> · <a href="docs/INSTALL.en.md">Installation</a> · <a href="#user-guide">User guide</a> · <a href="https://github.com/JunyanKang/paper-voice/issues">Feedback</a></p>

<p align="center"><sub>Free to use · Offline voices · US / UK English · Windows / macOS · Zotero 10</sub></p>

<br>

## A different rhythm for reading

**Select, then listen.** A sentence, a paragraph, an idea worth revisiting. Select text to start reading aloud. The floating mascot keeps controls close; the panel opens when you need it.

**From one sentence to the whole paper.** Start from the first page, the current page, your last position or a selected sentence. Highlighting, scrolling and page turns follow the reading.

**Keep meaning close.** Translation appears beside the sentence you're hearing and follows across columns and pages. Choose Tencent, Microsoft or Google, with eight target languages.

**Give difficult passages more time.** Repeat a paragraph or focus on one sentence. Choose from six English voices and adjust the speed. Common citation markers and figure references are skipped during narration.

<br>

## Find your voice

**American English** · Heart and Bella (female); Michael and Fenrir (male).

**British English** · Emma (female); George (male).

Voices run on your computer. No subscription, speech quota or API key. Install once, then listen offline.

<br>

## Start in three steps

**1 · Download**<br>
Choose the complete package for your computer from the [latest release](https://github.com/JunyanKang/paper-voice/releases/latest).

| Windows | Mac |
|:--|:--|
| [Windows x64 package](https://github.com/JunyanKang/paper-voice/releases/download/v1.2.5/Paper-Voice-1.2.5-Windows-x64.zip) | [Apple Silicon package](https://github.com/JunyanKang/paper-voice/releases/download/v1.2.5/Paper-Voice-1.2.5-macOS-arm64.zip) |
| Intel / AMD 64-bit computers | M-series chips · macOS 14 or later |

**2 · Install**<br>
Extract the ZIP, open the **Paper Voice installer** and choose **Install voices**. In Zotero's plugin manager, choose **Install Plugin From File** and add the included `.xpi`.

**3 · Listen**<br>
Open an English PDF and select some text. Click the floating book mascot to choose a voice, reading mode or translation service.

[View the installation guide →](docs/INSTALL.en.md)

**Already installed?** Choose **Check for updates** in the plugin settings. Routine updates only need the plugin; keep your existing voice pack.

<br>

## Designed for attention

Four modes support browsing, continuous reading and close listening. Compact controls, gentle highlighting and nearby translations keep your attention on the page.

The installer and plugin interface offer **English and Simplified Chinese**. Switch in settings independently of the translation language.

Speech is generated locally. Translation is optional. Your papers, PDFs and annotations stay unchanged.

[User guide](#user-guide) · [Compatibility & usage notes](docs/COMPATIBILITY.en.md) · [Privacy](PRIVACY.md) · [Release notes](CHANGELOG.md)

## User guide

### Choose how much to read

Click the floating book mascot in your PDF. Modes run from **Sentence → Selection → Paragraph → Document**. The floating mode button cycles in the same order; the active mode is highlighted.

- **Sentence**: Select text to focus on one sentence. Use Previous sentence, Replay sentence and Next sentence to navigate.
- **Selection**: Select exactly what you want to hear. Turn off automatic reading if you prefer to press Play. Read once, repeat 2, 3 or 5 times, or keep repeating.
- **Paragraph**: Select a paragraph and choose a repeat count. Previous paragraph, Replay paragraph and Next paragraph move through nearby paragraphs.
- **Document**: Read from the first page, current page, last position or a selected sentence. Navigation moves by paragraph, then continuous reading resumes.

**Switch modes without cutting off the audio.** Switching from Document to Paragraph or Sentence finishes the current paragraph or sentence, then stops. Switching to Document continues through the paper. Previous, Replay and Next jump immediately to the requested passage.

### Start where you want

In Document mode, choose **Selected sentence**, select a letter, word or sentence, then choose **Read from this sentence**. Reading starts at the sentence beginning, including sentences spanning columns or pages.

**Last position** remembers the most recent actual playback in this PDF, across all four modes. Ordinary clicks and scrolling do not interrupt continuous reading.

### Keep controls close

Collapse the panel to keep mode, navigation, pause, stop and translation controls beside the draggable mascot. Highlighting, scrolling and page turns follow the current passage.

- **Space**: Pause; press again to resume.
- **Esc**: Stop reading and clear the highlight and translation.
- **Option / Alt + P**: Pause or resume.
- **Option / Alt + T**: Show or hide translation.

Use shortcuts in the PDF reading area. Space remains normal text input in search fields and notes.

### Voices, translation and language

Open Settings to choose a voice, preview it and adjust speed from **0.60–1.60×**. Voice and speed changes take effect the next time you start playback.

**Follow-along translation** displays translated text near the passage being read and follows it across columns and pages. It does not read the translation aloud. Tencent is the default; Microsoft and Google are also available. Google requires network access to its service. Use Microsoft or Google for Traditional Chinese.

Choose **English, 简体中文 or System** for the interface. Set the translation language separately: Simplified or Traditional Chinese, Japanese, Korean, French, German, Spanish or Russian.

Common citation markers, author–year references and numbered figure/table references are skipped during narration, along with recognizable running headers, footers and publication details. The original PDF and annotations stay unchanged.

---

<p align="center"><img src="addon/assets/mascot.png" width="64" alt="Paper Voice book mascot"><br><b>Paper Voice</b><br><sub>Created by <a href="https://github.com/JunyanKang">Junyan Kang</a> · <a href="LICENSE">MIT License</a></sub></p>

<p align="center"><sub>Built with <a href="https://github.com/thewh1teagle/kokoro-onnx">Kokoro ONNX</a>, <a href="https://huggingface.co/hexgrad/Kokoro-82M">Kokoro-82M</a> and <a href="https://lucide.dev">Lucide</a>. Translation integration draws on <a href="https://github.com/windingwind/zotero-pdf-translate">Translate for Zotero</a>.</sub></p>
