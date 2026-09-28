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
  const superDigits='⁰¹²³⁴⁵⁶⁷⁸⁹';
  const scientificUnits=/^(?:nm|mm|cm|km|um|µm|μm|ml|kg|mg|hz|khz|mhz|ghz|mol|mmol|umol|µmol|μmol)$/i;
  function citationSuperscript(items,index) {
    const item=items[index],value=String(item.str||'').trim();
    if(!/^[1-9]\d{0,2}(?:\s*[,–−-]\s*[1-9]\d{0,2})*$/.test(value))return false;
    let before=index-1;while(before>=0&&!String(items[before].str||'').trim())before--;
    const previous=items[before];if(!previous)return false;
    const word=String(previous.str).match(/([\p{L}]+)[.,;:!?)]*\s*$/u)?.[1];
    if(!word||word.length<3||scientificUnits.test(word))return false;
    const h=Math.abs(previous.height||previous.transform?.[3]||0),small=Math.abs(item.height||item.transform?.[3]||0);
    const rise=(item.transform?.[5]||0)-(previous.transform?.[5]||0);
    const gap=(item.transform?.[4]||0)-((previous.transform?.[4]||0)+(previous.width||0));
    return h>0&&small>0&&small<=h*.84&&rise>=h*.12&&rise<=h*.85&&gap>=-h*.3&&gap<=h*1.5;
  }
  function pdfText(items) {
    return cleanText(items.map((item,i)=>{
      const value=citationSuperscript(items,i)?item.str.replace(/\d/g,d=>superDigits[Number(d)]):item.str;
      return value+(item.hasEOL?'\n':' ');
    }).join(''));
  }
  function markSelectedSuperscripts(text,items) {
    let joined='',marks=[];
    for(let i=0;i<items.length;i++)for(const char of String(items[i].str||'').normalize('NFKD')){
      if(/\s/.test(char))continue;joined+=char;marks.push(citationSuperscript(items,i)&&/\d/.test(char));
    }
    const needle=text.normalize('NFKD').replace(/\s/g,''),start=joined.indexOf(needle);
    if(start<0)return text;
    let offset=start,result='';
    for(const char of text){
      const normalized=char.normalize('NFKD').replace(/\s/g,'');
      result+=normalized.length===1&&marks[offset]&&/\d/.test(char)?superDigits[Number(char)]:char;
      offset+=normalized.length;
    }
    return result;
  }
  function speechText(value) {
    let text=cleanText(value);
    text=text.replace(/[\[【]([1-9]\d{0,2}(?:\s*[,;–−-]\s*[1-9]\d{0,2})*)[\]】]/g,(whole,numbers,index)=>{
      const before=text.slice(Math.max(0,index-60),index);
      if(/[=<>∈]\s*$/.test(before)||/\b(?:range|interval|vector|matrix|array|coordinates?|indices|index|bounds?|values?|set)\s*(?:(?:of|is|are)\s*)?[:=]?\s*$/i.test(before))return whole;
      if(/[\p{L}\d]\[[^\]]*$/u.test(before)||/\b[\p{L}]\s*$/u.test(before))return whole;
      return '';
    });
    const author="[A-Z][\\p{L}'’.-]+(?:\\s+(?:[A-Z][\\p{L}'’.-]+|(?:and|&)\\s+[A-Z][\\p{L}'’.-]+|et\\s+al\\.?))*";
    const citation=new RegExp('^'+author+',?\\s*(?:18|19|20)\\d{2}[a-z]?(?:\\s*,\\s*(?:18|19|20)\\d{2}[a-z]?)*$','u');
    text=text.replace(/\(([^()]{3,180})\)/g,(whole,inside)=>{
      const parts=inside.split(/\s*;\s*/);
      return parts.every(part=>citation.test(part.trim())&&!/^(?:January|February|March|April|May|June|July|August|September|October|November|December|Figure|Table|Version|Group|Cohort|Trial)\b/.test(part.trim()))?'':whole;
    });
    text=text.replace(/([\p{L}]{3,}[.,;:!?)]*)\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:\s*[,–−⁻-]\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+)*)/gu,(whole,word)=>scientificUnits.test(word)?whole:word);
    return cleanText(text.replace(/\s+([,.;:!?])/g,'$1'));
  }
  function rate(value) { return Math.max(0.6, Math.min(1.6, Number(value) || 1)); }
  return { voices, cleanText, chunks, sentences, rate, speechText, pdfText, markSelectedSuperscripts };
})();
if (typeof module !== 'undefined') module.exports = PaperVoiceCore;
