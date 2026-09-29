/* Pure text and selection logic; shared with regression tests. */
var PaperVoiceCore = (() => {
  const modes=[
    {id:'selection',label:'划选即读',short:'划选',icon:'text-select'},
    {id:'document',label:'全文连读',short:'全文',icon:'file-text'},
    {id:'paragraph',label:'段落循环',short:'段落',icon:'mode-paragraph'},
    {id:'sentence',label:'单句精听',short:'单句',icon:'mode-sentence'},
  ];
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
      const protectedRanges=protectedTextRanges(text);
      const safe=cut=>!protectedRanges.some(range=>cut>range.start&&cut<range.end);
      for (const m of prefix.matchAll(/[.!?;:]\s+/g)) {
        if (m.index >= 70&&safe(m.index+1)) cut = m.index + 1;
      }
      if (cut < 0) cut = prefix.lastIndexOf(' ');
      if (cut < 1) cut = limit;
      const split=protectedRanges.find(range=>cut>range.start&&cut<range.end);
      if(split)cut=split.start>0?split.start:split.end;
      result.push(text.slice(0, cut).trim());
      text = text.slice(cut).trim();
    }
    if (text) result.push(text);
    return result;
  }
  function sentences(value) {
    const text = cleanText(value);
    if (!text) return [];
    // Keep source offsets stable while shielding citation/abbreviation dots from segmentation.
    let mask=text;
    for(const range of protectedTextRanges(text))mask=mask.slice(0,range.start)+mask.slice(range.start,range.end).replace(/[.!?]/g,'·')+mask.slice(range.end);
    if (typeof Intl.Segmenter === 'function') return Array.from(new Intl.Segmenter('en', {granularity:'sentence'}).segment(mask), x => text.slice(x.index,x.index+x.segment.length).trim()).filter(Boolean);
    return Array.from(mask.matchAll(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g),m=>text.slice(m.index,m.index+m[0].length).trim()).filter(Boolean);
  }
  function abbreviationPattern(){return /\b(?:i\s*\.\s*e\s*\.|e\s*\.\s*g\s*\.|et\s+al\s*\.|(?:figs?|eqs?|dr|prof|vs)\.)/gi;}
  function figureReferencePattern() {
    const label='(?:(?:supplementary|supplemental|supp\\.?|supporting(?:\\s+information)?|extended(?:\\s+data)?)\\s+)?(?:fig(?:ure)?s?|tables?)\\.?';
    const id='(?:S?\\d+[a-z]{0,3}|[IVX]+)';
    const next='(?:'+id+'|[a-z])';
    return new RegExp('\\b'+label+'\\s*'+id+'\\b(?:\\s*(?:[,;–−-]|and|&)\\s*'+next+'\\b)*','gi');
  }
  function isFigureCitation(inside) {
    const text=inside.replace(/^\s*(?:see\s+)?(?:also\s+)?(?:e\.g\.,?\s*)?/i,'');
    const remainder=text.replace(figureReferencePattern(),'');
    return remainder!==text&&/^[\s,;.\/&]*(?:and[\s,;.]*)?$/i.test(remainder);
  }
  function isAuthorCitation(inside) {
    // PDF fonts use several visually identical hyphens in compound surnames.
    // Normalize only the recognition copy; source offsets and scientific text stay intact.
    inside=inside.replace(/[\p{Pd}−]/gu,'-').replace(/([\p{L}])\u0000(?=[\p{L}])/gu,'$1-').replace(/\s*-\s*/g,'-');
    const author="[\\p{Lu}][\\p{L}'’.-]+(?:\\s+(?:[\\p{Lu}][\\p{L}'’.-]+|(?:and|&)\\s+[\\p{Lu}][\\p{L}'’.-]+|et\\s+al\\.?))*";
    const citation=new RegExp('^'+author+',?\\s*(?:18|19|20)\\d{2}[a-z]?(?:\\s*,\\s*(?:18|19|20)\\d{2}[a-z]?)*$','u');
    return inside.split(/\s*;\s*/).every(part=>citation.test(part.trim())&&!/^(?:January|February|March|April|May|June|July|August|September|October|November|December|Figure|Table|Version|Group|Cohort|Trial)\b/.test(part.trim()));
  }
  function protectedTextRanges(text){
    const ranges=[];
    for(const m of text.matchAll(/\(([^()]*)\)|[\[【][\d\s,;–−-]+[\]】]/g)){
      if(!m[1])ranges.push({start:m.index,end:m.index+m[0].length});
      else {
        const citations=parentheticalCitationRanges(m[1]);
        if(citations.length){
          // Protect the complete aside during chunking; silence only citation spans.
          ranges.push({start:m.index,end:m.index+m[0].length});
          if(citations[0].start===0&&citations[0].end===m[1].length)ranges[ranges.length-1].silent=true;
          else for(const range of citations)ranges.push({start:m.index+1+range.start,end:m.index+1+range.end,silent:true});
        }
      }
    }
    for(const m of text.matchAll(figureReferencePattern()))ranges.push({start:m.index,end:m.index+m[0].length});
    for(const m of text.matchAll(abbreviationPattern()))ranges.push({start:m.index,end:m.index+m[0].length});
    return ranges;
  }
  function parentheticalCitationRanges(inside){
    const parts=Array.from(inside.matchAll(/[^;]+/g),m=>({start:m.index,end:m.index+m[0].length,silent:isAuthorCitation(m[0].trim())||isFigureCitation(m[0].trim())}));
    if(!parts.length)return [];
    if(parts.every(part=>part.silent))return [{start:0,end:inside.length}];
    const ranges=[];
    for(let i=0;i<parts.length;i++){
      if(!parts[i].silent)continue;
      const first=i;while(i+1<parts.length&&parts[i+1].silent)i++;
      // Keep the scientific aside and its brackets; remove the adjacent separator.
      ranges.push({start:first===0?0:parts[first-1].end,end:first===0?parts[i+1].start:parts[i].end});
    }
    return ranges;
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
    text=text.replace(/[\[【]\s*(\d+(?:\s*[,;–−-]\s*\d+)*)\s*[\]】]/g,(whole,numbers,index)=>{
      const before=text.slice(Math.max(0,index-60),index);
      // Keep attached mathematical subscripts; standalone numeric brackets are silent,
      // including zero-based lists such as [0, 1], as requested for paper narration.
      if(/\b[\p{L}]$/u.test(before))return whole;
      return '';
    });
    text=text.replace(/\(([^()]+)\)/g,(whole,inside)=>{
      const ranges=parentheticalCitationRanges(inside);
      if(ranges.length===1&&ranges[0].start===0&&ranges[0].end===inside.length)return '';
      for(const range of ranges.reverse())inside=inside.slice(0,range.start)+inside.slice(range.end);
      return '('+inside.trim()+')';
    });
    text=text.replace(figureReferencePattern(),'');
    text=text.replace(/([\p{L}]{3,}[.,;:!?)]*)\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:\s*[,–−⁻-]\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+)*)/gu,(whole,word)=>scientificUnits.test(word)?whole:word);
    text=text.replace(/\band\s*\/\s*or\b/gi,'and or')
      .replace(/\bi\s*\.\s*e\s*\./gi,'that is')
      .replace(/\be\s*\.\s*g\s*\./gi,'for example');
    return cleanText(text.replace(/\s+([,.;:!?])/g,'$1'));
  }
  function rate(value) { return Math.max(0.6, Math.min(1.6, Number(value) || 1)); }
  function anchorText(value) { return cleanText(value).normalize('NFKD').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase(); }
  function pageUnits(text,pageIndex) {
    let offset=0,unitInPage=0;
    return sentences(text).flatMap(sentence=>{const sentenceOffset=offset;return chunks(sentence).map(part=>{
      const unit={text:part,sentenceText:sentence,pageIndex,unitInPage:unitInPage++,anchorOffset:offset,sentenceOffset};
      offset+=anchorText(part).length;return unit;
    });});
  }
  function trimPublicationFooter(items,pageHeight) {
    // Only trim a trailing, small-print metadata block near the bottom. Keeping
    // the body prefix intact preserves every DOM character offset used by selections.
    const rows=items.map((item,index)=>({index,text:cleanText(item.str),y:Number(item.transform?.[5]),height:Math.abs(item.height||item.transform?.[3]||0)})).filter(x=>x.text&&Number.isFinite(x.y)&&x.height>0);
    if(rows.length<3)return items;
    const height=pageHeight||Math.max(...rows.map(x=>x.y+x.height));
    const weights=new Map();for(const row of rows.filter(x=>x.y>height*.36)){const size=Math.round(row.height*2)/2;weights.set(size,(weights.get(size)||0)+row.text.length);}
    const bodySize=[...weights].sort((a,b)=>b[1]-a[1])[0]?.[0];if(!bodySize)return items;
    const candidates=rows.filter(x=>x.y<height*.36&&x.height<=bodySize*.93);if(!candidates.length)return items;
    const cue=/^(?:abbreviations?\s*:|[*†‡]?\s*correspond(?:ing|ence)\b|e[- ]?mail\s*(?:address)?\s*:|(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:)|received\s+\d|accepted\s+\d|available\s+online\b|copyright\b|©|\d{4}-\d{3}[\dX]\s*\/)/i;
    for(const candidate of candidates){
      // Labels may be separate PDF text items, so inspect their line continuation.
      const tail=rows.filter(x=>x.index>=candidate.index),lead=tail.slice(0,4).map(x=>x.text).join(' ');
      if(!cue.test(lead))continue;
      if(!tail.every(x=>x.y<height*.39&&x.height<=bodySize*.96))continue;
      const block=tail.map(x=>x.text).join(' ');
      // Abbreviation lists are only suppressed when accompanied by publication metadata.
      if(/^abbreviations?\s*:/i.test(lead)&&!/(?:corresponding author|doi\.org|e[- ]?mail|received\s+\d|©)/i.test(block))continue;
      return items.slice(0,candidate.index);
    }
    return items;
  }
  function pdfLayout(items,pageIndex,pageHeight) {
    items=trimPublicationFooter(items,pageHeight);
    const text=pdfText(items),breaks=[];let offset=0,previous=null;
    for(const item of items){
      if(!anchorText(item.str))continue;
      const [,,,scale,x,y]=item.transform||[],height=Math.abs(item.height||scale||0);
      // PDF coordinates grow upwards: a move right and back up starts a new column.
      if(previous&&height&&Number.isFinite(x)&&Number.isFinite(y)){
        const h=Math.max(height,previous.height);
        if(x-previous.x>h*2&&y-previous.y>h*2)breaks.push(offset);
      }
      offset+=anchorText(item.str).length;previous={x,y,height};
    }
    return {text,pageIndex,breaks};
  }
  function layoutUnits(pages,selection=null,from=0) {
    const joined=cleanText(pages.map(p=>p.text).join(' ')),normalized=anchorText(joined),segments=[];
    let offset=0;
    for(const page of pages){
      const length=anchorText(page.text).length,cuts=[0,...(page.breaks||[]).filter(x=>x>0&&x<length),length];
      for(let i=0;i<cuts.length-1;i++)if(cuts[i+1]>cuts[i])segments.push({start:offset+cuts[i],end:offset+cuts[i+1],pageIndex:page.pageIndex,pageStart:offset});
      offset+=length;
    }
    const text=selection===null?joined:cleanText(selection);
    let cursor=selection===null?0:normalized.indexOf(anchorText(text),from);
    if(cursor<0)return null;
    const units=[],counts=new Map();
    // Convert normalized PDF offsets back to the untouched sentence text.
    const rawOffset=(value,n)=>{
      if(n<=0)return 0;let count=0;
      for(let i=0;i<value.length;i++){
        const length=anchorText(value[i]).length;
        if(length&&count>=n)return i;
        count+=length;
      }
      return value.length;
    };
    for(const sentence of sentences(text)){
      const start=cursor,end=start+anchorText(sentence).length;cursor=end;
      // Silence citations before layout splitting, even when a reference itself
      // crosses a column/page. Keep string offsets unchanged for PDF anchoring.
      let masked=sentence;
      for(const range of protectedTextRanges(sentence)){
        const part=sentence.slice(range.start,range.end);
        if((range.silent||!speechText(part))&&!(/^[\[【]/.test(part)&&/[\p{L}]$/u.test(sentence.slice(0,range.start))))masked=masked.slice(0,range.start)+' '.repeat(range.end-range.start)+masked.slice(range.end);
      }
      for(const segment of segments){
        const a=Math.max(start,segment.start),b=Math.min(end,segment.end);if(a>=b)continue;
        const rawStart=rawOffset(sentence,a-start),rawEnd=rawOffset(sentence,b-start),highlightText=sentence.slice(rawStart,rawEnd).trim();
        let local=rawStart,anchorOffset=a-segment.pageStart;
        for(const part of chunks(highlightText)){
          const at=sentence.indexOf(part,local);local=at+part.length;
          const unitInPage=counts.get(segment.pageIndex)||0;counts.set(segment.pageIndex,unitInPage+1);
          units.push({text:part,spokenText:speechText(masked.slice(at,local)),translationText:sentence,sentenceText:sentence,sentenceId:start,highlightText,highlightOffset:a-segment.pageStart,pageIndex:segment.pageIndex,anchorOffset,sentenceOffset:Math.max(0,start-segment.pageStart),unitInPage});
          anchorOffset+=anchorText(part).length;
        }
      }
    }
    return units;
  }
  function resumeUnitIndex(units,saved) {
    if(!units.length)return 0;
    if(Number.isInteger(saved.anchorOffset)&&saved.anchorOffset>=0){
      const at=units.findIndex(unit=>unit.anchorOffset+anchorText(unit.text).length>saved.anchorOffset);
      if(at>=0)return at;
    }
    const needle=anchorText(saved.text||'');
    if(needle){const at=units.findIndex(unit=>anchorText(unit.text).includes(needle)||needle.includes(anchorText(unit.text)));if(at>=0)return at;}
    return Math.max(0,Math.min(units.length-1,Number.isInteger(saved.unitInPage)?saved.unitInPage:0));
  }
  function selectedSentenceIndex(units,pageIndex,offset) {
    let index=units.findIndex(u=>u.pageIndex===pageIndex&&u.anchorOffset<=offset&&offset<u.anchorOffset+anchorText(u.text).length);
    if(index<0)return -1;
    const id=units[index].sentenceId;
    while(index>0&&id!==undefined&&units[index-1].sentenceId===id)index--;
    return index;
  }
  return { modes, voices, cleanText, chunks, sentences, rate, speechText, pdfText, pdfLayout, layoutUnits, selectedSentenceIndex, markSelectedSuperscripts, anchorText, pageUnits, resumeUnitIndex };
})();
if (typeof module !== 'undefined') module.exports = PaperVoiceCore;
