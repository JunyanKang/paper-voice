<p align="center"><img src="addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">Privacy</h1>

<p align="center">What stays on your computer, and when an external service is contacted.</p>
<p align="center"><a href="PRIVACY.md">简体中文</a> · <b>English</b></p>
<p align="center"><a href="README.en.md">Product home</a> · <a href="docs/GUIDE.en.md">User guide</a> · <a href="docs/INSTALL.en.md">Install or uninstall</a></p>

Paper Voice contains no telemetry, advertising, analytics SDK or user accounts. The plugin, offline speech and public translation channels are free. Optional LLM translation uses your own API key; provider fees apply.

## What stays on your computer

**Speech generation.** The source text or an already retrieved translation is passed to a local Kokoro process to generate audio. It is not uploaded to a speech service. Audio is held in memory, reused during repeat playback and released when the task ends.

**Settings and reading progress.** Zotero preferences store your voice, speed, reading mode, translation language, theme, transparency, caption font and size, mascot interaction settings, and the last reading position for each PDF. The position includes the page number and a short passage used to locate where to resume.

Unfinished sessions also save the reading mode, text position, selection or sentence/paragraph queue, and remaining repeats so they can resume after an update or restart. Stopping or completing a session clears that session record while retaining the last position. Translations are cached only in memory, up to 300 entries, and cleared on exit.

**Custom backgrounds.** Imported PNG, JPG and WebP images are cropped locally and re-encoded as JPEG without the original metadata. The processed image stays in your Zotero profile; it is not sent to a translation service or GitHub. You can remove it in Appearance settings.

**Original files.** The plugin does not write to PDFs, annotations or library metadata. Highlights and translations are temporary interface elements.

## When text is sent

Translation requires a connection to the service you select:

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">Feature</th>
  <th align="center">Default</th>
  <th align="center">Text sent</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center"><strong>Selection translation</strong></td>
  <td align="center">On</td>
  <td align="center">The selected scope; partial words are completed, and Sentence/Paragraph scopes expand to the containing passage</td>
</tr>
<tr>
  <td align="center"><strong>Captions</strong></td>
  <td align="center">Off</td>
  <td align="center">The current source sentence and a prefetched next sentence</td>
</tr>
<tr>
  <td align="center"><strong>Translated audio</strong></td>
  <td align="center">Off</td>
  <td align="center">The current source sentence and a prefetched next sentence</td>
</tr>
</tbody>
</table>

</div>

The service may be Tencent, Microsoft, Google or your configured LLM API. The provider can receive the text, your IP address and ordinary request information; its own privacy policy applies. The plugin does not upload the entire PDF file, annotations or library.

**For fully offline use:** turn off Selection translation, Captions and Translated audio under Settings → Translate.

When a compatible Translate for Zotero version is installed, Paper Voice first requests the chosen free service through its public interface. It does not read that plugin's keys or select paid services. If the interface is unavailable, it uses the same service's free public channel.

## LLM API keys

LLM translation is used only after you select and configure it. No shared key is included.

- Keys are stored in the current Zotero profile's encrypted login storage, not in preferences, debug logs, source code or release packages. You can remove them in Settings.
- Model names and endpoints are stored in preferences. Requests contain the translation text, target language and task instructions. The provider's privacy and billing policies apply.
- Custom endpoints must use HTTPS; local services may use HTTP. Keys in endpoint URLs are not accepted, and redirects carrying keys are not followed.

## Updates, links and removal

Zotero checks `kanglab.cool/paper-voice/updates.json` (hosted by GitHub Pages) and downloads the corresponding XPI. These requests do not send paper content. Guide, feedback and privacy links open the corresponding GitHub pages.

Disabling the plugin stops speech and removes temporary interface elements. After uninstalling, follow the [removal instructions](docs/INSTALL.en.md#uninstall) to clean up the voice package and preferences.

---

[Product home](README.en.md) · [User guide](docs/GUIDE.en.md) · [Install or uninstall](docs/INSTALL.en.md) · [Report an issue](https://github.com/JunyanKang/paper-voice/issues)
