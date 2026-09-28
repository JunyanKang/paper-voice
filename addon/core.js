/* Pure text and selection logic; shared with regression tests. */
var PaperVoiceCore = (() => {
  const voices = [
    { id: 'af_heart', label: '美音 · 女声 Heart', accent: 'US', gender: 'female' },
    { id: 'af_bella', label: '美音 · 女声 Bella', accent: 'US', gender: 'female' },
    { id: 'am_michael', label: '美音 · 男声 Michael', accent: 'US', gender: 'male' },
    { id: 'am_fenrir', label: '美音 · 男声 Fenrir', accent: 'US', gender: 'male' },
    { id: 'bf_emma', label: '英音 · 女声 Emma', accent: 'GB', gender: 'female' },
    { id: 'bm_george', label: '英音 · 男声 George', accent: 'GB', gender: 'male' },
  ];
  function cleanText(value) {
    return String(value || '').normalize('NFC')
      .replace(/[ﬀﬁﬂﬃﬄ]/g, c => ({'ﬀ':'ff','ﬁ':'fi','ﬂ':'fl','ﬃ':'ffi','ﬄ':'ffl'}[c]))
      .replace(/\u00ad/g, '')
      .replace(/([a-z])-\s*\n\s*([a-z])/g, '$1$2')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  // Prefer sentence/clause boundaries while bounding synthesis latency. Preserve every character.
  function chunks(value, limit = 340) {
    let text = cleanText(value), result = [];
    while (text.length > limit) {
      const prefix = text.slice(0, limit + 1);
      let cut = -1;
      for (const m of prefix.matchAll(/[.!?;:]\s+/g)) {
        if (m.index >= 70) cut = m.index + 1;
      }
      if (cut < 0) cut = prefix.lastIndexOf(' ');
      if (cut < 1) cut = limit;
      result.push(text.slice(0, cut).trim());
      text = text.slice(cut).trim();
    }
    if (text) result.push(text);
    return result;
  }
  function sentences(value) {
    const text = cleanText(value);
    if (!text) return [];
    if (typeof Intl.Segmenter === 'function') return Array.from(new Intl.Segmenter('en', {granularity:'sentence'}).segment(text), x => x.segment.trim()).filter(Boolean);
    return (text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [text]).map(x=>x.trim()).filter(Boolean);
  }
  function rate(value) { return Math.max(0.6, Math.min(1.6, Number(value) || 1)); }
  return { voices, cleanText, chunks, sentences, rate };
})();
if (typeof module !== 'undefined') module.exports = PaperVoiceCore;
