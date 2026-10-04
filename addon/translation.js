/* Free translation adapters. Prefer Translate for Zotero's documented public API.
 * Direct adapters use the same public website services; there are no API keys or paid fallbacks.
 * Reference: https://github.com/windingwind/zotero-pdf-translate (public api.translate contract).
 */
var PaperVoiceTranslation = {
 translationTerms(value,target) {
  // Protect a small, explicit scientific glossary and quantitative ranges.
  // Generic prose is still translated by the selected service.
  if(!['zh-Hans','zh-Hant'].includes(target))return {text:value,restore:text=>text};
  const definitions=[
   [/\bM\s*[üu]\s*l\s*l\s*e\s*r[ -]*(?:(?:glial[ -]+)?cells?|glia)\b/giu,'米勒细胞',/(?:穆勒|缪勒|穆雷|米勒)[的 ]*(?:胶质)?细胞/g],
   [/\bHenle(?:'s|’s)?[ -]+fib(?:er|re)[ -]+layer\b/gi,'亨勒纤维层'],
   [/\bHenle(?:'s|’s)?[ -]+fib(?:er|re)s?\b/gi,'亨勒纤维'],
   [/\bSchwann[ -]+cells?\b/gi,'施旺细胞'],
   [/\bastrocytes?\b/gi,'星形胶质细胞'],[/\bmicroglia(?:l[ -]+cells?)?\b/gi,'小胶质细胞'],
  ];
  if(/retin|fove|photoreceptor|ganglion|bipolar|müller|muller/i.test(value))definitions.push(
   [/\bretinal[ -]+pigment[ -]+epithelium\b/gi,'视网膜色素上皮'],
   [/\bganglion[ -]+cell[ -]+layer\b/gi,'神经节细胞层'],
   [/\binner[ -]+nuclear[ -]+layer\b/gi,'内核层'],[/\bouter[ -]+nuclear[ -]+layer\b/gi,'外核层'],
   [/\binner[ -]+plexiform[ -]+layer\b/gi,'内丛状层'],[/\bouter[ -]+plexiform[ -]+layer\b/gi,'外丛状层'],
   [/\bamacrine[ -]+cells?\b/gi,'无长突细胞'],[/\bbipolar[ -]+cells?\b/gi,'双极细胞'],[/\bhorizontal[ -]+cells?\b/gi,'水平细胞'],
   [/\bfoveola\b/gi,'中央凹小窝'],[/\bfovea\b/gi,'中央凹'],
  );
  const entries=[],traditional=text=>text.replace(/[细胶纤维层视网节丛极长]/g,x=>({'细':'細','胶':'膠','纤':'纖','维':'維','层':'層','视':'視','网':'網','节':'節','丛':'叢','极':'極','长':'長'}[x]));
  const mark=(source,term,alias)=>{const index=entries.length;entries.push({source,term:target==='zh-Hant'?traditional(term):term,alias});return '[PVG'+String(index).padStart(3,'0')+']';};
  let text=value.normalize('NFC');for(const [pattern,term,alias] of definitions)text=text.replace(pattern,source=>mark(source,term,alias));
  text=text.replace(/(?<![\p{L}\p{N}_.])((?:\d{1,3}(?:[,，]\d{3})+|\d+)(?:\.\d+)?)\s*[‒–—−~～-]\s*((?:\d{1,3}(?:[,，]\d{3})+|\d+)(?:\.\d+)?)(?![\p{L}\p{N}_]|\.\d)/gu,(source,a,b,at)=>{
   if(/(?:fig(?:ure)?s?\.?|table|version)\s*$/i.test(text.slice(Math.max(0,at-20),at))||/[-/]\d/.test(text.slice(at+source.length,at+source.length+4)))return source;
   return mark(source,a+'～'+b);
  });
  return {text,restore:translated=>{
   let result=translated.replace(/[\[（⟦]?\s*PVG\s*_?\s*(\d{3})\s*[\]）⟧]?/gi,(marker,index)=>entries[Number(index)]?.term||marker);
   for(const entry of entries){result=result.replaceAll(entry.source,entry.term);if(entry.alias)result=result.replace(entry.alias,entry.term);}
   return result.replace(/\[\s*PVG[^\]]*$/i,'').trim();
  }};
 },
 initTranslation() {this.translationCache=new Map();this.translationJobs=new Map();this.translationTicket=0;},
 toggleTranslation(enabled) {
  enabled=enabled ?? !this.get('translation',false);this.set('translation',enabled);this.translationTicket++;this.hideTranslation();this.syncSettings();
  if(enabled && this.currentUnit && this.currentReader && ['playing','paused','loading'].includes(this.state)){
    const reader=this.currentReader,unit=this.currentUnit,ticket=this.translationTicket,generation=this.generation;
    this.showTranslation(reader,unit,'正在翻译…');
    this.translate(unit.translationText||unit.text).then(result=>{if(ticket===this.translationTicket&&generation===this.generation&&this.get('translation',false))this.showTranslation(reader,unit,result.text,result.source);},error=>{if(ticket===this.translationTicket&&generation===this.generation)this.showTranslation(reader,unit,error.message||'翻译暂不可用');});
  }
 },
 async translate(text,sourceLanguage=null,options={}) {
  text=PaperVoiceCore.speechText(text);
  sourceLanguage=sourceLanguage||this.activeSpeechLanguage||this.speechLanguage?.()||'en';
  const provider=options.provider||this.get('translationProvider','tencenttransmart'),target=options.target||this.get('translationTarget','zh-Hans'),key=provider+'\0'+sourceLanguage+'\0'+target+'\0'+text;
  const glossary=this.translationTerms(text,target),requestText=glossary.text;
  if(provider==='llm'){const partial=options.onPartial;const result=await this.translateLLM(requestText,sourceLanguage,{...options,target,onPartial:partial?text=>partial(glossary.restore(text)):undefined});return {...result,text:glossary.restore(result.text)};}
  if(provider==='tencenttransmart'&&target==='zh-Hant')throw new Error('腾讯通道暂不提供繁体中文，请选择微软或 Google');
  const code=provider==='tencenttransmart'?(target==='zh-Hans'?'zh':target):provider==='google'?({'zh-Hans':'zh-CN','zh-Hant':'zh-TW'}[target]||target):target;
  if(this.translationCache.has(key))return this.translationCache.get(key);
  if(this.translationJobs.has(key))return this.translationJobs.get(key);
  const serviceName={bing:'微软翻译',tencenttransmart:'腾讯交互翻译',google:'Google 翻译'}[provider];
  const task=(async()=>{
   let result;
   if(Zotero.PDFTranslate?.api?.translate){
    let timeout;
    try{
     const translated=await Promise.race([Zotero.PDFTranslate.api.translate(requestText,{pluginID:this.id,service:provider,langfrom:sourceLanguage,langto:code}),new Promise((_,reject)=>{timeout=this.host.setTimeout(()=>reject(new Error('翻译超时')),12000);})]);
     if(typeof translated?.result==='string' && translated.result.trim() && translated.status!=='error' && !/^\s*\[Request Error\]/i.test(translated.result))result={text:translated.result,source:serviceName+' · Translate for Zotero'};
    }catch(_){}finally{if(timeout)this.host.clearTimeout(timeout);}
   }
   if(!result){
    const headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'};
    let translated;
    if(provider==='google'){
      const endpoint='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+encodeURIComponent(sourceLanguage)+'&tl='+encodeURIComponent(code)+'&dt=t';
      headers['Content-Type']='application/x-www-form-urlencoded';
      let response;
      for(let attempt=0;attempt<2;attempt++){
       try{response=await Zotero.HTTP.request('POST',endpoint,{headers,body:'q='+encodeURIComponent(requestText),responseType:'json',timeout:12000,errorDelayMax:0,logBody:false});break;}
       catch(error){
        const transient=error.status===0||/timed? ?out|timeout|network/i.test(String(error));
        if(attempt||!transient)throw new Error('Google 暂时连接失败，请重试或切换腾讯 / 微软翻译');
       }
      }
      translated=response.response?.[0]?.map(x=>x[0]).join('');
    }else{
      const endpoint=provider==='bing'?'https://edge.microsoft.com/translate/translatetext?from='+encodeURIComponent(sourceLanguage)+'&to='+encodeURIComponent(code)+'&isEnterpriseClient=false':'https://transmart.qq.com/api/imt';
      const body=provider==='bing'?[requestText]:{header:{fn:'auto_translation',client_key:'browser-chrome-131.0.0-Mac OS-paper-voice'},type:'plain',model_category:'normal',source:{lang:sourceLanguage,text_list:[requestText]},target:{lang:code}};
      if(provider==='tencenttransmart')headers.Referer='https://transmart.qq.com/zh-CN/index';
      const response=await Zotero.HTTP.request('POST',endpoint,{body:JSON.stringify(body),headers,responseType:'json',timeout:12000,errorDelayMax:0,logBody:false});
      translated=provider==='bing'?response.response?.[0]?.translations?.[0]?.text:response.response?.auto_translation?.join('\n');
    }
    if(typeof translated!=='string' || !translated.trim())throw new Error('免费翻译服务暂不可用，请更换服务或译文语言');
    result={text:translated.trim(),source:serviceName+' · 免费通道'};
   }
   result={...result,text:glossary.restore(result.text)};
   if(this.translationCache.size>=300)this.translationCache.delete(this.translationCache.keys().next().value);
   this.translationCache.set(key,result);return result;
  })();
  this.translationJobs.set(key,task);
  try{return await task;}finally{this.translationJobs.delete(key);}
 },
 selectionAnchor(reader,position) {
  // Zotero supplies PDF-space selection rectangles. Resolve the actual selected
  // glyph, not the first matching word/letter elsewhere on the page.
  try{
   if(!Number.isInteger(position?.pageIndex)||!position.rects?.length)return null;
   const win=reader._internalReader?._primaryView?._iframeWindow,doc=win?.document;
   const page=doc?.querySelector(`.page[data-page-number="${position.pageIndex+1}"]`),view=win?.PDFViewerApplication?.pdfViewer?.getPageView(position.pageIndex);
   if(!page||!view?.viewport)return null;
   const bounds=page.getBoundingClientRect(),targets=position.rects.map(rect=>{
    const [x1,y1,x2,y2]=view.viewport.convertToViewportRectangle(Components.utils.cloneInto(Array.from(rect),win));
    return {left:bounds.left+page.clientLeft+Math.min(x1,x2),right:bounds.left+page.clientLeft+Math.max(x1,x2),top:bounds.top+page.clientTop+Math.min(y1,y2),bottom:bounds.top+page.clientTop+Math.max(y1,y2)};
   });
   const overlaps=(r,t)=>Math.min(r.right,t.right)-Math.max(r.left,t.left)>Math.min(r.width,t.right-t.left)*.25&&Math.min(r.bottom,t.bottom)-Math.max(r.top,t.top)>Math.min(r.height,t.bottom-t.top)*.4;
   let offset=0;
   for(const span of page.querySelectorAll('.textLayer span[role="presentation"]')){
    const text=span.textContent||'',targetsHere=targets.filter(t=>overlaps(span.getBoundingClientRect(),t));
    for(let i=0;i<text.length;i++){
     const length=PaperVoiceCore.anchorText(text[i]).length;
     if(targetsHere.length&&span.firstChild?.nodeType===3){
      const range=doc.createRange();range.setStart(span.firstChild,i);range.setEnd(span.firstChild,i+1);
      if(targetsHere.some(t=>overlaps(range.getBoundingClientRect(),t)))return Math.max(0,offset-(length?0:1));
     }
     offset+=length;
    }
   }
  }catch(_){}
  return null;
 },
 findSentence(reader,unit) {
  const view=reader._internalReader?._primaryView,doc=view?._iframeWindow?.document;
  if(!doc)return null;
  const pages=unit.pageIndex!==null && unit.pageIndex!==undefined?[doc.querySelector(`.page[data-page-number="${unit.pageIndex+1}"]`)]:Array.from(doc.querySelectorAll('.page'));
  const normalize=s=>s.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const needle=normalize(unit.text);if(!needle)return null;
  for(const page of pages.filter(Boolean)){
   const spans=Array.from(page.querySelectorAll('.textLayer span[role="presentation"]')).filter(x=>x.textContent);
   let joined='',positions=[];
   for(const span of spans)for(let offset=0;offset<span.textContent.length;offset++){
    const char=normalize(span.textContent[offset]);joined+=char;for(let k=0;k<char.length;k++)positions.push({span,offset});
   }
   let index=joined.indexOf(needle,Number.isInteger(unit.anchorOffset)?unit.anchorOffset:0);
   if(index<0)index=joined.indexOf(needle);if(index<0)continue;
   const a=positions[index],b=positions[index+needle.length-1];
   const range=doc.createRange();range.setStart(a.span.firstChild,a.offset);range.setEnd(b.span.firstChild,b.offset+1);
   const rects=Array.from(range.getClientRects()).filter(x=>x.width>0&&x.height>0);
   if(rects.length)return {view,doc,page,spans,rects,first:a.span,range};
  }
  return null;
 },
 readingBlocks(match) {
  // DOM reading order can jump from the foot of the left column to the top of
  // the right. Treat those as separate anchors, not one tall bounding box.
  const blocks=[];
  for(const rect of match.rects){
   const block=blocks.at(-1),previous=block?.rects.at(-1);
   const gap=block?Math.max(rect.left-block.right,block.left-rect.right):0;
   const lineHeight=Math.max(rect.height,previous?.height||0);
   const columnJump=block&&gap>lineHeight&&
    (rect.top<previous.top-lineHeight*.6||Math.abs(rect.top-previous.top)<lineHeight*.5&&gap>lineHeight*2);
   if(!block||columnJump)blocks.push({left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,rects:[rect]});
   else {block.left=Math.min(block.left,rect.left);block.right=Math.max(block.right,rect.right);block.top=Math.min(block.top,rect.top);block.bottom=Math.max(block.bottom,rect.bottom);block.rects.push(rect);}
  }
  return blocks;
 },
 readingColumn(match,block) {
  const h=Math.max(1,...block.rects.map(r=>r.height)),rows=[];
  // Use complete text-layer lines around the active passage, rather than the
  // selected words or a fixed fraction of the page. This also handles mixed layouts.
  for(const span of match.spans||[]){
   for(const r of span.getClientRects()){
    if(!r.width||r.height<h*.65||r.height>h*1.45||r.bottom<block.top-h*10||r.top>block.bottom+h*10)continue;
    let row=rows.find(x=>Math.abs(x.y-(r.top+r.bottom)/2)<h*.4);
    if(!row){row={y:(r.top+r.bottom)/2,rects:[]};rows.push(row);}row.rects.push(r);
   }
  }
  const lines=[];
  for(const row of rows){
   row.rects.sort((a,b)=>a.left-b.left);let line=null;
   for(const r of row.rects){
    if(!line||r.left-line.right>h*1.35){line={left:r.left,right:r.right,top:r.top,bottom:r.bottom,row};lines.push(line);}
    else {line.right=Math.max(line.right,r.right);line.top=Math.min(line.top,r.top);line.bottom=Math.max(line.bottom,r.bottom);}
   }
  }
  const touches=(line,r)=>line.left<r.right+1&&line.right>r.left-1&&line.top<r.bottom&&line.bottom>r.top;
  const anchored=lines.filter(line=>block.rects.some(r=>touches(line,r)));
  const seed=anchored.sort((a,b)=>(b.right-b.left)-(a.right-a.left))[0];
  if(!seed)return {left:block.left,right:block.right};
  const aligned=lines.filter(line=>Math.abs(line.left-seed.left)<h*2.5);
  let leftLimit=-Infinity,rightLimit=Infinity;
  for(const line of aligned){
   for(const other of lines){
    if(other.row!==line.row)continue;
    if(other.right<line.left-h*1.35)leftLimit=Math.max(leftLimit,other.right+h*.5);
    if(other.left>line.right+h*1.35)rightLimit=Math.min(rightLimit,other.left-h*.5);
   }
  }
  // Full-width headings above a multi-column body must not widen its caption.
  const column=aligned.filter(line=>line.left>=leftLimit&&line.right<=rightLimit);
  if(!column.length)return {left:seed.left,right:seed.right};
  return {left:Math.min(...column.map(line=>line.left)),right:Math.max(...column.map(line=>line.right))};
 },
 async highlightSentence(reader,unit,generation) {
  const target={...unit,text:unit.highlightText||unit.sentenceText||unit.text,anchorOffset:unit.highlightOffset??unit.sentenceOffset},previous=this.sentenceHighlight;
  if(previous?.layer?.isConnected&&previous.reader===reader&&previous.unit.pageIndex===target.pageIndex&&previous.unit.text===target.text&&previous.unit.anchorOffset===target.anchorOffset){
   previous.focusUnit=unit;const focus=this.findSentence(reader,unit);if(focus)await this.focusReadingPosition(focus);return;
  }
  this.clearSentenceHighlight();
  const active={markers:[],reader,unit:target,focusUnit:unit};
  this.sentenceHighlight=active;
  let match;
  // Navigate each spoken unit when its page is absent/offscreen, including selected passages.
  const view=reader._internalReader?._primaryView,viewer=view?._iframeWindow?.PDFViewerApplication?.pdfViewer;
  if(Number.isInteger(unit.pageIndex)&&viewer?.currentPageNumber!==unit.pageIndex+1)await reader.navigate({pageIndex:unit.pageIndex});
  for(let attempt=0;attempt<40;attempt++){
   if(this.sentenceHighlight!==active||generation!==this.generation||this.dead)return;
   match=this.findSentence(reader,active.unit)||this.findSentence(reader,unit);if(match)break;
   await Zotero.Promise.delay(75);
  }
  if(!match||this.sentenceHighlight!==active)return;
  const win=match.doc.defaultView;active.win=win;
  const focus=this.findSentence(reader,unit)||match;
  await this.focusReadingPosition(focus);
  if(this.sentenceHighlight!==active||generation!==this.generation||this.dead)return;
  const draw=()=>{
   active.raf=undefined;if(this.sentenceHighlight!==active)return;
   const current=this.findSentence(reader,active.unit)||this.findSentence(reader,active.focusUnit);
   // PDF.js can temporarily remove the text layer during zoom. Preserve the
   // page-anchored geometry until the new layer is ready, rather than flashing.
   if(!current)return;
   const page=current.page,bounds=page.getBoundingClientRect();
   const scaleX=bounds.width/page.offsetWidth||1,scaleY=bounds.height/page.offsetHeight||1;
   if(!active.layer||active.layer.parentElement!==page){
    const layer=current.doc.createElement('div');layer.dataset.paperVoice='highlight-layer';
    layer.style.cssText='pointer-events:none;position:absolute;inset:0;z-index:8;overflow:hidden;';
    page.append(layer);active.layer?.remove();active.layer=layer;active.markers=[];
   }
   const rects=current.rects.filter((rect,i,all)=>!all.slice(0,i).some(r=>Math.abs(r.left-rect.left)<.1&&Math.abs(r.top-rect.top)<.1&&Math.abs(r.width-rect.width)<.1&&Math.abs(r.height-rect.height)<.1));
   for(let i=0;i<rects.length;i++){
    const rect=rects[i];let marker=active.markers[i];
    if(!marker){marker=current.doc.createElement('div');marker.dataset.paperVoice='sentence-highlight';active.layer.append(marker);active.markers.push(marker);}
    const style=`pointer-events:none;position:absolute;left:${(rect.left-bounds.left)/scaleX-page.clientLeft-1}px;top:${(rect.top-bounds.top)/scaleY-page.clientTop}px;width:${rect.width/scaleX+2}px;height:${rect.height/scaleY}px;background:${this.theme?.().highlight||'#e3b84138'};border-radius:3px;`;
    if(marker.getAttribute('style')!==style)marker.setAttribute('style',style);
   }
   while(active.markers.length>rects.length)active.markers.pop().remove();
  };
  active.redraw=()=>{if(active.raf===undefined)active.raf=win.requestAnimationFrame(draw);};
  // The highlight lives on the PDF page and therefore scrolls with the text
  // without any event-driven removal or viewport-coordinate repositioning.
  win.addEventListener('resize',active.redraw);
  const viewerRoot=reader._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfViewer?.viewer;
  if(viewerRoot){
   active.observer=new this.host.MutationObserver(records=>{
    if(records.some(r=>r.target.closest?.('.textLayer')||r.type==='attributes'&&r.target.matches?.('.page')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('.page,.textLayer')||n.querySelector?.('.textLayer')))))active.redraw();
   });
   active.observer.observe(viewerRoot,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  }
  draw();
 },
 async focusReadingPosition(match) {
  const win=match.view._iframeWindow,viewer=win.PDFViewerApplication?.pdfViewer;
  const container=viewer?.container||match.doc.scrollingElement;if(!container)return;
  const bounds=container.getBoundingClientRect(),height=container.clientHeight||win.innerHeight,width=container.clientWidth||win.innerWidth;
  const block=this.readingBlocks(match)[0],top=block.top-bounds.top;
  const left=block.left-bounds.left,right=block.right-bounds.left;
  const targetLeft=left<width*.08||right>width*.92?Math.max(0,container.scrollLeft+left-width*.12):container.scrollLeft;
  // Keep the spoken passage near the upper-middle, leaving space for following lines.
  // A comfort band avoids tiny scrolls at every sentence and permits ordinary browsing.
  if(top<height*.22||top>height*.50||block.bottom-bounds.top>height*.78||targetLeft!==container.scrollLeft){
   const target=container.scrollTop+top-height*.34;
   const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   const distant=Math.abs(target-container.scrollTop)>height*.6||Math.abs(targetLeft-container.scrollLeft)>width*.35;
   this.caption?.layout();
   // Zotero's privileged/plugin realm must pass a content-realm options dictionary.
   container.scrollTo(Components.utils.cloneInto({top:Math.max(0,target),left:targetLeft,behavior:reduced||distant?'instant':'smooth'},win));
   // Keep the source in place before audio begins, but bound scrolling to a
   // brief sentence transition instead of adding a half-second playback gap.
   const generation=this.generation;
   for(let i=0;i<4;i++){
    await Zotero.Promise.delay(40);
    if(this.generation!==generation||this.dead)return;
    const expectedTop=Math.max(0,Math.min(target,container.scrollHeight-height)),expectedLeft=Math.max(0,Math.min(targetLeft,container.scrollWidth-width));
    if(Math.abs(container.scrollTop-expectedTop)<1&&Math.abs(container.scrollLeft-expectedLeft)<1)break;
   }
   if(this.generation!==generation||this.dead)return;
   container.scrollTo(Components.utils.cloneInto({top:Math.max(0,target),left:targetLeft,behavior:'instant'},win));
   await Zotero.Promise.delay(40);
  }
 },
 clearSentenceHighlight() {
  const active=this.sentenceHighlight;this.sentenceHighlight=null;if(!active)return;
  if(active.win){active.win.removeEventListener('resize',active.redraw);if(active.raf!==undefined)active.win.cancelAnimationFrame(active.raf);}
  active.observer?.disconnect();active.layer?.remove();active.markers.forEach(marker=>marker.remove());
 },
 showTranslation(reader,unit,text,source='') {
  if(!this.get('translation',false))return;
  const frame=reader._internalReader?._primaryView?._iframe,doc=reader._iframeWindow.document;
  if(!frame)return;
  let c=this.caption;
  if(c?.reader!==reader){this.hideTranslation();c=null;}
  if(!c){
   const box=doc.createElement('div');box.dataset.paperVoice='translation';box.className='pv-caption';
   box.setAttribute('role','status');box.setAttribute('aria-label','显示译文');
   box.style.cssText='position:absolute;z-index:20;box-sizing:border-box;padding:7px 10px;background:light-dark(rgba(248,250,245,var(--pv-caption-opacity,.88)),rgba(36,55,47,var(--pv-caption-opacity,.88)));backdrop-filter:blur(22px) saturate(135%);-webkit-backdrop-filter:blur(22px) saturate(135%);color:light-dark(#253c33,#edf2e9);border:0;border-radius:12px;font:12px/1.45 system-ui,sans-serif;box-shadow:0 4px 20px #15342922;overflow:auto;scrollbar-width:none;overflow-wrap:anywhere;transition:opacity 120ms ease;';
   this.applyCaptionTypography(box);
   box.style.setProperty('--pv-caption-opacity',String(this.surfaceOpacity?.()??.88));
   this.applyTheme?.(box,true);
   const original={height:frame.style.height,width:frame.style.width,display:frame.style.display};
   const pdfWindow=reader._internalReader._primaryView._iframeWindow;
   c=this.caption={box,frame,original,reader,pdfWindow,inline:true,timer:null};
   frame.parentElement.append(box);
   // Keep the caption visible while geometry changes. All events in one
   // rendering frame share one measurement; unrelated annotation/UI mutations
   // must not restart the appearance transition.
   box.style.visibility='hidden';box.style.opacity='0';
   c.layout=event=>{
    if(event?.target&&box.contains(event.target))return;
    if(c.raf!==undefined)return;
    c.raf=pdfWindow.requestAnimationFrame(()=>{c.raf=undefined;if(this.caption===c)this.positionTranslation(c);});
   };
   pdfWindow.addEventListener('scroll',c.layout,true);pdfWindow.addEventListener('resize',c.layout);
   const viewerRoot=pdfWindow.PDFViewerApplication?.pdfViewer?.viewer;
   if(viewerRoot){
    c.observer=new this.host.MutationObserver(records=>{
     if(records.some(r=>r.target.closest?.('.textLayer')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('.page,.textLayer')||n.querySelector?.('.textLayer')))))c.layout();
    });
    c.observer.observe(viewerRoot,{childList:true,subtree:true});
   }
   c.layout();
  }
  if(c.unit&&c.unit!==unit)c.layout();
  c.box.lang=this.get('translationTarget','zh-Hans');c.box.setAttribute('aria-label',(this.t?.('显示译文')||'显示译文')+' · '+(this.translationLanguage?.().label||c.box.lang));
  c.unit=unit;const content=source?text:(this.t?.(text)||text);if(c.box.textContent!==content)c.box.textContent=content;c.box.title=this.t?.(source||'显示译文')||(source||'显示译文');c.box.dataset.provider=source;
  this.positionTranslation(c);
 },
 positionTranslation(c) {
  if(this.caption!==c)return;
  const {box,frame,reader}=c,match=this.findSentence(reader,c.unit);
  if(!match){if(!c.missingSince)c.missingSince=Date.now();if(!c.positioned||Date.now()-c.missingSince>250)box.style.visibility='hidden';else if(c.timer===null)c.timer=this.host.setTimeout(()=>{c.timer=null;c.layout();},260);return;}
  c.missingSince=null;
  const fr=frame.getBoundingClientRect(),parent=frame.parentElement.getBoundingClientRect();
  const blocks=this.readingBlocks(match);
  // Prefer the leading visible part of this spoken chunk. In a two-column
  // sentence, the final DOM rectangle may be at the top of the opposite column.
  const block=blocks.find(part=>part.rects.some(r=>r.bottom>0&&r.top<fr.height&&r.right>0&&r.left<fr.width));
  if(!block){box.style.visibility='hidden';return;}
  const column=this.readingColumn(match,block);
  box.style.visibility='visible';box.style.opacity='1';c.positioned=true;
  // Follow the current source directly. Covering subsequent unread text is intentional;
  // the original PDF viewport keeps its full width and height.
  const left=Math.max(12,column.left),right=Math.min(fr.width-12,column.right);
  const width=Math.max(1,right-left);
  box.style.width=width+'px';box.style.maxHeight=Math.max(56,fr.height*.55)+'px';
  const height=box.getBoundingClientRect().height;
  let top=block.bottom+8;c.inline=true;box.dataset.placement='below-source';
  if(this.get('captionPlacement','below')==='above'){
   const room=block.top-20;
   if(room<24){box.style.visibility='hidden';return;}
   box.style.maxHeight=Math.min(fr.height*.55,room)+'px';
   top=block.top-box.getBoundingClientRect().height-8;box.dataset.placement='above-source';
  }else if(top+height>fr.height-12&&block.top-height-8>=12){
   top=block.top-height-8;box.dataset.placement='above-source';
  }else if(top+height>fr.height-12){
   box.style.maxHeight=Math.max(56,fr.height-top-12)+'px';
  }
  box.style.left=(fr.left-parent.left+left)+'px';box.style.top=(fr.top-parent.top+top)+'px';
 },
 hideTranslation() {
  const c=this.caption;if(!c)return;this.caption=null;
  c.pdfWindow.removeEventListener('scroll',c.layout,true);c.pdfWindow.removeEventListener('resize',c.layout);
  if(c.timer!==null)this.host.clearTimeout(c.timer);if(c.raf!==undefined)c.pdfWindow.cancelAnimationFrame(c.raf);c.observer?.disconnect();
  c.box.style.opacity='0';c.box.style.pointerEvents='none';
  if(this.dead||c.pdfWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches)c.box.remove();
  else this.host.setTimeout(()=>c.box.remove(),160);
 },
};
