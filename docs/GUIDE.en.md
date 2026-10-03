# Paper Voice user guide

[Product home](../README.en.md) · [简体中文](GUIDE.md) / **English** · [Installation help](INSTALL.en.md)

Start with a selected passage, then find your own pace for a whole paper. This guide covers reading, translation and settings in the order you will use them.

## Contents

1. [Your first reading](#your-first-reading)
2. [Choose a reading mode](#choose-a-reading-mode)
3. [Read continuously and resume](#read-continuously-and-resume)
4. [Pause, navigate and replay](#pause-navigate-and-replay)
5. [Choose a language and voice](#choose-a-language-and-voice)
6. [See or hear a translation](#see-or-hear-a-translation)
7. [LLM translation](#llm-translation)
8. [Make the interface yours](#make-the-interface-yours)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [Updates and common questions](#updates-and-common-questions)

## Your first reading

### Install the voices and plugin

Choose a complete package for your computer on the [download page](../README.en.md#download), extract it, and open the installer. Select **Install voices**. Once **Voices ready** appears, open **Tools → Plugins → gear → Install Plugin From File** in Zotero and select the included `.xpi`.

<p align="center"><img src="assets/installer-macos-en.png" width="560" alt="Mac installer: install offline voices first, then add the plugin to Zotero"></p>
<p align="center"><sub>Figure 1 · Choose English or Chinese in the installer. The completion status appears beside the first step.</sub></p>

On Windows, keep the `Resources` folder beside the installer. See [Installation help](INSTALL.en.md) for detailed steps, system prompts and uninstall instructions.

### Select a passage

1. Open a PDF with **selectable text** in Zotero.
2. Select some body text and release the mouse to start listening.
3. Click the **book mascot** in the lower-right corner to open the panel, choose a reading mode or enter Settings.

<p align="center"><img src="assets/quick-start-en.png" width="960" alt="Paper Voice main panel over a PDF, with four reading modes, a repeat setting and playback controls"></p>
<p align="center"><sub>Figure 2 · Choose what to read in the main panel. Floating controls remain available when you close the panel.</sub></p>

If you prefer to see the translation before listening, turn off **Auto-read selection** in **Settings → Voice**. Select text, then click **Read aloud** in its popup. In Document mode with a selected-sentence start, the action is **Read from this sentence**.

## Choose a reading mode

The four modes appear at the top of the main panel. The active mode is highlighted.

| Mode | What it reads | Useful for |
|---|---|---|
| **Sentence** | Select a letter or word to hear its whole sentence | Studying a long sentence or practicing pronunciation |
| **Select** | Only the text you selected | A word, phrase or custom passage |
| **Paragraph** | Select any text in a paragraph to hear the whole paragraph | Following an argument or reviewing a key passage |
| **Document** | From your chosen starting point to the end | Listening continuously or returning to a paper |

**To repeat a passage:** In Sentence, Select or Paragraph mode, set Repeat to once, 2, 3, 5 times, or Loop. Select Stop or press Esc to end playback.

**To change modes while listening:** Choose a mode in the panel, or click the floating mode button to cycle through them. The current audio is not cut off: switching from Document to Sentence or Paragraph finishes the current sentence or paragraph, then ends. Switching to Document continues onward from the current passage.

You can switch modes while paused. Resume to finish the current sentence or paragraph in the new mode; switching to Full text continues through the document.

Scroll inside the source preview to read long text in full. Scrollbars stay hidden. Pausing or resuming preserves your scroll position; a new sentence starts at the top.

## Read continuously and resume

### Choose where to begin

In **Document** mode, use **Start at**:

| Starting point | What happens |
|---|---|
| **First page** | Starts at the beginning of the document |
| **Current page** | Starts with the body text on the current page |
| **Last position** | Returns to the most recent position in this PDF, including reading in Sentence, Select or Paragraph mode |
| **Selected sentence** | Starts at the beginning of the sentence containing your selection |

To listen from a specific sentence onward: choose **Selected sentence** → select a word in that sentence → click **Read from this sentence**. The button shows preparation and playback status, and the popup and mouse selection clear when audio starts, leaving the current sentence highlighted. If reading cannot start, a status message explains why and the selection button lets you retry.

<p align="center"><img src="assets/continuous-en.png" width="960" alt="Document mode starting from a selected sentence, with source highlighting and translation nearby"></p>
<p align="center"><sub>Figure 3 · Source highlighting and nearby translation help you keep your place during continuous reading.</sub></p>

### Follow the text and keep your place

The current passage is highlighted as the view scrolls, moves between columns and turns pages. An ordinary click elsewhere in the PDF does not end continuous reading; use Pause when you want a break.

After restarting Zotero or updating the plugin, reopen the same PDF and select **Resume** to continue an unfinished session. You can also choose **Last position** in Document mode.

Paper Voice skips recognizable citations, figure captions, headers, footers and publication details while retaining meaningful explanatory figure references. These changes apply only to listening; your PDF and annotations stay unchanged.

## Pause, navigate and replay

Once reading starts, use the floating controls in the lower-right corner without keeping the main panel open.

| Control | How to use it |
|---|---|
| **Mode button** | Click to cycle reading modes |
| **Pause / resume** | Click to pause or resume; hover for sentence and paragraph navigation |
| **Stop** | End the current playback |
| **Translation button** | Click to change language; double-click to hide translations; hover to switch original or translated audio |
| **Book mascot** | Open or close the main panel |

Hover over the **pause / resume button**, then move into the expanded navigation area:

- **Sentence row:** previous sentence, replay sentence, next sentence.
- **Paragraph row:** previous paragraph, replay paragraph, next paragraph; available in Document and Paragraph modes.

<p align="center"><img src="assets/pause-navigation-en.png" width="420" alt="Hovering over Pause reveals sentence and paragraph controls; the mode button switches reading modes"></p>
<p align="center"><sub>Hover over Pause / resume for navigation; clicking still pauses or resumes playback.</sub></p>

For example, if you miss a sentence during continuous reading, choose Replay sentence to hear it again without switching to Sentence mode. You can also use the [keyboard shortcuts](#keyboard-shortcuts).

## Choose a language and voice

Open **Settings → Voice**.

<p align="center"><img src="assets/settings-voice-en.png" width="420" alt="Voice settings with automatic language detection, voice selection, speed, automatic reading and a preview button"></p>
<p align="center"><sub>Figure 4 · Preview a voice, then adjust the pace to suit your listening.</sub></p>

1. **Text language:** **Auto** detects the language from the PDF. You can also choose English, Mandarin Chinese, Japanese or French. Manual selection helps with short passages or mixed-language text.
2. **Voice:** Choose from the voices for that language. English offers US and UK accents, with male and female voices. Mandarin defaults to Yunxi; Japanese defaults to Tebukuro.
3. **Speed:** Adjust the slider. Start reading again to use a newly selected voice or speed.
4. **Preview voice:** Hear a short sample before making your choice.

The complete package includes offline voices that generate speech on your computer. They do not depend on your system's built-in voices, and require no subscription or API key.

## See or hear a translation

### Translate a selection

Select a word, phrase or passage to see its translation beside the selection, with a separate reading button below it. The popup does not repeat the original text. Its header shows the target language; preparation feedback and **Retry translation** indicate progress or a failed request. You can still listen to the original if translation fails. Start reading directly from the popup without opening the main panel. When audio starts, the popup and mouse selection clear, while the current sentence remains highlighted.

Choose these independently in **Settings → Translate**:

| Option | What it does | Default |
|---|---|---|
| **Selection** | Translate the text you select | On |
| **Show translation** | Show translations near the source during playback | Off |
| **Read translation** | Play only translated audio while highlighting the original | Off |

Use the **Selection / Sentence / Paragraph** buttons beside the target language to choose what to translate:

| Scope | Translated content |
|---|---|
| **Selection** | Your selected text, with incomplete edge words completed for alphabetic scripts |
| **Sentence** | The complete sentence containing your selection |
| **Paragraph** | The complete paragraph containing your selection |

The scope is remembered for future selections. It is independent of the reading mode and does not interrupt playback.

<p align="center"><img src="assets/selection-translation-en.png" width="318" alt="A compact selection popup shows the translation above a separate reading action"></p>

Open **Settings → Translate** to choose a service and target language.

<p align="center"><img src="assets/settings-translation-en.png" width="420" alt="Translation settings with separate display and audio switches, service, target language and caption font and size"></p>
<p align="center"><sub>Figure 5 · Showing a translation and reading it aloud are separate choices.</sub></p>

### Listen to the original and read the translation

Turn on **Show translation** to show its language button in the floating controls; turning it off also hides the button. Translated text appears near the current source passage and follows the reading position. This setting alone does not play translated audio.

Text translation targets include Simplified Chinese, Traditional Chinese, Japanese, Korean, French, English, German, Spanish and Russian. Adjust **Caption font** and **Caption size** on the same page.

The font list uses families installed on your computer. In the Chinese interface, fonts that support Chinese appear first. Within each group, frequently selected fonts come first, followed by alphabetical order. Your choice and usage history stay on your computer and survive updates. Scroll the list or type a font name’s first letters to find it.

### Listen only to the translation

Turn on **Read translation** to hear translated sentences while the PDF's original text remains highlighted and in view. Turn it off to return to the original audio. Changes during playback apply from the next sentence. A small headphone mark below the translation language shows that translated audio is enabled; the settings switch and compact hover button update it together.

Chinese audio reads quantities by value: `78,000–89,000` becomes “七万八千至八万九千,” while the displayed numbers stay unchanged. Common retinal terms use consistent Chinese names, such as “米勒细胞” for `Müller cells`. Numeric ranges are protected from translation into multiplication.

Translated audio supports Chinese, Japanese, French and English. Other target languages are available as text but do not have an offline voice.

### Switch from the floating controls

- **Click the translation button:** cycle through target languages; its language label changes to match.
- **Double-click:** hide translations.
- **Hover:** reveal the compact headphone button, then click to choose translated or original audio. Gray means original audio; the theme accent means translated audio.
- **Option + T on Mac / Alt + T on Windows:** show or hide translations without changing the target language.

<p align="center"><img src="assets/translation-audio-en.png" width="340" alt="Compact headphone button: theme accent indicates translated audio"></p>

### Choose a translation service

| Service | When to choose it |
|---|---|
| **Tencent** | The default, intended for mainland China |
| **Microsoft** | For Traditional Chinese, or as an alternative when another service cannot connect |
| **Google** | When your network can access Google Translate |

Use Microsoft, Google, or an LLM supporting Traditional Chinese for that target. Selection translation sends the text expanded to your selected scope to your chosen service; captions and translated audio send the current sentence and a prefetched next sentence. Turn off all three translation options for fully offline reading. If a free service is unavailable, switch services or try again later. [Privacy details](../PRIVACY.md)

## LLM translation

To translate with your own model, choose **Settings → Translate → Service → LLM · API**. The free Tencent, Microsoft and Google services remain available without an API key.

<p align="center"><img src="assets/settings-llm-en.png" width="420" alt="LLM settings with provider, model, API URL, masked key input and Save & test"></p>

### Connect in three steps

1. **Choose a provider.** Presets include MiniMax, DeepSeek, Qwen, Doubao, GLM, Kimi, Hunyuan, Qianfan, OpenAI, Claude and Gemini, plus a custom OpenAI-compatible endpoint.
2. **Enter your API key.** Get the key from the provider’s console. Presets fill the API URL and a suggested model; edit either for your region or account. Some services, including Doubao, require the model or endpoint ID shown in their console.
3. **Select Save & test.** The plugin translates a sample sentence and displays the connection status and completion time. Hover over a successful result to see the sample translation. Once saved, selection translation, captions and translated audio all use this service.

Translations appear progressively and are cached. Results from an older scope cannot overwrite a newer selection. First calls, long text, reasoning and network conditions affect the wait; a Flash or fast model is often a better choice for reading.

### Keys and costs

- Keys stay in the encrypted login store of the current Zotero profile. A saved key is never restored into the input. Leave it blank to keep the saved key, or select the trash icon to remove it.
- Only the chosen text, target language and translation instructions go to your API. The PDF file, annotations and library are not uploaded. Continuous translation may prefetch the next sentence.
- This is optional. Billing, subscription quotas and model access belong to the provider; app subscriptions and API access may differ. Use a key supported by your chosen endpoint.
- For access errors, check your key and plan. For quota errors, wait or switch to a free service. For an unknown model, check its exact ID in the console. Paper Voice never switches automatically to another paid provider.

Domestic APIs can be configured for mainland China without routing through an overseas service. Availability of international APIs depends on your network and the provider’s regional requirements. Verify technical terms, numbers and important conclusions against the original text.

The integration uses [OpenAI-compatible Chat Completions](https://platform.openai.com/docs/api-reference/chat/create), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages) for Claude, and [Gemini’s official OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai). The configuration follows familiar patterns such as [Immersive Translate’s API settings](https://immersivetranslate.com/en/docs/services/openai/). Presets are configuration aids; available models are determined by each provider’s console.

## Make the interface yours

Open **Settings → Style**.

<p align="center"><img src="assets/settings-appearance-en.png" width="420" alt="Appearance settings with five themes, image import, transparency, interface language and companion gestures"></p>
<p align="center"><sub>Figure 6 · Themes and interface preferences are together on one page, with changes visible immediately.</sub></p>

| To change… | Use… |
|---|---|
| **Colors** | Porcelain, Botanical, Tidal, Amber or Midnight; Tidal is the default |
| **Your background** | Import image accepts PNG, JPG and WebP files stored only on your computer. Use My image to return to it, or Remove to delete it |
| **Caption position** | Below text by default, or above it. Caption width follows the actual local text area and leaves the active source visible |
| **Transparency** | Move the slider; higher values make the background more transparent while text and controls remain clear |
| **Interface language** | Choose 简体中文, English, 日本語, Français, Deutsch or System; this does not change the reading or translation language |
| **Companion** | Turn gestures on or off, choose an interval, or select Preview. Hovering over the mascot also triggers a gesture |

**System** follows Zotero’s language, with English as the fallback for unsupported languages. Switching languages keeps the panel size unchanged.

Translation font and size are under **Settings → Translate**.

Speech expands common measurements, decimal points and scientific scripts: `per mm²` becomes “per square millimeter” and `0.5` becomes “zero point five.” Chemical formulas and variable indices are handled separately. PDF text and highlights stay unchanged.

The mascot uses five gestures in each of its idle and reading sets: page turning, a somersault, sitting cross-legged, stretching, picking up a microphone and giving a thumbs-up. It keeps the final pose. After about 30 minutes of active reading, a brief remove-and-replace-headphones gesture takes priority without pausing audio. Interactions respect the system’s Reduce Motion setting.

## Keyboard shortcuts

Use these in the **PDF reading area while playing or paused**. Keys keep their normal behavior in search fields, notes and settings.

| Action | Mac | Windows |
|---|---|---|
| Pause / resume | Space | Space |
| Stop reading | Esc | Esc |
| Previous / next sentence | ↑ / ↓ | ↑ / ↓ |
| Previous / next paragraph | Option + ↑ / ↓ | Alt + ↑ / ↓ |
| Replay current sentence | ← | ← |
| Replay current paragraph | → | → |
| Show / hide translation | Option + T | Alt + T |

Start with three: **Space to pause, ↓ for the next sentence, ← to hear this sentence again**.

### Customize keys

Open **Settings → Keys**, click a key on the right, then press your preferred combination. Click elsewhere to cancel. While recording, × clears that action; **Reset defaults** restores every key.

<p align="center"><img src="assets/settings-shortcuts-en.png" width="420" alt="Custom shortcut settings"></p>

**Your latest change takes priority.** If another action already uses the key, it moves to the key you just freed. If no key was freed, that action becomes **Unassigned**. The message below shows the adjustment. Custom keys survive restarts and plugin updates. Common system combinations get a warning; other system or Zotero shortcuts may not be detected in advance.

## Updates and common questions

### How do I update?

Enable **Auto-update** at the bottom of Settings for Zotero to check periodically, or select **Check → Install update**. Downloads and updates require access to GitHub.

- **Upgrading from 1.2.5 or earlier:** download the latest complete package and run the installer to reinstall offline voices once.
- **Already installed a complete package from 1.2.6 or later:** update only the `.xpi` plugin. No voice download is needed.

You can also download the `.xpi` from [Releases](https://github.com/JunyanKang/paper-voice/releases/latest) and install it through Zotero's plugin manager. The `updates.json` file is for automatic updates; you do not need to download it.

### Selecting text produces no sound

Check that the PDF has selectable text; scanned pages need OCR first. Preview a voice in Settings, then check your computer's volume and output device. If automatic reading is off, select text and press Play. If voices are missing, run the installer again.

### No translation appears

For the selection popup, enable **Selection**; for translations during playback, enable **Show translation**. Check your connection and target language, or click **Retry translation** in the popup. Google must be reachable from your network; Tencent does not currently support Traditional Chinese, so choose Microsoft for that target.

### The reading language is wrong

Choose the language manually under **Settings → Voice → Text language**. The interface language, source reading language and translation target are independent settings.

### Text is skipped, read in the wrong order or not filtered

Columns, text encoding and unusual PDF layouts can affect recognition. Try a smaller passage in Select mode. If the problem remains, open an [issue](https://github.com/JunyanKang/paper-voice/issues) with the page number, original sentence, reading mode and version information. Do not share unpublished papers or your personal library publicly.

---

[Back to contents](#contents) · [Product home](../README.en.md) · [Install or uninstall](INSTALL.en.md) · [Compatibility](COMPATIBILITY.en.md) · [Privacy](../PRIVACY.md)
