/* Pure text and selection logic; shared with regression tests. */
var PaperVoiceCore = (() => {
  const modes=[
    {id:'sentence',label:'单句精听',short:'单句',icon:'mode-sentence'},
    {id:'selection',label:'划选即读',short:'划选',icon:'text-select'},
    {id:'paragraph',label:'段落循环',short:'段落',icon:'mode-paragraph'},
    {id:'document',label:'全文连读',short:'全文',icon:'file-text'},
  ];
  const voices = [
    { id: 'af_heart', label: '美音 · 女声 Heart', language: 'en', accent: 'US', gender: 'female' },
    { id: 'af_bella', label: '美音 · 女声 Bella', language: 'en', accent: 'US', gender: 'female' },
    { id: 'am_michael', label: '美音 · 男声 Michael', language: 'en', accent: 'US', gender: 'male' },
    { id: 'am_fenrir', label: '美音 · 男声 Fenrir', language: 'en', accent: 'US', gender: 'male' },
    { id: 'bf_emma', label: '英音 · 女声 Emma', language: 'en', accent: 'GB', gender: 'female' },
    { id: 'bm_george', label: '英音 · 男声 George', language: 'en', accent: 'GB', gender: 'male' },
    {id:'zm_yunxi', label:'普通话 · 男声 Yunxi', language:'zh', gender:'male'},
    {id:'zf_xiaobei', label:'普通话 · 女声 Xiaobei', language:'zh', gender:'female'},
    {id:'zf_xiaoxiao', label:'普通话 · 女声 Xiaoxiao', language:'zh', gender:'female'},
    {id:'zm_yunjian', label:'普通话 · 男声 Yunjian', language:'zh', gender:'male'},
    {id:'jf_tebukuro', label:'日本語 · 女声 Tebukuro', language:'ja', gender:'female'},
    {id:'jf_alpha', label:'日本語 · 女声 Alpha', language:'ja', gender:'female'},
    {id:'jm_kumo', label:'日本語 · 男声 Kumo', language:'ja', gender:'male'},
    {id:'ff_siwis', label:'Français · 女声 Siwis', language:'fr', gender:'female'},
  ];
  const speechLanguages=[{id:'en',label:'English',sample:'The human retina transforms light into signals that allow us to see the world.'},
    {id:'zh',label:'中文（普通话）',sample:'视网膜将光线转化为神经信号，让我们看见丰富多彩的世界。'},
    {id:'ja',label:'日本語',sample:'網膜は光を神経信号に変換し、私たちが世界を見ることを可能にします。'},
    {id:'fr',label:'Français',sample:'La rétine transforme la lumière en signaux nerveux qui nous permettent de voir le monde.'}];
  const languageDetector=typeof PaperVoiceLanguageDetector!=='undefined'?PaperVoiceLanguageDetector:typeof require==='function'?require('./vendor/tinyld.js'):null;
  function detectSpeechLanguage(value,context='') {
    const text=cleanText(value),surrounding=cleanText(context);
    if(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text))return 'ja';
    if((text.match(/\p{Script=Han}/gu)||[]).length>=2){
      if(text.length<12&&/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(surrounding))return 'ja';
      return 'zh';
    }
    const identify=sample=>{
      if(!languageDetector||(sample.match(/\p{L}/gu)||[]).length<12)return null;
      const ranked=languageDetector.detectAll(sample),a=ranked[0],b=ranked[1];
      return a&&a.accuracy>=.35&&a.accuracy-(b?.accuracy||0)>=.15?a.lang:null;
    };
    // Biomedical names and abbreviations are weak language signals. Function words
    // and surrounding prose stabilize the statistical detector on scientific PDFs.
    const proseLanguage=sample=>{
      const words=sample.toLowerCase().replace(/\bet\s+al\.?/g,'').match(/[\p{L}]+/gu)||[];
      const english=new Set('the and of to is are was were with from by for which that these this as be been into between while may can also not through our their its it we than but when whether have has without during after before'.split(' '));
      const french=new Set('le la les des du de un une et est sont dans pour par qui que ce ces cette cet se sur aux avec sans au en entre leur leurs nous notre nos ses son elle elles ils il peut peuvent été être dont comme mais lorsque plus ne pas'.split(' '));
      const en=words.filter(w=>english.has(w)).length,fr=words.filter(w=>french.has(w)).length;
      return en>=2&&en>fr*1.5?'en':fr>=2&&fr>en*1.5&&identify(sample)==='fr'?'fr':null;
    };
    const local=proseLanguage(text);if(local)return local;
    if(surrounding){
      if(/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(surrounding))return 'ja';
      if((surrounding.match(/\p{Script=Han}/gu)||[]).length>surrounding.length*.2)return 'zh';
      const broader=proseLanguage(surrounding)||identify(surrounding);if(broader)return broader;
    }
    return identify(text);
  }

  function cleanText(value) {
    return String(value || '').normalize('NFC')
      .replace(/[ﬀﬁﬂﬃﬄ]/g, c => ({'ﬀ':'ff','ﬁ':'fi','ﬂ':'fl','ﬃ':'ffi','ﬄ':'ffl'}[c]))
      .replace(/\u00ad/g, '')
      .replace(/([a-z])-\s*\n\s*([a-z])/g, '$1$2')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])\s+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu, '$1')
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
      for (const m of prefix.matchAll(/(?:[.!?;:]\s+|[。！？；：])/g)) {
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
    if (typeof Intl.Segmenter === 'function') return Array.from(new Intl.Segmenter(/[ぁ-ヿ]/.test(text)?'ja':/[\p{Script=Han}]/u.test(text)?'zh':'fr', {granularity:'sentence'}).segment(mask), x => text.slice(x.index,x.index+x.segment.length).trim()).filter(Boolean);
    return Array.from(mask.matchAll(/[^.!?。！？]+(?:[。！？]+|[.!?]+(?=\s|$)|$)/g),m=>text.slice(m.index,m.index+m[0].length).trim()).filter(Boolean);
  }
  function abbreviationPattern(){return /\b(?:i\s*\.\s*e\s*\.|e\s*\.\s*g\s*\.|et\s+al\s*\.|(?:figs?|eqs?|dr|prof|vs)\.)/gi;}
  function figureReferencePattern() {
    const label='(?:(?:supplementary|supplemental|supp\\.?|supporting(?:\\s+information)?|extended(?:\\s+data)?)\\s+)?(?:fig(?:ure)?s?|tables?)\\.?';
    const id='(?:S?\\d+[a-z]{0,3}|[IVX]+)';
    const next='(?:'+id+'|[a-z])';
    const separator='(?:[,;]\\s*(?:(?:and|&)\\s*)?|[–−-]|and|&)';
    return new RegExp('\\b'+label+'\\s*'+id+'\\b(?:\\s*'+separator+'\\s*'+next+'\\b)*','gi');
  }
  function isFigureCitation(inside) {
    const text=inside.replace(/^\s*(?:see\s+)?(?:also\s+)?(?:e\.g\.,?\s*)?/i,'');
    const remainder=text.replace(figureReferencePattern(),'');
    return remainder!==text&&/^[\s,;.\/&]*(?:and[\s,;.]*)?$/i.test(remainder);
  }
  function isAuthorCitation(inside) {
    // PDF fonts use several visually identical hyphens in compound surnames.
    // Normalize only the recognition copy; source offsets and scientific text stay intact.
    inside=inside.replace(/[\p{Pd}−]/gu,'-').replace(/([\p{L}])\s*\u0000\s*(?=[\p{L}])/gu,'$1-').replace(/\s*-\s*/g,'-');
    // PDF.js may emit a ligature as its own text item (Rosen / fi / eld).
    // Repair only the citation recognition copy, preserving PDF highlight offsets.
    inside=inside.replace(/([\p{L}])\s+(ff[il]?|fi|fl)\s+(?=\p{Ll})/gu,'$1$2');
    const author="[\\p{Lu}][\\p{L}'’.-]+(?:\\s+(?:[\\p{Lu}][\\p{L}'’.-]+|(?:and|&)\\s+[\\p{Lu}][\\p{L}'’.-]+|et\\s+al\\.?))*";
    const citation=new RegExp('^'+author+',?\\s*(?:18|19|20)\\d{2}[a-z]?(?:\\s*,\\s*(?:18|19|20)\\d{2}[a-z]?)*$','u');
    return inside.split(/\s*;\s*/).every(part=>citation.test(part.trim())&&!/^(?:January|February|March|April|May|June|July|August|September|October|November|December|Figure|Table|Version|Group|Cohort|Trial)\b/.test(part.trim()));
  }
  function protectedTextRanges(text){
    const ranges=[];
    // Scan bracket types independently so an author-year group inside a scientific
    // parenthetical remains protected and silent across page/column boundaries.
    for(const pattern of [/\(([^()]*)\)/g,/\[([^\[\]]*)\]|【([^【】]*)】/g])for(const m of text.matchAll(pattern)){
      const inside=m[1]??m[2],numeric=m[0][0]!=='('&&/^[\d\s,;–−-]+$/.test(inside);
      const citations=parentheticalCitationRanges(inside);
      // A visual explanation needs its figure identifier to remain meaningful.
      for(const part of inside.matchAll(/[^;]+/g)){
        if(figureReferencePattern().test(part[0])&&!isFigureCitation(part[0].trim()))ranges.push({start:m.index+1+part.index,end:m.index+1+part.index+part[0].length,keepFigures:true});
      }
      if(numeric||citations.length){
        ranges.push({start:m.index,end:m.index+m[0].length});
        if(citations.length===1&&citations[0].start===0&&citations[0].end===inside.length)ranges[ranges.length-1].silent=true;
        else for(const range of citations)ranges.push({start:m.index+1+range.start,end:m.index+1+range.end,silent:true});
      }
    }
    for(const m of text.matchAll(figureReferencePattern())){
      const bracketed=Array.from(text.matchAll(/\([^()]*\)|\[[^\[\]]*\]|【[^【】]*】/g)).some(b=>m.index>b.index&&m.index+m[0].length<b.index+b[0].length);
      ranges.push({start:m.index,end:m.index+m[0].length,figure:true,keepFigures:!bracketed});
    }
    for(const m of text.matchAll(/\d+(?:\.\d+)?(?:\s*[:：]\s*\d+(?:\.\d+)?)+/g))ranges.push({start:m.index,end:m.index+m[0].length});
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
    if(!word||word.length<3||(scientificUnits.test(word)||measurementNames[word]))return false;
    const h=Math.abs(previous.height||previous.transform?.[3]||0),small=Math.abs(item.height||item.transform?.[3]||0);
    const rise=(item.transform?.[5]||0)-(previous.transform?.[5]||0);
    const gap=(item.transform?.[4]||0)-((previous.transform?.[4]||0)+(previous.width||0));
    return h>0&&small>0&&small<=h*.84&&rise>=h*.12&&rise<=h*.85&&gap>=-h*.3&&gap<=h*1.5;
  }
  function joinsPDFLigature(left,right) {
    if(!right||left.hasEOL||!/\p{L}$/u.test(left.str)||!/^\p{L}/u.test(right.str))return false;
    const ligature=item=>/^(?:ff[il]?|fi|fl)$/.test(cleanText(item.str));
    if(!ligature(left)&&!ligature(right))return false;
    const h=Math.abs(left.height||left.transform?.[3]||0),rh=Math.abs(right.height||right.transform?.[3]||0);
    const gap=right.transform?.[4]-(left.transform?.[4]+left.width);
    return h>0&&rh>0&&Math.abs(h-rh)<=h*.2&&Math.abs(left.transform?.[5]-right.transform?.[5])<=h*.15&&gap>=-h*.25&&gap<=h*.12;
  }
  function pdfText(items) {
    return cleanText(items.map((item,i)=>{
      const value=citationSuperscript(items,i)?item.str.replace(/\d/g,d=>superDigits[Number(d)]):item.str;
      return value+(item.hasEOL?'\n':joinsPDFLigature(item,items[i+1])?'':' ');
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
  function speechText(value, {keepFigures=false}={}) {
    let text=cleanText(value);
    text=text.replace(/[\[【]\s*(\d+(?:\s*[,;–−-]\s*\d+)*)\s*[\]】]/g,(whole,numbers,index)=>{
      const before=text.slice(Math.max(0,index-60),index);
      // Keep attached mathematical subscripts; standalone numeric brackets are silent,
      // including zero-based lists such as [0, 1], as requested for paper narration.
      if(/\b[\p{L}]$/u.test(before))return whole;
      return '';
    });
    const stripCitation=(whole,inside)=>{
      const ranges=parentheticalCitationRanges(inside);
      if(ranges.length===1&&ranges[0].start===0&&ranges[0].end===inside.length)return '';
      for(const range of ranges.reverse())inside=inside.slice(0,range.start)+inside.slice(range.end);
      return whole[0]+inside.trim()+whole.at(-1);
    };
    text=text.replace(/\[([^\[\]]+)\]|【([^【】]+)】/g,(whole,a,b)=>stripCitation(whole,a??b));
    text=text.replace(/\(([^()]+)\)/g,stripCitation);
    // Standalone bracketed figure citations were removed above. References in
    // running prose carry meaning (e.g. 'shown in Fig. 7A') and must be spoken.
    text=text.replace(/\bfig(s)?\./gi,(_,plural)=>plural?'Figures':'Figure');
    text=text.replace(/([\p{L}]{3,}[.,;:!?)]*)\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:\s*[,–−⁻-]\s*[⁰¹²³⁴⁵⁶⁷⁸⁹]+)*)/gu,(whole,word)=>(scientificUnits.test(word)||measurementNames[word])?whole:word);
    text=text.replace(/\band\s*\/\s*or\b/gi,'and or')
      .replace(/\bi\s*\.\s*e\s*\./gi,'that is')
      .replace(/\be\s*\.\s*g\s*\./gi,'for example');
    return cleanText(text.replace(/\s+([,.;:!?])/g,'$1'));
  }
  // Speech-only expansions: the PDF source and highlight coordinates stay unchanged.
  const measurementNames={
    pm:['picometer','皮米','ピコメートル','picomètre'],nm:['nanometer','纳米','ナノメートル','nanomètre'],
    'μm':['micrometer','微米','マイクロメートル','micromètre'],mm:['millimeter','毫米','ミリメートル','millimètre'],cm:['centimeter','厘米','センチメートル','centimètre'],m:['meter','米','メートル','mètre'],km:['kilometer','千米','キロメートル','kilomètre'],'Å':['angstrom','埃','オングストローム','ångström'],
    pg:['picogram','皮克','ピコグラム','picogramme'],ng:['nanogram','纳克','ナノグラム','nanogramme'],'μg':['microgram','微克','マイクログラム','microgramme'],mg:['milligram','毫克','ミリグラム','milligramme'],g:['gram','克','グラム','gramme'],kg:['kilogram','千克','キログラム','kilogramme'],
    dL:['deciliter','分升','デシリットル','décilitre'],nL:['nanoliter','纳升','ナノリットル','nanolitre'],'μL':['microliter','微升','マイクロリットル','microlitre'],mL:['milliliter','毫升','ミリリットル','millilitre'],L:['liter','升','リットル','litre'],
    ns:['nanosecond','纳秒','ナノ秒','nanoseconde'],'μs':['microsecond','微秒','マイクロ秒','microseconde'],ms:['millisecond','毫秒','ミリ秒','milliseconde'],s:['second','秒','秒','seconde'],min:['minute','分钟','分','minute'],h:['hour','小时','時間','heure'],d:['day','天','日','jour'],
    Hz:['hertz','赫兹','ヘルツ','hertz'],kHz:['kilohertz','千赫兹','キロヘルツ','kilohertz'],MHz:['megahertz','兆赫兹','メガヘルツ','mégahertz'],GHz:['gigahertz','吉赫兹','ギガヘルツ','gigahertz'],
    mol:['mole','摩尔','モル','mole'],mmol:['millimole','毫摩尔','ミリモル','millimole'],'μmol':['micromole','微摩尔','マイクロモル','micromole'],nmol:['nanomole','纳摩尔','ナノモル','nanomole'],
    M:['molar','摩尔每升','モーラー','molaire'],mM:['millimolar','毫摩尔每升','ミリモーラー','millimolaire'],'μM':['micromolar','微摩尔每升','マイクロモーラー','micromolaire'],nM:['nanomolar','纳摩尔每升','ナノモーラー','nanomolaire'],pM:['picomolar','皮摩尔每升','ピコモーラー','picomolaire'],
    Pa:['pascal','帕斯卡','パスカル','pascal'],kPa:['kilopascal','千帕','キロパスカル','kilopascal'],MPa:['megapascal','兆帕','メガパスカル','mégapascal'],mmHg:['millimeter of mercury','毫米汞柱','水銀柱ミリメートル','millimètre de mercure'],
    V:['volt','伏特','ボルト','volt'],mV:['millivolt','毫伏','ミリボルト','millivolt'],'μV':['microvolt','微伏','マイクロボルト','microvolt'],
    A:['ampere','安培','アンペア','ampère'],mA:['milliampere','毫安','ミリアンペア','milliampère'],'μA':['microampere','微安','マイクロアンペア','microampère'],nA:['nanoampere','纳安','ナノアンペア','nanoampère'],pA:['picoampere','皮安','ピコアンペア','picoampère'],
    W:['watt','瓦特','ワット','watt'],mW:['milliwatt','毫瓦','ミリワット','milliwatt'],J:['joule','焦耳','ジュール','joule'],mJ:['millijoule','毫焦','ミリジュール','millijoule'],N:['newton','牛顿','ニュートン','newton'],mN:['millinewton','毫牛','ミリニュートン','millinewton'],
    K:['kelvin','开尔文','ケルビン','kelvin'],rad:['radian','弧度','ラジアン','radian'],lx:['lux','勒克斯','ルクス','lux'],cd:['candela','坎德拉','カンデラ','candela'],
    '%':['percent','百分之','パーセント','pour cent'],'‰':['per mille','千分之','パーミル','pour mille'],
    '°':['degree','度','度','degré'],'°C':['degree Celsius','摄氏度','摂氏度','degré Celsius'],'°F':['degree Fahrenheit','华氏度','華氏度','degré Fahrenheit'],
    Da:['dalton','道尔顿','ダルトン','dalton'],kDa:['kilodalton','千道尔顿','キロダルトン','kilodalton'],IU:['international unit','国际单位','国際単位','unité internationale'],
    rpm:['revolutions per minute','转每分钟','回転毎分','tours par minute'],bp:['base pair','碱基对','塩基対','paire de bases'],kb:['kilobase','千碱基','キロベース','kilobase'],Mb:['megabase','兆碱基','メガベース','mégabase']
  };
  function measurementSpeech(value,language='en') {
    const lang=['en','zh','ja','fr'].includes(language)?language:'en',col={en:0,zh:1,ja:2,fr:3}[lang];
    const aliases={um:'μm',ug:'μg',uL:'μL',ul:'μL','μl':'μL',ml:'mL',nl:'nL',l:'L',us:'μs',umol:'μmol',uM:'μM',sec:'s',secs:'s',mins:'min',hr:'h',hrs:'h'};
    const escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const tokens=[...Object.keys(measurementNames),...Object.keys(aliases)].sort((a,b)=>b.length-a.length).map(x=>Array.from(x,escape).join('\\s*')).join('|');
    const unit='(?:'+tokens+')',power='(?:\\s*(?:[²³]|\\^[23]|[⁻−-][¹²³123])|[23])?',atom=unit+power;
    // Match only a complete unit token after a number. Gene names and ordinary words stay intact.
    const boundary='(?![\\p{Script=Latin}\\p{Script=Greek}\\p{N}_])';
    const number='[+−-]?(?:\\d+(?:[.,]\\d+)*|\\.\\d+)(?:[eE][+−-]?\\d+)?';
    const quantity=number+'(?:\\s*(?:[–−-]|±)\\s*'+number+')?';
    const per={en:' per ',zh:'每',ja:'毎',fr:' par '}[lang];
    const numeral=x=>x.replace(/([\d.,]+)[eE]([+−-]?\d+)/g,(_,base,power)=>base+({en:' times ten to the power of ',zh:'乘十的',ja:'掛ける十の',fr:' fois dix puissance '}[lang])+power.replace(/^[−-]/,{en:'minus ',zh:'负',ja:'マイナス',fr:'moins '}[lang])+({en:'',zh:'次方',ja:'乗',fr:''}[lang])).replace(/\s*±\s*/g,{en:' plus or minus ',zh:'正负',ja:'プラスマイナス',fr:' plus ou moins '}[lang]).replace(/(\d)\s*[–−-]\s*(?=[+−-]?\d)/g,'$1'+({en:' to ',zh:'至',ja:'から',fr:' à '}[lang])).replace(/^[−-]/,{en:'minus ',zh:'负',ja:'マイナス',fr:'moins '}[lang]);
    const name=(raw,plural)=>{
      let token=raw.replace(/\s/g,'').replace(/µ/g,'μ'),exponent=token.match(/([²³]|\^?[23]|[⁻−-][¹²³123])$/)?.[0]||'';
      token=token.slice(0,token.length-exponent.length);token=aliases[token]||token;
      let word=measurementNames[token]?.[col];if(!word)return raw;
      const negative=/^[⁻−-]/.test(exponent);if(negative)plural=false;exponent=exponent.replace(/[⁻−^\-]/g,'').replace('¹','1').replace('²','2').replace('³','3');
      if(plural&&lang==='en'&&!/hertz$|molar$|percent|per mille|lux$/.test(word)&&token!=='rpm'){const words=word.split(' ');words[0]+='s';word=words.join(' ');}
      if(plural&&lang==='fr'&&!/hertz$|lux$|pour cent|pour mille/.test(word)&&token!=='rpm'){const words=word.split(' ');words[0]+='s';word=words.join(' ');}
      if(plural&&token==='bp'&&lang==='en')word='base pairs';
      if(plural&&token==='IU'&&lang==='en')word='international units';
      if(plural&&token==='IU'&&lang==='fr')word='unités internationales';
      if(exponent==='2'||exponent==='3')word=lang==='en'?({2:'square ',3:'cubic '}[exponent])+word:lang==='fr'?word+({2:' carré',3:' cube'}[exponent])+(plural?'s':''):({zh:{2:'平方',3:'立方'},ja:{2:'平方',3:'立方'}}[lang][exponent])+word;
      return negative?per.trim()+' '+word:word;
    };
    let text=cleanText(value).replace(/µ/g,'μ').replace(/℃/g,'°C').replace(/℉/g,'°F').replace(/º(?=\s*[CF])/g,'°');
    text=ratioSpeech(text,lang);
    text=text.replace(new RegExp('('+quantity+')\\s*[×x]\\s*g'+boundary,'gu'),(_,n)=>numeral(n)+({en:' times gravity',zh:'倍重力加速度',ja:'倍の重力加速度',fr:' fois la gravité'}[lang]));
    const factor='(?:[/·]\\s*'+atom+'|'+unit+'\\s*[⁻−-][¹²³123])';
    const pattern=new RegExp('(?<![\\p{Script=Latin}\\p{Script=Greek}\\p{N}_])('+quantity+')\\s*('+atom+')'+boundary+'((?:\\s*'+factor+boundary+')*)','gu');
    const figureRanges=Array.from(text.matchAll(figureReferencePattern()),m=>({start:m.index,end:m.index+m[0].length}));
    return text.replace(pattern,(whole,n,first,rest,at)=>{
      // Panel letters are identifiers, not amperes, volts or other SI units.
      if(figureRanges.some(r=>at>=r.start&&at+whole.length<=r.end))return whole;
      const single=Number(n.replace(/,/g,''))===1,token=first.replace(/\s/g,'');
      let spoken=name(first,!single),amount=numeral(n);
      if(lang==='zh'&&(token==='%'||token==='‰'))return spoken+amount;
      if(lang==='ja'&&(token==='°C'||token==='°F'))return (token==='°C'?'摂氏':'華氏')+amount+'度';
      for(const part of rest.matchAll(new RegExp('([/·])?\\s*('+atom+')','gu'))){
        const inverse=/[⁻−-][¹²³123]$/.test(part[2]);
        spoken+=inverse&&part[1]!=='/'?' '+name(part[2],false):(part[1]==='/'?per:({en:' times ',zh:'乘',ja:'掛ける',fr:' fois '}[lang]))+name(part[2],false);
      }
      return amount+(['zh','ja'].includes(lang)?'':' ')+spoken;
    });
  }
  function ratioSpeech(value,language='en') {
    const separator={en:' to ',zh:'比',ja:'対',fr:' pour '}[language]||' to ';
    // Ratios are speech-only. Preserve clock times, URLs, identifiers and ranges.
    return value.replace(/(?<![\p{L}\p{N}_/:])\d+(?:\.\d+)?(?:\s*[:：]\s*\d+(?:\.\d+)?)+(?![\p{L}\p{N}_/:])/gu,(ratio,at)=>{
      const before=value.slice(Math.max(0,at-35),at),after=value.slice(at+ratio.length,at+ratio.length+25),parts=ratio.split(/\s*[:：]\s*/);
      const clock=parts.length===2&&/^\d{1,2}$/.test(parts[0])&&/^\d{2}$/.test(parts[1])&&+parts[0]<24&&+parts[1]<60;
      const seconds=parts.length===3&&parts.every((x,i)=>i===0?+x<24:/^\d{2}$/.test(x)&&+x<60);
      if((clock||seconds)&&(/(?:\bat|\btime|\bfrom|\buntil|\bbetween|\btimestamp|\bclock|时间|時刻|à)\s*$/iu.test(before)||/^\s*(?:[ap]\.?m\.?|o['’]clock|时|時)\b/iu.test(after)))return ratio;
      return parts.join(separator);
    });
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
  function pdfRows(items) {
    return items.map((item,index)=>({index,text:cleanText(item.str),x:Number(item.transform?.[4]),y:Number(item.transform?.[5]),width:Math.abs(item.width||0),height:Math.abs(item.height||item.transform?.[3]||0)})).filter(x=>x.text&&Number.isFinite(x.y)&&x.height>0);
  }
  function pdfLines(rows) {
    const baselines=[];
    for(const row of [...rows].sort((a,b)=>b.y-a.y||a.x-b.x)){
      let line=baselines.find(x=>Math.abs(x.y-row.y)<=Math.max(x.height,row.height)*.5);
      if(!line){line={y:row.y,height:row.height,rows:[]};baselines.push(line);}
      line.rows.push(row);line.height=Math.max(line.height,row.height);
    }
    const result=[];
    for(const base of baselines){
      let line=null,previous=null;
      for(const row of base.rows.sort((a,b)=>a.x-b.x)){
        if(!line||row.x-previous.x-previous.width>Math.max(18,base.height*4)){
          line={y:base.y,height:base.height,rows:[]};result.push(line);
        }
        line.rows.push(row);previous=row;
      }
    }
    for(const line of result)line.text=line.rows.map(x=>x.text).join(' ');
    return result;
  }
  function marginKey(line,height) {return (line.y>height*.94?'top:':'bottom:')+anchorText(line.text).replace(/\d+/g,'#');}
  function marginSignatures(pages) {
    const counts=new Map();
    for(const page of pages){
      const height=page.height||page.view?.[3]-page.view?.[1];if(!height)continue;
      const keys=new Set(pdfLines(pdfRows(page.items)).filter(x=>(x.y>height*.94||x.y<height*.06)&&x.height<height*.018&&/[a-z]{4}/i.test(x.text)).map(x=>marginKey(x,height)));
      for(const key of keys)counts.set(key,(counts.get(key)||0)+1);
    }
    return new Set([...counts].filter(([,count])=>count>=2).map(([key])=>key));
  }
  function publicationFooterItems(items,pageHeight,context={}) {
    const rows=pdfRows(items);
    const excluded=new Set();if(rows.length<3)return excluded;
    const height=pageHeight||Math.max(...rows.map(x=>x.y+x.height));
    const weights=new Map();for(const row of rows.filter(x=>x.y>height*.36)){const size=Math.round(row.height*2)/2;weights.set(size,(weights.get(size)||0)+row.text.length);}
    const bodySize=[...weights].sort((a,b)=>b[1]-a[1])[0]?.[0];if(!bodySize)return excluded;
    // Small bibliographic running heads may be painted after the footer too.
    // Require a year plus a page range in the outer margin, not an author name alone.
    for(const row of rows.filter(x=>x.y>height*.92&&x.height<=bodySize*1.12&&/^.{3,160}\b\d+\s*\((?:18|19|20)\d{2}\)\s*\d+\s*[–−-]\s*\d+\s*$/.test(x.text))){
      for(const peer of rows.filter(x=>Math.abs(x.y-row.y)<=bodySize*.5&&x.height<=bodySize*1.12))excluded.add(peer.index);
    }
    for(const row of rows.filter(x=>x.y<height*.05&&x.height<=bodySize*1.12&&/^\d{1,4}$/.test(x.text)))excluded.add(row.index);
    const allLines=pdfLines(rows),remove=line=>line.rows.forEach(row=>excluded.add(row.index));
    // Elsevier's first-page article badge is painted after the body text despite
    // sitting beside the abstract. It must not interrupt the next-page sentence.
    if(context.firstPage&&rows.some(row=>/journal homepage:.*elsevier/i.test(row.text))){
      const last=rows.at(-1);
      if(last?.text==='T'&&last.height>bodySize*1.18)excluded.add(last.index);
    }
    for(const line of allLines){
      const margin=line.y>height*.94||line.y<height*.06;
      if(margin&&context.margins?.has(marginKey(line,height)))remove(line);
      if(line.y<height*.065&&(/(?:www\.|https?:\/\/|\|.*\b(?:Volume|Issue)\b)/i.test(line.text)||/\|\s*\((?:18|19|20)\d{2}\)\s*\d+\s*:\s*\d+/.test(line.text)))remove(line);
      if(line.y>height*(context.firstPage?.6:.94)&&/^https?:\/\/(?:dx\.)?doi\.org\/10\./i.test(line.text)){
        remove(line);for(const peer of allLines.filter(x=>Math.abs(x.y-line.y)<4&&/^Article$/i.test(x.text)))remove(peer);
      }
      if(context.firstPage&&/^(?:(?:Received|Accepted|Published(?: online)?)\s*:?\s*(?:\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})[.;]?|Check for updates)$/i.test(line.text))remove(line);
    }
    const maxX=Math.max(...rows.map(x=>x.x+x.width));
    for(const row of rows)if(row.x<maxX*.05&&/^1234567890[():,;]*$/.test(row.text.replace(/\s/g,'')))excluded.add(row.index);
    // Some journals put their first-page publication panel below the abstract,
    // above the introduction. Require a cluster of explicit metadata labels.
    if(context.firstPage)for(let i=0;i<allLines.length;i++){
      const first=allLines[i];if(!/^Citation\s*:/i.test(first.text)||first.height>bodySize*.9)continue;
      const block=[first];
      for(let j=i+1;j<allLines.length;j++){
        const line=allLines[j];if(line.height>first.height*1.12||block.at(-1).y-line.y>first.height*4)break;block.push(line);
      }
      if(block.filter(x=>/^(?:Citation|Editor|Received|Accepted|Funding|Competing Interests)\b/i.test(x.text)).length>=3)block.forEach(remove);
    }
    // Publication footnotes are selected spatially, not by PDF painting order.
    const lines=pdfLines(rows.filter(x=>x.y<height*.36&&!excluded.has(x.index)));
    const cue=/^(?:abbreviations?\s*:|[*∗†‡]?\s*correspond(?:ing|ence)\b|e[- ]?mail\s*(?:addresses?)?\s*:|(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:)|received\s+\d|accepted\s+\d|available\s+online\b|copyright\b|©|\d{4}-\d{3}[\dX]\s*\/)/i;
    for(let i=0;i<lines.length;i++){
      const candidate=lines[i];if(!cue.test(candidate.text))continue;
      const tail=lines.slice(i),block=tail.map(x=>x.text).join(' ');
      if(/^abbreviations?\s*:/i.test(candidate.text)&&!/(?:corresponding author|doi\.org|e[- ]?mail|received\s+\d|©)/i.test(block))continue;
      if(tail.some(line=>line.rows.some(x=>x.height>bodySize*.96))&&tail.filter(line=>cue.test(line.text)).length<2)continue;
      // Continuation lines must be small print. Explicit metadata lines may use
      // the abstract's font size (common in Elsevier first-page publication data).
      if(!tail.every(line=>line.rows.every(x=>x.height<=bodySize*(cue.test(line.text)?1.12:.96))))continue;
      // An email line can close a numbered affiliation block without an
      // explicit "Corresponding author" label (Nature-style first pages).
      if(/e[- ]?mail/i.test(block)){
        const above=[];for(let j=i-1;j>=0;j--){
          const line=lines[j],below=above[0]||candidate;
          if(line.y-below.y>bodySize*2.5||line.rows.some(x=>x.height>bodySize*.96))break;
          above.unshift(line);
        }
        if(/\b(?:University|Institute|Department|Medicine|Hospital)\b/i.test(above.map(x=>x.text).join(' ')))tail.unshift(...above);
      }
      tail.forEach(remove);
      break;
    }
    return excluded;
  }
  function sourceOffset(page,offset) {
    const spans=page.sourceSpans;
    if(!spans?.length)return offset;
    const span=spans.find(x=>offset>=x.start&&offset<x.end)||spans[spans.length-1];
    return offset+span.sourceStart-span.start;
  }
  function selectionOffset(items,selection,glyphs=[]) {
    // Offsets must refer to the unfiltered PDF stream, just like layoutUnits.
    const raw=items.map(item=>anchorText(item.str)).join(''),needle=anchorText(selection?.text);
    if(!needle)return -1;
    const matches=[];
    for(let at=raw.indexOf(needle);at>=0;at=raw.indexOf(needle,at+1))matches.push(at);
    const rects=selection?.position?.rects||[];
    const overlaps=(a,b)=>a?.length===4&&b?.length===4&&Math.min(a[2],b[2])-Math.max(a[0],b[0])>Math.min(a[2]-a[0],b[2]-b[0])*.25&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>Math.min(a[3]-a[1],b[3]-b[1])*.4;
    let offset=0,glyphText='';const hits=[];
    for(const glyph of glyphs){
      const text=anchorText(glyph.u??glyph.c??'');
      if(text&&rects.some(rect=>overlaps(glyph.rect,rect)))hits.push(offset);
      glyphText+=text;offset+=text.length;
    }
    const sourceHits=hits.map(hit=>{
      if(glyphText===raw)return hit;
      const start=Math.max(0,hit-32),context=glyphText.slice(start,hit+48),at=raw.indexOf(context);
      return at>=0&&raw.indexOf(context,at+1)<0?at+hit-start:-1;
    }).filter(hit=>hit>=0);
    if(sourceHits.length){
      // Font metrics can make a selection rectangle overlap an adjacent glyph.
      // Match its text as well as its geometry instead of taking the first hit.
      const found=matches.filter(at=>sourceHits.includes(at));
      if(found.length===1)return found[0];
      const crossing=sourceHits.filter(hit=>needle.startsWith(raw.slice(hit))&&raw.length>hit);
      if(crossing.length===1)return crossing[0];
    }
    const anchor=selection?.anchorOffset;
    if(Number.isInteger(anchor)&&anchor>=0){
      const found=matches.filter(at=>at<=anchor&&anchor<at+needle.length);
      if(found.length===1)return found[0];
      if(needle.startsWith(raw.slice(anchor))&&raw.length>anchor)return anchor;
    }
    // When a text layer is being repainted, use PDF-space rectangles to choose
    // between repeated phrases. Never guess the first occurrence of a word.
    if(rects.length){
      const spans=[];let start=0;
      for(const item of items){
        const length=anchorText(item.str).length,[,,,scale,x,y]=item.transform||[],height=Math.abs(item.height||scale||0);
        if(length&&Number.isFinite(x)&&Number.isFinite(y)&&height&&rects.some(rect=>overlaps([x,y-height*.25,x+(item.width||0),y+height],rect)))spans.push({start,end:start+length});
        start+=length;
      }
      const located=matches.filter(at=>spans.some(span=>at>=span.start&&at<span.end));
      if(located.length===1)return located[0];
      if(located.length>1||sourceHits.length)return -1;
    }
    return matches.length===1?matches[0]:-1;
  }
  function figureCaptionItems(items) {
    const rows=pdfRows(items),sizes=[],excluded=new Set();
    // Keep small caption print separate from body text on the same baseline.
    for(const row of rows){
      let group=sizes.find(g=>Math.abs(g.height-row.height)<g.height*.065);
      if(!group){group={height:row.height,rows:[]};sizes.push(group);}group.rows.push(row);
    }
    const lines=sizes.flatMap(group=>pdfLines(group.rows));
    const bounds=line=>({left:Math.min(...line.rows.map(x=>x.x)),right:Math.max(...line.rows.map(x=>x.x+x.width))});
    // Caption labels terminate the figure number with a period, colon or divider.
    // Body references such as "Fig. 1A" and "Fig. 1 shows" are not labels.
    const label=/^(?:(?:Supplementary|Extended Data)\s+)?Fig(?:ure)?\.?\s+S?\d+\s*[.:|](?:\s|$)/i;
    for(const first of lines.filter(line=>label.test(line.text))){
      const block=[first],seen=new Set(block),size=first.height;
      for(let i=0;i<block.length;i++){
        const previous=block[i],a=bounds(previous);
        for(const next of lines){
          if(seen.has(next)||next.y>first.y+size*.5||Math.abs(next.height-size)>size*.065)continue;
          const gap=previous.y-next.y,b=bounds(next);
          const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left);
          // Follow small-print lines beside the image and across full-width
          // continuations beneath it. Aligned columns may share a caption.
          const aligned=Math.abs(next.y-first.y)<size*.5;
          if((gap>size*.5&&gap<size*2.05&&overlap>size)||(aligned&&Math.abs(gap)<size*.5)){
            seen.add(next);block.push(next);
          }
        }
      }
      for(const line of block){
        const box=bounds(line);
        for(const row of rows)if(row.x>=box.left-size*.2&&row.x+row.width<=box.right+size*.2&&Math.abs(row.y-line.y)<size*.6&&row.height<=size*1.065)excluded.add(row.index);
      }
    }
    return excluded;
  }
  function paragraphLayout(items) {
    const lines=[];let offset=0,line=null,ended=true;
    for(const item of items){
      const length=anchorText(item.str).length;if(!length){if(item.hasEOL)ended=true;continue;}
      const x=item.transform?.[4],y=item.transform?.[5],height=Math.abs(item.height||item.transform?.[3]||0);
      if(!line||ended||Math.abs(y-line.y)>Math.max(height,line.height)*.55||x<line.x-height){line={x,y,height,fontName:item.fontName,right:x+(item.width||0),start:offset,text:''};lines.push(line);}
      line.right=Math.max(line.right,x+(item.width||0));line.height=Math.max(line.height,height);line.text+=item.str;offset+=length;ended=!!item.hasEOL;
    }
    const gaps=lines.slice(1).map((line,i)=>({line,previous:lines[i]}))
      .filter(({line,previous})=>Math.abs(line.x-previous.x)<line.height*4&&previous.y-line.y>line.height*.7&&previous.y-line.y<line.height*4)
      .map(({line,previous})=>(previous.y-line.y)/line.height).sort((a,b)=>a-b);
    const leading=gaps.length?gaps[Math.floor((gaps.length-1)/2)]:1.2;
    const starts=[],sentenceStarts=[];let startsParagraph=false;
    for(let i=0;i<lines.length;i++){
      const current=lines[i],previous=lines[i-1],h=current.height;if(!h)continue;
      const peers=lines.filter(x=>Math.abs(x.x-current.x)<h*3&&Math.abs(x.height-h)<h*.18),left=Math.min(...peers.map(x=>x.x)),width=Math.max(...peers.map(x=>x.right-left));
      const indent=current.x-left>h*.65&&current.x-left<h*3;
      if(!previous){startsParagraph=indent||h>(lines[1]?.height||h)*1.18;continue;}
      const sameColumn=Math.abs(current.x-previous.x)<h*4,gap=previous.y-current.y;
      const shortEnding=sameColumn&&previous.right-left<width*.87&&/[.!?。！？][”’"')」』]*$/.test(previous.text.trim());
      const fontChange=Math.max(h,previous.height)>Math.min(h,previous.height)*1.18||(current.fontName&&previous.fontName&&current.fontName!==previous.fontName&&previous.text.length<100&&gap>h*1.5);
      if(fontChange)sentenceStarts.push(current.start);
      if((sameColumn&&(gap>h*2.5||gap>h*leading*1.4&&gap>h*1.5))||(indent&&gap>h*.6)||(shortEnding&&gap>h*.6)||fontChange)starts.push(current.start);
    }
    return {paragraphStarts:starts,startsParagraph,sentenceStarts};
  }
  function pdfLayout(items,pageIndex,pageHeight,context={}) {
    const excluded=publicationFooterItems(items,pageHeight,{...context,firstPage:pageIndex===0}),kept=[],breaks=[],sourceSpans=[];
    if(context.skipCaptions!==false)for(const index of figureCaptionItems(items))excluded.add(index);
    let offset=0,originalOffset=0,previous=null,gap=false;
    for(let index=0;index<items.length;index++){
      const item=items[index],length=anchorText(item.str).length;
      if(excluded.has(index)){originalOffset+=length;if(length)gap=true;continue;}
      kept.push(item);if(!length)continue;
      const [,,,scale,x,y]=item.transform||[],height=Math.abs(item.height||scale||0);
      if(gap&&offset)breaks.push(offset);
      // PDF coordinates grow upwards: a move right and back up starts a new column.
      if(previous&&height&&Number.isFinite(x)&&Number.isFinite(y)){
        const h=Math.max(height,previous.height);
        if(x-previous.x>h*2&&y-previous.y>h*2&&!breaks.includes(offset))breaks.push(offset);
      }
      const last=sourceSpans.at(-1);
      if(last&&last.sourceStart+last.end-last.start===originalOffset)last.end+=length;
      else sourceSpans.push({start:offset,end:offset+length,sourceStart:originalOffset});
      offset+=length;originalOffset+=length;previous={x,y,height};gap=false;
    }
    const paragraphs=paragraphLayout(kept);
    return {text:pdfText(kept),pageIndex,breaks:[...new Set([...breaks,...paragraphs.paragraphStarts])].sort((a,b)=>a-b),sourceSpans,...paragraphs};
  }
  function layoutUnits(pages,selection=null,from=0) {
    const joined=cleanText(pages.map(p=>p.text).join(' ')),normalized=anchorText(joined),segments=[],paragraphStarts=[0],sentenceStarts=[];
    let offset=0;
    for(const page of pages){
      if(offset&&page.startsParagraph)paragraphStarts.push(offset);
      for(const at of page.sentenceStarts||[])sentenceStarts.push(offset+at);
      for(const at of page.paragraphStarts||[])paragraphStarts.push(offset+at);
      const length=anchorText(page.text).length,cuts=[0,...(page.breaks||[]).filter(x=>x>0&&x<length),length];
      for(let i=0;i<cuts.length-1;i++)if(cuts[i+1]>cuts[i])segments.push({start:offset+cuts[i],end:offset+cuts[i+1],pageIndex:page.pageIndex,pageStart:offset,page,sourceDelta:sourceOffset(page,cuts[i])-cuts[i]});
      offset+=length;
    }
    let text=selection===null?joined:cleanText(selection);
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
    if(selection!==null){
      // Selections may contain artificial spaces around font ligatures. Only remove
      // spaces where the geometrically reconstructed PDF has a continuous word.
      const source=joined.slice(rawOffset(joined,cursor),rawOffset(joined,cursor+anchorText(text).length)),joins=new Set();
      for(let i=0,n=0;i<source.length;i++){
        n+=anchorText(source[i]).length;
        if(/\p{L}/u.test(source[i])&&/\p{L}/u.test(source[i+1]||''))joins.add(n);
      }
      text=text.replace(/(\p{L})\s+(?=\p{L})/gu,(whole,letter,at)=>joins.has(anchorText(text.slice(0,at+letter.length)).length)?letter:whole);
    }
    // A heading without terminal punctuation must not become the start of the next body sentence.
    const protectedRanges=protectedTextRanges(text),cuts=[0,...sentenceStarts.filter(x=>x>cursor&&x<cursor+anchorText(text).length).map(x=>rawOffset(text,x-cursor)).filter(x=>!protectedRanges.some(r=>x>r.start&&x<r.end)),text.length];
    const sentenceList=cuts.slice(0,-1).flatMap((at,i)=>sentences(text.slice(at,cuts[i+1])));
    for(const sentence of sentenceList){
      const start=cursor,end=start+anchorText(sentence).length;cursor=end;
      // Silence citations before layout splitting, even when a reference itself
      // crosses a column/page. Keep string offsets unchanged for PDF anchoring.
      let masked=sentence;
      const ranges=protectedTextRanges(sentence);
      for(const range of ranges){
        if(range.keepFigures||range.figure&&ranges.some(r=>r.keepFigures&&range.start>=r.start&&range.end<=r.end))continue;
        const part=sentence.slice(range.start,range.end);
        if((range.silent||!speechText(part))&&!(/^[\[【]/.test(part)&&/[\p{L}]$/u.test(sentence.slice(0,range.start))))masked=masked.slice(0,range.start)+' '.repeat(range.end-range.start)+masked.slice(range.end);
      }
      for(const segment of segments){
        const a=Math.max(start,segment.start),b=Math.min(end,segment.end);if(a>=b)continue;
        const rawStart=rawOffset(sentence,a-start),rawEnd=rawOffset(sentence,b-start),highlightText=sentence.slice(rawStart,rawEnd).trim();
        let local=rawStart,anchorOffset=a-segment.pageStart+segment.sourceDelta;
        for(const part of chunks(highlightText)){
          const at=sentence.indexOf(part,local);local=at+part.length;
          const unitInPage=counts.get(segment.pageIndex)||0;counts.set(segment.pageIndex,unitInPage+1);
          units.push({text:part,speechSource:masked.slice(at,local),paragraphId:paragraphStarts.filter(x=>x<=a).at(-1)||0,spokenText:speechText(masked.slice(at,local),{keepFigures:true}),translationText:sentence,sentenceText:sentence,sentenceId:start,highlightText,highlightOffset:a-segment.pageStart+segment.sourceDelta,pageIndex:segment.pageIndex,anchorOffset,sentenceOffset:sourceOffset(segment.page,Math.max(0,start-segment.pageStart)),unitInPage});
          anchorOffset+=anchorText(part).length;
        }
      }
    }
    return units;
  }
  function unitIndex(units,current) {
    const start=current?.anchorOffset;
    if(Number.isInteger(start))return units.findIndex(u=>u.pageIndex===current.pageIndex&&u.anchorOffset<=start&&start<u.anchorOffset+anchorText(u.text).length);
    return units.findIndex(u=>u.pageIndex===current?.pageIndex&&anchorText(u.text).includes(anchorText(current?.text)));
  }
  function scopeUnits(units,current,mode,delta=0) {
    const at=unitIndex(units,current);if(at<0)return [];
    const key=mode==='sentence'?'sentenceId':'paragraphId';
    const group=u=>u[key]??u.sentenceId??u.anchorOffset;
    let target=at;
    if(delta<0){while(target>0&&group(units[target-1])===group(units[at]))target--;if(!target)return [];target--;}
    if(delta>0){while(target<units.length&&group(units[target])===group(units[at]))target++;if(target===units.length)return [];}
    const id=group(units[target]);while(target>0&&group(units[target-1])===id)target--;
    if(mode==='document')return units.slice(target);
    return units.slice(target).filter(u=>group(u)===id);
  }
  function afterUnit(units,current) {
    const end=(current.anchorOffset||0)+anchorText(current.text).length;
    const result=[];
    for(const unit of units){
      if(unit.pageIndex<current.pageIndex)continue;
      if(unit.pageIndex>current.pageIndex){result.push(unit);continue;}
      const skip=end-unit.anchorOffset,length=anchorText(unit.text).length;
      if(skip>=length)continue;if(skip<=0){result.push(unit);continue;}
      let cut=0,count=0;for(;cut<unit.text.length&&count<skip;cut++)count+=anchorText(unit.text[cut]).length;
      const raw=unit.text.slice(cut),text=raw.trimStart(),trim=raw.length-text.length;
      result.push({...unit,text,anchorOffset:end,spokenText:speechText((unit.speechSource||unit.text).slice(cut+trim),{keepFigures:unit.speechSource!==undefined}),speechSource:(unit.speechSource||unit.text).slice(cut+trim)});
    }
    return result;
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
  function completeSelection(items,selection,offset) {
    // Use the same unfiltered character offsets as PDF geometry and playback.
    // Keep Asian scripts as selected: extending them as a Latin word would
    // incorrectly select a whole Chinese/Japanese sentence.
    const source=pdfText(items),positions=[];let normalized='';
    for(let i=0;i<source.length;i++){
      const part=anchorText(source[i]);normalized+=part;
      for(let j=0;j<part.length;j++)positions.push(i);
    }
    const needle=anchorText(selection.text);if(!needle)return selection.text;
    let start=offset;
    if(!Number.isInteger(start)||start<0||normalized.slice(start,start+needle.length)!==needle){
      const at=normalized.indexOf(needle);
      if(at<0||normalized.indexOf(needle,at+1)>=0)return selection.text;
      start=at;
    }
    let a=positions[start],b=positions[start+needle.length-1]+1;
    if(a===undefined||!Number.isFinite(b))return selection.text;
    const letter=c=>!!c&&/[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{M}\p{N}]/u.test(c);
    const wordAt=i=>letter(source[i])||/['’‐‑-]/u.test(source[i]||'')&&letter(source[i-1])&&letter(source[i+1]);
    if(letter(source[a]))while(a>0&&wordAt(a-1))a--;
    if(letter(source[b-1]))while(b<source.length&&wordAt(b))b++;
    return cleanText(source.slice(a,b));
  }
  return { modes, voices, speechLanguages, detectSpeechLanguage, cleanText, chunks, sentences, rate, speechText, measurementSpeech, ratioSpeech, pdfText, pdfLayout, sourceOffset, selectionOffset, completeSelection, marginSignatures, layoutUnits, scopeUnits, afterUnit, unitIndex, selectedSentenceIndex, markSelectedSuperscripts, anchorText, pageUnits, resumeUnitIndex };
})();
if (typeof module !== 'undefined') module.exports = PaperVoiceCore;
