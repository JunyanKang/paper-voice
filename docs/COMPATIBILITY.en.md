<p align="center"><img src="../addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">Compatibility & usage notes</h1>

<p align="center">Platform support, voice and translation behavior, and PDF processing limits.</p>
<p align="center"><a href="COMPATIBILITY.md">简体中文</a> · <b>English</b></p>
<p align="center"><a href="../README.en.md">Product home</a> · <a href="INSTALL.en.md">Installation</a> · <a href="GUIDE.en.md">User guide</a></p>

## Platforms

<div align="center">
<table align="center">
<thead><tr><th align="center">Component</th><th align="center">Supported target</th></tr></thead>
<tbody>
<tr><td align="center">Zotero plugin</td><td align="center">Zotero 10</td></tr>
<tr><td align="center">Mac offline voices</td><td align="center">Apple Silicon · macOS 14 or later</td></tr>
<tr><td align="center">Windows offline voices</td><td align="center">Intel / AMD x64</td></tr>
<tr><td align="center">Intel Mac, Windows ARM, Linux, older Zotero</td><td align="center">No validated installer currently provided</td></tr>
</tbody>
</table>
</div>

Mac native checks use Zotero 10.0.3 beta. Windows automation uses Windows Server 2022 x64 and official Zotero 10.0.3 beta, covering media decoding, playback timing, pause and completion events. Physical Windows speakers and headphones have not been checked on recipient hardware. These records describe validation scope, not a guarantee for every system and device.

Installers have passed automated checks on both platforms for custom paths, four-language speech synthesis, reuse, cancellation, corrupt-download rejection and repair. The Mac installer uses a local signature rather than Apple Developer ID notarization; Windows is not Authenticode-signed. See [installation help](INSTALL.en.md#1-download-the-installer) for system prompts.

## Voices

Kokoro-82M provides 14 local voices across English, Mandarin Chinese, Japanese and French. These are synthesized voices, not word-by-word recordings by a human narrator. Scientific abbreviations, gene names, formulas and uncommon terms may need pronunciation checks.

The installer supplies Misaki and Chinese/Japanese pronunciation resources, including UniDic-lite for Japanese. Language detection runs locally and can be overridden. Russian is available as a translation target, but not for speech. Technical terms, polyphonic characters and mixed-language passages can be misread. See [voice upgrades](INSTALL.en.md#updating-an-existing-installation) for older installations.

Common units are expanded for the reading language, including spaced numbers and units, μ/µ variants, squares, cubes and common compound units. Complex formulas, lost superscripts and unknown units still depend on the speech engine.

The first installation downloads the plugin, engine and voices. Speech then works offline; translation and update checks need a connection.

## PDF and positioning

- PDFs need extractable text. Run OCR on scanned documents first; OCR is not included.
- Reading order and selection positions depend on the text layer. Complex columns, headers, footnotes, formulas and unusual layouts can affect the result. Select a smaller passage when needed.
- English, Chinese, Japanese and French punctuation guides sentence boundaries. Unusual abbreviations and broken PDF lines may affect sentence starts.
- Audio is split at column and page boundaries, which may introduce a brief pause. There are no acoustic word-level timestamps.
- Continuous reading skips recognizable figure captions and pages without text. Titles, reference lists and unrecognized captions may still be read.
- Publication footers are recognized from page coordinates, font sizes and metadata labels, even when extraction interleaves them with other elements. Running heads and page numbers are also filtered where recognized. Mixed or unusual layouts may need selection-based reading.
- Citation filtering uses rules and cannot cover every format. Numeric brackets such as `[0, 1]` are skipped, including genuine numeric intervals with that format.

Highlights and translations are temporary overlays. They do not rewrite PDFs, library metadata or permanent annotations.

## Translation and connectivity

Selection translation is enabled by default. Selection scope completes partial words; Sentence and Paragraph expand to the containing passage. Show translation and Read translation are off by default; enabling either sends the current sentence and a prefetched next sentence. Turn off all three under **Settings → Translate** for offline reading.

<div align="center">
<table align="center">
<thead><tr><th align="center">Service</th><th align="center">Notes</th></tr></thead>
<tbody>
<tr><td align="center">Tencent</td><td align="center">Default; the current channel does not offer Traditional Chinese</td></tr>
<tr><td align="center">Microsoft</td><td align="center">Alternative service; supports Traditional Chinese</td></tr>
<tr><td align="center">Google</td><td align="center">Requires access to Google Translate; some networks may time out</td></tr>
</tbody>
</table>
</div>

Public channels may impose limits, change or become unavailable. Tencent and Microsoft do not depend on Google or OpenAI. Failed captions do not interrupt original-text narration; translated audio needs a successful translation first. Try another service when needed.

Machine translation assists reading and is not a professionally reviewed translation. Check technical terms and complex qualifications against the original. A compatible Translate for Zotero installation can provide its public API; Paper Voice also works independently.

Installers are hosted on GitHub Releases; plugins, voices and update metadata are hosted on GitHub Pages. Update requests do not contain paper text, and failures keep the existing plugin. See [Privacy](../PRIVACY.en.md).

## Optional LLM APIs

Model translation uses your own API key, separately from the free public channels. Provider presets and custom OpenAI-compatible endpoints are available; Claude uses Messages. Available models, regions and key types depend on the provider. MiniMax has been tested with real requests and streaming in Zotero. Other presets have protocol and adapter parsing checks, but have not all been tested with paid credentials.

Check important terms, numbers and conclusions against the original. Rate limits, reasoning and network conditions affect latency. Configuration steps are in the [translation guide](TRANSLATION.en.md).

---

[Product home](../README.en.md) · [User guide](GUIDE.en.md) · [Installation](INSTALL.en.md) · [Privacy](../PRIVACY.en.md)
