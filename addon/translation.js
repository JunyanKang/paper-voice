/* Free translation adapters. Prefer Translate for Zotero's documented public API.
 * Direct adapters use the same public website services; there are no API keys or paid fallbacks.
 * Reference: https://github.com/windingwind/zotero-pdf-translate (public api.translate contract).
 */
var PaperVoiceTranslation = {
 initTranslation() {this.translationCache=new Map();this.translationJobs=new Map();this.translationTicket=0;},
 toggleTranslation(enabled) {
  enabled=enabled ?? !this.get('translation',false);this.set('translation',enabled);this.translationTicket++;this.hideTranslation();this.syncSettings();
  if(enabled && this.currentUnit && this.currentReader && ['playing','paused','loading'].includes(this.state)){
    const reader=this.currentReader,unit=this.currentUnit,ticket=this.translationTicket,generation=this.generation;
    this.showTranslation(reader,unit,'正在翻译…');
    this.translate(unit.text).then(result=>{if(ticket===this.translationTicket&&generation===this.generation&&this.get('translation',false))this.showTranslation(reader,unit,result.text,result.source);},error=>{if(ticket===this.translationTicket&&generation===this.generation)this.showTranslation(reader,unit,error.message||'翻译暂不可用');});
  }
 },
 async translate(text) {
  text=PaperVoiceCore.speechText(text);
  const provider=this.get('translationProvider','tencenttransmart'),target=this.get('translationTarget','zh-Hans'),key=provider+'\0'+target+'\0'+text;
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
     const translated=await Promise.race([Zotero.PDFTranslate.api.translate(text,{pluginID:this.id,service:provider,langfrom:'en',langto:code}),new Promise((_,reject)=>{timeout=this.host.setTimeout(()=>reject(new Error('翻译超时')),12000);})]);
     if(translated?.result && translated.status!=='error')result={text:translated.result,source:serviceName+' · Translate for Zotero'};
    }catch(_){}finally{if(timeout)this.host.clearTimeout(timeout);}
   }
   if(!result){
    const headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'};
    let translated;
    if(provider==='google'){
      const endpoint='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='+encodeURIComponent(code)+'&dt=t';
      headers['Content-Type']='application/x-www-form-urlencoded';
      let response;
      for(let attempt=0;attempt<2;attempt++){
       try{response=await Zotero.HTTP.request('POST',endpoint,{headers,body:'q='+encodeURIComponent(text),responseType:'json',timeout:12000,logBody:false});break;}
       catch(error){
        const transient=error.status===0||/timed? ?out|timeout|network/i.test(String(error));
        if(attempt||!transient)throw new Error('Google 暂时连接失败，请重试或切换腾讯 / 微软翻译');
       }
      }
      translated=response.response?.[0]?.map(x=>x[0]).join('');
    }else{
      const endpoint=provider==='bing'?'https://edge.microsoft.com/translate/translatetext?from=en&to='+encodeURIComponent(code)+'&isEnterpriseClient=false':'https://transmart.qq.com/api/imt';
      const body=provider==='bing'?[text]:{header:{fn:'auto_translation',client_key:'browser-chrome-131.0.0-Mac OS-paper-voice'},type:'plain',model_category:'normal',source:{lang:'en',text_list:[text]},target:{lang:code}};
      if(provider==='tencenttransmart')headers.Referer='https://transmart.qq.com/zh-CN/index';
      const response=await Zotero.HTTP.request('POST',endpoint,{body:JSON.stringify(body),headers,responseType:'json',timeout:12000,logBody:false});
      translated=provider==='bing'?response.response?.[0]?.translations?.[0]?.text:response.response?.auto_translation?.join('\n');
    }
    if(typeof translated!=='string' || !translated.trim())throw new Error('免费翻译服务暂不可用，请更换服务或译文语言');
    result={text:translated.trim(),source:serviceName+' · 免费通道'};
   }
   if(this.translationCache.size>=300)this.translationCache.delete(this.translationCache.keys().next().value);
   this.translationCache.set(key,result);return result;
  })();
  this.translationJobs.set(key,task);
  try{return await task;}finally{this.translationJobs.delete(key);}
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
 async highlightSentence(reader,unit,generation) {
  this.clearSentenceHighlight();
  const active={markers:[],reader,unit:{...unit,text:unit.sentenceText||unit.text,anchorOffset:unit.sentenceOffset},focusUnit:unit};
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
  this.focusReadingPosition(focus);
  const draw=()=>{
   active.timer=null;if(this.sentenceHighlight!==active)return;
   active.markers.forEach(marker=>marker.remove());active.markers=[];
   const current=this.findSentence(reader,active.unit)||this.findSentence(reader,active.focusUnit);if(!current)return;
   for(const rect of current.rects){
    if(rect.bottom<0||rect.top>win.innerHeight)continue;
    const marker=current.doc.createElement('div');marker.dataset.paperVoice='sentence-highlight';
    marker.style.cssText=`pointer-events:none;position:fixed;z-index:8;left:${rect.left-1}px;top:${rect.top}px;width:${rect.width+2}px;height:${rect.height}px;background:#e3b84138;border-radius:3px;`;
    current.doc.body.append(marker);active.markers.push(marker);
   }
  };
  active.redraw=()=>{if(active.timer===null||active.timer===undefined)active.timer=win.setTimeout(draw,40);};
  win.addEventListener('scroll',active.redraw,true);win.addEventListener('resize',active.redraw);
  draw();
 },
 focusReadingPosition(match) {
  const win=match.view._iframeWindow,viewer=win.PDFViewerApplication?.pdfViewer;
  const container=viewer?.container||match.doc.scrollingElement;if(!container)return;
  const bounds=container.getBoundingClientRect(),height=container.clientHeight||win.innerHeight;
  const first=match.rects[0],last=match.rects.at(-1),top=first.top-bounds.top;
  // Keep the spoken passage near the upper-middle, leaving space for following lines.
  // A comfort band avoids tiny scrolls at every sentence and permits ordinary browsing.
  if(top<height*.22||top>height*.50||last.bottom-bounds.top>height*.78){
   const target=container.scrollTop+top-height*.34;
   const reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   // Zotero's privileged/plugin realm must pass a content-realm options dictionary.
   container.scrollTo(Components.utils.cloneInto({top:Math.max(0,target),left:container.scrollLeft,behavior:reduced?'instant':'smooth'},win));
  }
 },
 clearSentenceHighlight() {
  const active=this.sentenceHighlight;this.sentenceHighlight=null;if(!active)return;
  if(active.win){active.win.removeEventListener('scroll',active.redraw,true);active.win.removeEventListener('resize',active.redraw);if(active.timer)active.win.clearTimeout(active.timer);}
  active.markers.forEach(marker=>marker.remove());
 },
 showTranslation(reader,unit,text,source='') {
  if(!this.get('translation',false))return;
  this.hideTranslation();
  const frame=reader._internalReader?._primaryView?._iframe,doc=reader._iframeWindow.document;
  if(!frame)return;
  const box=doc.createElement('div');box.dataset.paperVoice='translation';box.className='pv-caption';
  box.style.cssText='position:absolute;z-index:20;box-sizing:border-box;padding:12px 17px;background:light-dark(#f8faf5,#24372f);color:light-dark(#253c33,#edf2e9);border:1px solid #92a89a66;border-radius:10px;font:15px/1.65 system-ui,sans-serif;box-shadow:0 3px 14px #15342917;overflow:auto;scrollbar-width:none;';
  const english=doc.createElement('div');english.style.cssText='font-size:12px;line-height:1.45;opacity:.65;margin-bottom:5px;max-height:38px;overflow:auto;scrollbar-width:none;';english.textContent=unit.text;
  const chinese=doc.createElement('div');chinese.textContent=text;
  const credit=doc.createElement('div');credit.style.cssText='font-size:10px;opacity:.6;margin-top:5px;';credit.textContent=source || '跟读译文';
  box.append(english,chinese,credit);
  const parent=frame.parentElement,frameRect=frame.getBoundingClientRect();
  const match=this.findSentence(reader,unit);
  // Use a local gap only if the complete caption fits above every subsequent visible text line.
  const last=match?.rects.at(-1);let inline=false;
  const blankCanvas=(left,top,width,height)=>{
    try{
      const canvas=match.page.querySelector('canvas'),r=canvas.getBoundingClientRect();
      const sx=canvas.width/r.width,sy=canvas.height/r.height;
      if(left<r.left||top<r.top||left+width>r.right||top+height>r.bottom)return false;
      const pixels=canvas.getContext('2d').getImageData(Math.floor((left-r.left)*sx),Math.floor((top-r.top)*sy),Math.ceil(width*sx),Math.ceil(height*sy));
      for(let y=0;y<pixels.height;y+=5)for(let x=0;x<pixels.width;x+=5){const i=(y*pixels.width+x)*4;if(pixels.data[i+3]>20&&Math.min(pixels.data[i],pixels.data[i+1],pixels.data[i+2])<235)return false;}
      return true;
    }catch(_){return false;}
  };
  if(last){
   const following=match.spans.map(s=>s.getBoundingClientRect()).filter(r=>r.top>=last.bottom-1 && r.right>last.left && r.left<last.left+460);
   const nextTop=Math.min(...following.map(r=>r.top),match.page.getBoundingClientRect().bottom);
   if(nextTop-last.bottom>150 && last.bottom>0 && last.bottom<frameRect.height-160 && text.length<160 && blankCanvas(Math.max(10,Math.min(last.left,frameRect.width-490)),last.bottom+8,Math.min(480,frameRect.width-30),140)){
    box.style.width=Math.min(480,frameRect.width-30)+'px';box.style.left=Math.max(10,Math.min(last.left,frameRect.width-490))+'px';box.style.top=(last.bottom+8)+'px';box.style.maxHeight=(Math.min(170,nextTop-last.bottom-16))+'px';
    parent.append(box);inline=true;
   }
  }
  const original={height:frame.style.height,display:frame.style.display};
  if(!inline){
   box.style.cssText+='left:0;right:0;bottom:0;width:auto;height:132px;padding-right:90px;border-radius:0;border-width:1px 0 0;box-shadow:none;';
   frame.style.height='calc(100% - 132px)';frame.style.display='block';parent.append(box);
  }
  const markers=[];
  // If a page scrolls/zooms, drop positional overlays; keep the reserved caption readable.
  const cleanupPosition=()=>{markers.forEach(m=>m.remove());if(inline){box.remove();this.showTranslation(reader,{...unit,pageIndex:-1},text,source);}};
  const pdfWindow=reader._internalReader._primaryView._iframeWindow;
  pdfWindow.addEventListener('scroll',cleanupPosition,true);pdfWindow.addEventListener('resize',cleanupPosition);
  this.caption={box,frame,original,markers,pdfWindow,cleanupPosition,inline};
 },
 hideTranslation() {
  const c=this.caption;if(!c)return;this.caption=null;
  c.pdfWindow.removeEventListener('scroll',c.cleanupPosition,true);c.pdfWindow.removeEventListener('resize',c.cleanupPosition);
  c.box.remove();c.markers.forEach(x=>x.remove());
  if(!c.inline){c.frame.style.height=c.original.height;c.frame.style.display=c.original.display;}
 },
};
