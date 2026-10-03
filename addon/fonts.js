/* Installed families only. Inspect rendered Han glyphs to distinguish a real
 * Chinese face from Gecko's automatic fallback to a different family. */
var PaperVoiceFonts = (() => {
 function discover(win) {
  const enumerator=Components.classes['@mozilla.org/gfx/fontenumerator;1'].createInstance(Components.interfaces.nsIFontEnumerator);
  const families=[...new Set(Array.from(enumerator.EnumerateAllFonts()).filter(x=>typeof x==='string'&&x.trim()))];
  const doc=win.document,container=doc.createElementNS('http://www.w3.org/1999/xhtml','div');
  container.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none;font-size:16px;';
  const rows=families.map(family=>{const span=doc.createElementNS('http://www.w3.org/1999/xhtml','span');span.style.fontFamily=JSON.stringify(family);span.textContent='中文阅读';container.append(span);return {family,span};});
  doc.documentElement.append(container);
  try {
   container.getBoundingClientRect();
   return rows.map(({family,span})=>{
    const range=doc.createRange();range.selectNodeContents(span);
    const faces=Array.from(win.InspectorUtils?.getUsedFontFaces(range)||[]);
    const chinese=faces.length>0&&faces.every(face=>face.CSSFamilyName?.toLocaleLowerCase()===family.toLocaleLowerCase());
    return {family,chinese};
   });
  }finally{container.remove();}
 }
 function history(value) {
  try{const data=JSON.parse(value||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}
 }
 function sorted(fonts,language,usage) {
  const collator=new Intl.Collator(language==='zh'?'zh-Hans-u-co-pinyin':language,{sensitivity:'base',numeric:true});
  const count=family=>Math.max(0,Number(usage[family])||0);
  return [...fonts].sort((a,b)=>(language==='zh'?Number(b.chinese)-Number(a.chinese):0)||count(b.family)-count(a.family)||collator.compare(a.family,b.family));
 }
 function defaultFamily(fonts,language,legacy='system') {
  const candidates=language==='zh'?(legacy==='serif'?['Songti SC','SimSun','Noto Serif CJK SC']:['PingFang SC','Microsoft YaHei','Noto Sans CJK SC']):(legacy==='serif'?['Georgia','Times New Roman']:['Segoe UI','Helvetica Neue','Arial']);
  return candidates.find(f=>fonts.some(x=>x.family===f))||sorted(fonts,language,{})[0]?.family||'';
 }
 function css(family){return family?JSON.stringify(family)+',system-ui,sans-serif':'system-ui,sans-serif';}
 return {discover,history,sorted,defaultFamily,css};
})();
if(typeof module!=='undefined')module.exports=PaperVoiceFonts;
