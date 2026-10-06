<p align="center"><img src="../addon/assets/mascot.png" width="64" alt="Paper Voice"></p>

<h1 align="center">Compatibility & usage notes</h1>

<p align="center"><a href="COMPATIBILITY.md">简体中文</a> · <b>English</b></p>
<p align="center">Platform support, voice and translation behavior, and PDF processing limits.</p>
<p align="center"><a href="../README.en.md">Product home</a> · <a href="INSTALL.en.md">Installation</a> · <a href="GUIDE.en.md">User guide</a></p>

## Platforms

Paper Voice targets Zotero 10. Download installers are provided for Apple Silicon Macs running macOS 14 or later and Intel/AMD x64 Windows computers. Validated installers are not currently provided for Intel Macs, Windows ARM, Linux or earlier Zotero versions.

Mac native checks use Zotero 10.0.3 beta. Windows automation uses Windows Server 2022 x64 and official Zotero 10.0.3 beta, covering media decoding, playback timing, pause and completion events. Physical Windows speakers and headphones have not been checked on recipient hardware.

The new installers have passed automated checks on macOS and Windows for custom paths, actual four-language speech synthesis, reuse, cancellation, corrupt-download rejection and repair.

The Mac installer uses a local signature rather than Apple Developer ID notarization. The Windows installer is not Authenticode-signed. See [installation help](INSTALL.en.md#installation-help) for system prompts.

## Voices and PDFs

- Fourteen voices across English, Mandarin Chinese, Japanese and French use the local Kokoro-82M speech synthesis model. They are synthesized voices, not word-by-word recordings by a human narrator.
- Scientific abbreviations, gene names, formulas and uncommon terms may need pronunciation checks.
- PDFs need extractable text. Run OCR on scanned documents first; OCR is not included.
- Reading order and selection positions depend on the PDF text layer. Complex columns, headers, footnotes and equations can affect the result.
- English, Chinese, Japanese and French punctuation guides sentence boundaries. Unusual abbreviations or broken PDF text may affect where a sentence begins.
- Audio is split at column and page boundaries, which may introduce a short pause. There are no acoustic word-level timestamps.
- Continuous reading skips recognizable figure captions and pages without text. Titles, reference lists and unrecognized captions may still be read.
- Citation filtering uses rules and cannot cover every format. Numeric brackets such as `[0, 1]` are skipped, including genuine numeric intervals with that format.

Highlights and translations are temporary overlays. They do not rewrite PDFs or create permanent annotations.

Publication footers are recognized from page coordinates, font sizes and metadata labels, even when the extraction order interleaves them with other page elements. Recognizable bibliographic running heads and page numbers are also skipped. Unusual layouts or metadata mixed into body text may still need selection-based reading.

## Translation and connectivity

Selection translation is on by default and sends the chosen scope to your service: Selection completes partial words; Sentence and Paragraph expand to the containing passage. Captions and translated audio are off by default; enabling them sends the current sentence and a prefetched next sentence. Turn off all three options under **Settings → Translate** for fully offline reading. Tencent is the default; Microsoft and Google are alternatives. Use Microsoft, Google or a supporting LLM for Traditional Chinese.

These free public services may impose limits, change or become unavailable. Google requires a reachable network. Tencent and Microsoft do not depend on Google or OpenAI. Failed captions do not interrupt original-text narration. Translated audio requires a successful translation first; another service or target language may work.

Machine translation helps with reading but is not a professionally reviewed translation. Check technical terms and complex qualifications against the original. A compatible Translate for Zotero installation can provide its public translation API; Paper Voice also works independently.

Installers are hosted on GitHub Releases; plugins, voices and update metadata are hosted on GitHub Pages. Update requests do not include paper content, and failed updates keep the existing plugin. Speech synthesis works offline after installation.

The installer downloads Misaki and offline Chinese/Japanese dictionaries, including UniDic-lite. See the [upgrade guide](GUIDE.en.md#how-do-i-update) to check whether your voice pack needs replacing. Reading language is detected locally by default and can also be selected manually. Russian remains available for translation only. Technical terms, polyphonic characters and mixed-language text may need pronunciation checks.

## Optional LLM APIs

LLM translation uses your own API key and is separate from the free public translation channels. Domestic and international provider presets are included, with custom OpenAI-compatible endpoints and Anthropic Messages for Claude. Available models, regions and key types depend on the provider. MiniMax has been tested with real requests and streaming inside Zotero. Other presets have protocol and adapter parsing checks, but have not all been tested with paid credentials.

Model translations can contain mistakes or awkward wording; check important terms, numbers and conclusions against the original. Rate limits, reasoning and network conditions affect latency. See the [LLM translation guide](GUIDE.en.md#llm-translation).

---

[Product home](../README.en.md) · [User guide](GUIDE.en.md) · [Installation](INSTALL.en.md) · [Privacy](../PRIVACY.en.md)
