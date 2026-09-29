/* Paper Voice: Zotero reader integration. Speech stays local; translation is opt-in. */
var PaperVoice = {
  id: 'paper-voice@local.research',
  prefix: 'extensions.paperVoice.',
  panels: new Map(), windows: new Map(), readerHooks: new Map(),
  generation: 0, process: null, processStart: null, pending: new Map(), sequence: 0,
  audio: null, audioURL: null, lastText: '', currentReader: null, state: 'idle', status: '拖选 PDF 文字，松开鼠标即可朗读',
  lastSelections: new Map(), selectionContexts: new Map(), timers: new Map(), dead: false, translationTicket: 0,
  get(name, fallback) { return Zotero.Prefs.get(this.prefix + name, true) ?? fallback; },
  set(name, value) { Zotero.Prefs.set(this.prefix + name, name==='rate'?String(value):value, true); },
  language() { const chosen=this.get('interfaceLanguage','auto');return chosen==='auto'?((Zotero.locale||Services.locale?.appLocaleAsBCP47||'en').startsWith('zh')?'zh':'en'):chosen; },
  t(text) { return typeof PaperVoiceI18n==='undefined'?text:PaperVoiceI18n.translate(text,this.language()); },
  localize(root) { if(typeof PaperVoiceI18n!=='undefined')PaperVoiceI18n.apply(root,this.language()); },
  setLanguage(value) { this.set('interfaceLanguage',value);this.syncSettings();for(const [reader] of this.panels){for(const el of reader._iframeWindow.document.querySelectorAll('[data-paper-voice="toolbar"]')){el.textContent=this.t('听读');el.title=this.t('Paper Voice · 免费离线自然朗读');el.setAttribute('aria-label',this.t('Paper Voice 论文听读'));}for(const el of reader._iframeWindow.document.querySelectorAll('[data-paper-voice="selection"]'))el.textContent=this.t(this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection'?'▶ 从此句开始连读':'▶ 自然朗读');}for(const item of this.windows.values())item.setAttribute('label',this.t('Paper Voice · 论文听读')); },
  get host() { return Zotero.getMainWindow(); },
  async start() {
    this.dead = false;
    this.selectionHandler = e => this.onSelection(e);
    this.toolbarHandler = e => this.onToolbar(e);
    Zotero.Reader.registerEventListener('renderTextSelectionPopup', this.selectionHandler, this.id);
    Zotero.Reader.registerEventListener('renderToolbar', this.toolbarHandler, this.id);
    this.tabObserver = Zotero.Notifier.registerObserver({notify: (event, type) => {
      if(type==='tab' && event==='select' && this.playbackMode!=='document')this.stop();
      // Reader disposal is handled by detachReader; unrelated tabs cannot stop a book.
    }}, ['tab'], 'paper-voice-tabs');
    for (const win of Zotero.getMainWindows()) this.addWindow(win);
    for (const reader of Zotero.Reader._readers) this.attachReader(reader);
    this.scanTimer = this.host.setInterval(() => {
      if (this.dead) return;
      const active = new Set(Zotero.Reader._readers);
      for (const reader of active) this.attachReader(reader);
      for (const reader of this.readerHooks.keys()) if (!active.has(reader)) this.detachReader(reader);
    }, 1500);
    Zotero.PaperVoice = this;
    this.loadUpdateSettings().catch(()=>{});
  },
  addWindow(win) {
    if (this.windows.has(win)) return;
    const menu = win.document.getElementById('menu_ToolsPopup');
    const item = win.document.createXULElement('menuitem');
    item.id = 'paper-voice-tools'; item.setAttribute('label', this.t('Paper Voice · 论文听读'));
    item.addEventListener('command', () => {
      const reader = Zotero.Reader.getByTabID(win.Zotero_Tabs.selectedID);
      if (reader) this.showPanel(reader);
      else win.alert(this.t('请先打开一篇 PDF，再点击阅读器右上角的「听读」。'));
    });
    menu?.append(item);
    this.windows.set(win, item);
  },
  removeWindow(win) { this.windows.get(win)?.remove(); this.windows.delete(win); },
  attachReader(reader) {
    let doc;try{doc=reader._iframeWindow?.document;}catch(_){return;}
    if (!doc?.body) return;
    this.ensurePanel(reader);
    let hooks = this.readerHooks.get(reader);
    if (!hooks) { hooks = []; this.readerHooks.set(reader, hooks); }
    const hookDocument = d => {
      if (hooks.some(x => x.doc === d)) return;
      const down = e => {
        if (e.target.closest?.('[data-paper-voice]')) return;
        if (d !== doc) {
          this.lastSelections.delete(reader);
          this.clearSelectionTimers();
          if (this.currentReader === reader && this.playbackMode !== 'document') this.stop();
        }
      };
      const key = e => {
        const editable=e.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
        if(editable||e.isComposing||e.repeat||e.ctrlKey||e.metaKey)return;
        const active=this.currentReader===reader&&['playing','paused','loading'].includes(this.state);
        if(active&&(e.code==='Space'||e.key===' ')&&!e.altKey){e.preventDefault();e.stopPropagation();this.togglePause();return;}
        if(active&&e.key==='Escape'){e.preventDefault();e.stopPropagation();this.stop();return;}
        if(e.altKey && e.code==='KeyT'){e.preventDefault();this.toggleTranslation();}
        if (e.altKey && e.code === 'KeyP') { e.preventDefault(); this.togglePause(); }
      };
      d.addEventListener('pointerdown', down, true); d.defaultView.addEventListener('keydown', key, true);
      hooks.push({doc:d, down, key});
    };
    hookDocument(doc);
    for (const frame of doc.querySelectorAll('iframe')) {
      try { if (frame.contentDocument) hookDocument(frame.contentDocument); } catch (_) {}
    }
    if (!doc.querySelector('[data-paper-voice="toolbar"]')) {
      const toolbar = doc.querySelector('.toolbar .end') || doc.querySelector('.toolbar');
      if (toolbar) toolbar.append(this.toolbarButton(doc, reader));
    }
  },
  detachReader(reader) {
    for (const h of this.readerHooks.get(reader) || []) {
      try { h.doc.removeEventListener('pointerdown', h.down, true); h.doc.defaultView.removeEventListener('keydown', h.key, true); } catch (_) {}
    }
    this.readerHooks.delete(reader); this.lastSelections.delete(reader);this.selectionContexts.delete(reader);
    this.panels.get(reader)?.root.remove(); this.panels.delete(reader);
    if (this.currentReader === reader) this.stop();
  },
  toolbarButton(doc, reader) {
    const button = doc.createElement('button'); button.dataset.paperVoice = 'toolbar';
    button.textContent = '听读'; button.title = 'Paper Voice · 免费离线自然朗读';
    button.setAttribute('aria-label', 'Paper Voice 论文听读');
    button.style.cssText = 'width:auto;min-width:44px;padding:0 9px;font-size:13px;white-space:nowrap;';
    button.addEventListener('click', () => this.showPanel(reader, true));
    this.localize(button);return button;
  },
  onToolbar({doc, reader, append}) { append(this.toolbarButton(doc, reader)); },
  markSelectionCitations(text,reader,pageIndex) {
    try{
      const doc=reader._internalReader?._primaryView?._iframeWindow?.document;
      const page=doc?.querySelector(`.page[data-page-number="${(pageIndex||0)+1}"]`);
      if(!page)return text;
      const items=Array.from(page.querySelectorAll('.textLayer span[role="presentation"]')).map(span=>{
        const rect=span.getBoundingClientRect();return {str:span.textContent,height:rect.height,width:rect.width,transform:[0,0,0,rect.height,rect.left,-rect.bottom]};
      });
      return PaperVoiceCore.markSelectedSuperscripts(text,items);
    }catch(_){return text;}
  },
  onSelection({doc, reader, params, append}) {
    const text = this.markSelectionCitations(PaperVoiceCore.cleanText(params.annotation?.text),reader,params.annotation?.position?.pageIndex);
    if (!text) return;
    this.lastText = text; this.lastReader = reader;
    const button = doc.createElement('button'); button.dataset.paperVoice = 'selection';
    const fromSelection=()=>this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection';
    button.textContent = fromSelection()?'▶ 从此句开始连读':'▶ 自然朗读'; button.style.cssText = 'padding:5px 10px;cursor:pointer;';
    button.addEventListener('click', e => { e.stopPropagation(); this.clearSelectionTimers();if(fromSelection()){this.startDocument(reader,'selection');return;} if(this.get('mode','selection')==='document'){this.stop();this.set('mode','selection');this.syncSettings();}this.speak(text, reader); });
    this.localize(button);append(button);
    this.selectedPage=params.annotation?.position?.pageIndex ?? null;
    this.selectionContexts.set(reader,{text,pageIndex:this.selectedPage,anchorOffset:this.selectionAnchor?.(reader,params.annotation?.position)??null});
    if (!this.get('auto', true) || this.get('mode','selection')==='document') return;
    const key = text + JSON.stringify(params.annotation?.position || {});
    if (this.lastSelections.get(reader) === key) return;
    this.lastSelections.set(reader, key);
    this.clearSelectionTimers();
    const timer = this.host.setTimeout(() => {
      this.timers.delete(reader);
      if (!this.dead && this.get('auto', true) && this.get('mode','selection')!=='document') this.speak(text, reader);
    }, 280);
    this.timers.set(reader, timer);
  },
  clearSelectionTimers() { for (const t of this.timers.values()) this.host.clearTimeout(t); this.timers.clear(); },
  ensurePanel(reader) {
    const old=this.panels.get(reader);
    if(old){try{if(old.root.isConnected&&old.root.ownerDocument===reader._iframeWindow.document)return old;}catch(_){}this.panels.delete(reader);}
    if (!this.panels.has(reader)) {
      this.panels.set(reader, PaperVoiceUI.create(this, reader));
      this.syncSettings(); this.updatePanels();
    }
    return this.panels.get(reader);
  },
  *livePanels() {
    for(const [reader,panel] of this.panels){
      try{if(panel.root.isConnected&&panel.root.ownerDocument===reader._iframeWindow?.document){yield panel;continue;}}catch(_){}
      this.panels.delete(reader);
    }
  },
  showPanel(reader, toggle = false) {
    const panel=this.ensurePanel(reader).panel;
    panel.hidden=toggle ? !panel.hidden : false;
  },
  modeHint() {
    if(this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection')return '划选字母或词，从所在句句首一直读到文末。';
    return ({selection:'拖选文字，松开即读。悬浮按钮随时暂停。',document:'按页连续听读，可选择起点或继续上次进度。',paragraph:'划选段中任意文字，朗读所在完整段落。',sentence:'划选句中任意文字，朗读所在完整句子。'})[this.get('mode','selection')];
  },
  setMode(mode) {
    if(!PaperVoiceCore.modes.some(x=>x.id===mode)||mode===this.get('mode','selection'))return;
    this.set('mode',mode);
    if(['playing','paused','loading'].includes(this.state)){
      this.session ||= {units:[]};
      this.session.pendingMode=mode;
      this.session.context ||= this.documentUnits(this.currentReader).catch(()=>[]);
      this.playbackMode=mode;
      this.syncSettings();
    }else{this.sentenceIndex=0;this.syncSettings();this.setStatus(this.modeHint(),'idle');}
  },
  cycleMode() {
    const modes=PaperVoiceCore.modes,index=modes.findIndex(x=>x.id===this.get('mode','selection'));
    this.setMode(modes[(index+1)%modes.length].id);
  },
  speechLanguage() { return PaperVoiceCore.voices.find(v=>v.id===this.get('voice','af_heart'))?.language||'en'; },
  setSpeechLanguage(language) {
    if(language!=='auto'&&!PaperVoiceCore.speechLanguages.some(x=>x.id===language))return;
    this.set('voiceFor_'+this.speechLanguage(),this.get('voice','af_heart'));
    this.set('speechLanguage',language);
    if(language!=='auto')this.selectVoiceLanguage(language);
    this.syncSettings();this.setStatus('声音已保存，下次开始朗读生效');
  },
  selectVoiceLanguage(language) {
    const available=PaperVoiceCore.voices.filter(v=>v.language===language),saved=this.get('voiceFor_'+language,'');
    if(!available.length)return;
    this.set('voice',available.find(v=>v.id===saved)?.id||available[0].id);
  },
  syncSettings() {
    const mode=this.get('mode','selection');
    for (const {root,find} of this.livePanels()) {
      if(find('language'))find('language').value=this.get('interfaceLanguage','auto');
      if(find('speechLanguage')) {
        find('speechLanguage').value=this.get('speechLanguage','auto');
        const select=find('voice');select.replaceChildren();
        for(const v of PaperVoiceCore.voices.filter(v=>v.language===this.speechLanguage())){const option=root.ownerDocument.createElement('option');option.value=v.id;option.textContent=v.label;select.append(option);}
      }
      find('voice').value=this.get('voice','af_heart');find('auto').checked=this.get('auto',true);
      find('rate').value=this.get('rate',1);find('rateLabel').textContent=`${Number(this.get('rate',1)).toFixed(2)}×`;
      find('documentRow').hidden=mode!=='document';find('documentStart').value=this.get('documentStart','begin');
      find('repeat').value=this.get(mode==='selection'?'selectionRepeat':'repeat',mode==='selection'?1:0);find('repeatRow').hidden=mode==='document';
      find('autoRow').hidden=mode==='document';find('modeNote').textContent=this.modeHint();
      for (const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
      const currentMode=PaperVoiceCore.modes.find(x=>x.id===mode)||PaperVoiceCore.modes[0];
      if(find('translation'))find('translation').checked=this.get('translation',false);
      if(find('provider'))find('provider').value=this.get('translationProvider','tencenttransmart');
      if(find('target'))find('target').value=this.get('translationTarget','zh-Hans');
      find('voiceSummary').textContent=PaperVoiceCore.voices.find(v=>v.id===this.get('voice','af_heart'))?.label||'声音设置';
    }
    this.updatePanels();
  },
  cancelTranslationClick() {
    if(this.translationClickTimer!==undefined){this.host.clearTimeout(this.translationClickTimer);this.translationClickTimer=undefined;}
  },
  quickTranslationClick(event) {
    this.cancelTranslationClick();
    if(event?.detail>1)return;
    this.translationClickTimer=this.host.setTimeout(()=>{this.translationClickTimer=undefined;this.cycleTranslationLanguage();},500);
  },
  quickTranslationDoubleClick() { this.cancelTranslationClick();this.toggleTranslation(false); },
  setTranslationTarget(target) {
    this.cancelTranslationClick();this.set('translationTarget',target);this.translationTicket++;this.hideTranslation();this.syncSettings();
    if(this.get('translation',false))this.toggleTranslation(true);
  },
  cycleTranslationLanguage() {
    const languages=['zh-Hans','zh-Hant','ja','ko','fr','de','es','ru'].filter(x=>x!=='zh-Hant'||this.get('translationProvider','tencenttransmart')!=='tencenttransmart');
    const index=languages.indexOf(this.get('translationTarget','zh-Hans'));
    this.setTranslationTarget(languages[(index+1)%languages.length]);
    if(!this.get('translation',false))this.toggleTranslation(true);
  },
  translationLanguage() {
    const languages={'zh-Hans':['简','简体中文'],'zh-Hant':['繁','繁體中文'],ja:['日','日本語'],ko:['한','한국어'],fr:['FR','Français'],de:['DE','Deutsch'],es:['ES','Español'],ru:['RU','Русский']};
    const code=this.get('translationTarget','zh-Hans'),[badge,label]=languages[code]||languages['zh-Hans'];return {code,badge,label};
  },
  setStatus(message, state = this.state) { this.status = message; this.state = state; this.updatePanels(); },
  updatePanels() {
    const active=['playing','paused','loading'].includes(this.state),mode=this.get('mode','selection');
    for (const {root,find,action,closeNavigation} of this.livePanels()) {
      root.dataset.state=this.state;find('status').textContent=this.status;
      find('preview').textContent=this.currentSentence || this.lastText.slice(0,220);if(!find('preview').textContent)find('preview').textContent='选择一段文字，留一点时间给耳朵。';
      find('progressBar').style.width=(this.readProgress?100*this.readProgress.current/this.readProgress.total:0)+'%';
      action('quickTranslate').setAttribute('aria-pressed',String(this.get('translation',false)));
      const language=this.translationLanguage();
      find('quickTranslateLabel').textContent=language.badge;
      action('quickTranslate').title='单击切换译文语言 · 双击关闭译文 · '+language.label+' · Option/Alt + T';
      action('quickTranslate').setAttribute('aria-label',action('quickTranslate').title);
      find('quick').hidden=false;
      action('quickStop').hidden=!active;action('quickTranslate').hidden=!active;
      action('quickPause').hidden=!active&&!this.lastText&&mode!=='document';
      find('primaryLabel').textContent=this.state==='paused'?'继续':active?'暂停':mode==='document'?(this.get('documentStart','begin')==='resume'?'继续上次':'开始连读'):'开始朗读';
      action('primary').querySelector('img').src=this.assetURI+'icons/'+(active && this.state!=='paused'?'pause':'play')+'.svg';
      action('quickPause').querySelector('img').src=this.assetURI+'icons/'+(!active||this.state==='paused'?'play':'pause')+'.svg';
      const modeIndex=PaperVoiceCore.modes.findIndex(x=>x.id===mode),current=PaperVoiceCore.modes[modeIndex]||PaperVoiceCore.modes[0],next=PaperVoiceCore.modes[(modeIndex+1)%4];
      action('quickMode').querySelector('img').src=this.assetURI+'icons/'+current.icon+'.svg';
      find('quickModeLabel').textContent=current.short;
      action('quickMode').setAttribute('aria-label',current.label+'；点击切换为'+next.label);action('quickMode').title=current.label+' → '+next.label;
      action('orb').title='Paper Voice · '+this.status;
      const canNavigate=active&&mode!=='selection'&&!!this.currentUnit;
      find('paragraphNavigation').hidden=mode==='sentence';
      find('modeTools').dataset.available=String(canNavigate);
      if(!canNavigate)closeNavigation?.();
      for(const name of ['Previous','Replay','Next']){
        action('quick'+name).disabled=!canNavigate;
        action('quickSentence'+name).disabled=!canNavigate;
      }
      action('quickMode').title=current.label+' → '+next.label+(canNavigate?' · 悬停展开句段导航':'');
      for(const [name,delta] of [['previous',-1],['next',1]]){
        action(name).disabled=mode==='selection'||!this.currentUnit;
        action(name).setAttribute('aria-label',(delta<0?'上一':'下一')+(mode==='sentence'?'句':'段'));
        action(name).title=action(name).getAttribute('aria-label');
      }
      action('stop').disabled=!active;this.localize(root);
    }
    this.updateUpdateControls?.();
  },
  primary(reader) {
    if(['playing','paused','loading'].includes(this.state))return this.togglePause();
    if(this.get('mode','selection')==='document')return this.startDocument(reader,this.get('documentStart','begin'));
    if(this.lastText && this.lastReader===reader)return this.speak(this.lastText,reader);
    this.setStatus('请先在这篇 PDF 中划选一段文字');
  },
  stepSentence(delta,reader) { return this.navigateScope(delta,reader); },
  async documentUnits(reader) {
    const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(!pdf)return [];
    this.documentCache ||= new WeakMap();
    if(!this.documentCache.has(pdf)){
      const task=(async()=>{
        const margins=await this.publicationMargins(pdf),pages=[];
        for(let i=1;i<=pdf.numPages;i++){
          const page=Components.utils.waiveXrays(await pdf.getPage(i));
          pages.push(PaperVoiceCore.pdfLayout((await page.getTextContent()).items,i-1,Math.abs(page.view?.[3]-page.view?.[1])||undefined,{margins}));
        }
        return PaperVoiceCore.layoutUnits(pages);
      })();
      this.documentCache.set(pdf,task);task.catch(()=>this.documentCache.delete(pdf));
    }
    return this.documentCache.get(pdf);
  },
  async navigateScope(delta,reader,scope=null) {
    const current=this.currentUnit,mode=this.get('mode','selection'),generation=this.generation;
    if(!current||mode==='selection')return;
    try{
      const all=await this.documentUnits(reader);
      if(generation!==this.generation)return;
      const source=all.length?all:(this.session?.units||[]);
      const target=PaperVoiceCore.scopeUnits(source,current,scope||mode,delta)[0];
      if(!target)return;
      const units=mode==='document'?source.slice(PaperVoiceCore.unitIndex(source,target)):PaperVoiceCore.scopeUnits(source,target,mode);
      if(!units.length)return;
      const startIndex=scope==='sentence'&&mode==='paragraph'?Math.max(0,PaperVoiceCore.unitIndex(units,target)):0;
      this.stop(false);this.currentReader=reader;this.playbackMode=mode;
      return this.runUnits(units,reader,this.generation,{mode,startIndex,loops:mode==='document'?1:Number(this.get('repeat',0))});
    }catch(error){if(generation===this.generation)this.setStatus(error.message);}
  },
  async publicationMargins(pdf) {
    this.pdfMarginCache ||= new WeakMap();
    if(this.pdfMarginCache.has(pdf))return this.pdfMarginCache.get(pdf);
    const pages=[];
    for(let i=1;i<=Math.min(pdf.numPages,5);i++){
      const page=Components.utils.waiveXrays(await pdf.getPage(i));
      pages.push({items:(await page.getTextContent()).items,height:Math.abs(page.view?.[3]-page.view?.[1])});
    }
    const margins=PaperVoiceCore.marginSignatures(pages);this.pdfMarginCache.set(pdf,margins);return margins;
  },
  async startDocument(reader, origin='begin') {
    this.stop(false);const generation=this.generation;this.currentReader=reader;this.ensurePanel(reader);
    this.playbackMode='document';
    this.setStatus('正在读取 PDF 正文…','loading');
    try {
      const pdf=reader._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
      if(!pdf)throw new Error('当前阅读器未就绪，请等待 PDF 加载完成');
      const margins=await this.publicationMargins(pdf);
      const selected=this.selectionContexts.get(reader);
      if(origin==='selection'&&(!selected?.text||!Number.isInteger(selected.pageIndex)))throw new Error('请先在这篇 PDF 中划选字母、单词或句子，再从选定位置开始');
      let saved={};try{saved=JSON.parse(this.get('progress.'+reader.itemID,'{}'))||{};}catch(_){}
      const current=(reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer?.currentPageNumber||1)-1;
      const requested=origin==='resume'?saved.pageIndex:origin==='current'?current:0;
      const startPage=Math.max(0,Math.min(pdf.numPages-1,Number.isInteger(requested)?requested:0));
      const pages=[];let empty=0;
      for(let i=Math.min(pdf.numPages,startPage+1);i<=pdf.numPages;i++) {
        if(generation!==this.generation || this.dead)return;
        const page=Components.utils.waiveXrays(await pdf.getPage(i)),content=await page.getTextContent();
        if(generation!==this.generation || this.dead)return;
        const layout=PaperVoiceCore.pdfLayout(content.items,i-1,Math.abs(page.view?.[3]-page.view?.[1])||undefined,{margins});
        if(!layout.text)empty++;
        pages.push(layout);
        this.setStatus(`正在读取第 ${i}/${pdf.numPages} 页…`,'loading');
      }
      if(generation!==this.generation)return;
      let units=PaperVoiceCore.layoutUnits(pages);
      if(origin==='selection'){
        const page=pages.find(p=>p.pageIndex===selected.pageIndex),text=PaperVoiceCore.anchorText(page?.text||''),needle=PaperVoiceCore.anchorText(selected.text);
        let offset=selected.anchorOffset;
        if(!Number.isInteger(offset)){
          offset=needle?text.indexOf(needle):-1;
          if(offset>=0&&text.indexOf(needle,offset+1)>=0)offset=-1;
          if(offset>=0)offset=PaperVoiceCore.sourceOffset(page,offset);
        }
        const index=offset>=0?PaperVoiceCore.selectedSentenceIndex(units,selected.pageIndex,offset):-1;
        if(index<0)throw new Error('未能准确定位选区，请在 PDF 中重新划选后再开始');
        units=units.slice(index);
      }
      if(origin==='resume')units=units.slice(PaperVoiceCore.resumeUnitIndex(units.filter(u=>u.pageIndex===startPage),saved));
      if(!units.length)throw new Error('PDF 没有可提取文字，请先进行 OCR 文字识别');
      this.documentEmptyPages=empty;
      return this.runUnits(units,reader,generation,{mode:'document',loops:1});
    }catch(e){if(generation===this.generation)this.setStatus(e.message,'error');}
  },
  engineRoot() {
    const custom = this.get('enginePath', '');
    return custom || PathUtils.join(Services.dirsvc.get('UAppData', Components.interfaces.nsIFile).path, 'paper-voice-engine');
  },
  workerEnvironment() {
    const home=Services.dirsvc.get('Home', Components.interfaces.nsIFile).path;
    const env={HOME:home,LANG:'en_US.UTF-8',HF_HUB_OFFLINE:'1'};
    if(Zotero.isWin){
      for(const name of ['SystemRoot','WINDIR','APPDATA','LOCALAPPDATA','TEMP','TMP','USERPROFILE']){
        const value=Services.env.get(name);if(value)env[name]=value;
      }
      const system=env.SystemRoot||env.WINDIR||'C:\\Windows';
      env.PATH=PathUtils.join(system,'System32')+';'+system;
    }else env.PATH='/usr/bin:/bin:/usr/sbin:/sbin';
    return env;
  },
  async ensureWorker() {
    if (this.processStart) return this.processStart;
    if (this.process) return;
    this.processStart = (async () => {
      const root = this.engineRoot();
      const command = Zotero.isWin ? PathUtils.join(root,'python','python.exe') : PathUtils.join(root,'python','bin','python3');
      if (!(await IOUtils.exists(command))) throw new Error('尚未安装离线声音。请打开 Paper Voice 安装助手，完成声音安装后重试。');
      const { Subprocess } = ChromeUtils.importESModule('resource://gre/modules/Subprocess.sys.mjs');
      const proc = await Subprocess.call({ command, arguments: ['-E','-s','-B','-X','utf8',PathUtils.join(root, 'worker.py')],
        environment: this.workerEnvironment(), stderr: 'pipe' });
      // Drain stderr so native warnings can never block synthesis; do not log selected text.
      (async () => { try { while (await proc.stderr.readString()) {} } catch (_) {} })();
      let readyResolve, readyReject;
      const ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
      const timeout = this.host.setTimeout(() => { readyReject(new Error('语音引擎启动超时，请重试')); proc.kill(); }, 60000);
      if (this.dead) { proc.kill(); throw new Error("Paper Voice 已停用"); }
      this.process = proc;
      (async () => {
        let buffer = '';
        try {
          while (true) {
            const part = await proc.stdout.readString();
            if (!part) break;
            buffer += part;
            let end;
            while ((end = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, end); buffer = buffer.slice(end+1);
              if (!line) continue;
              const result = JSON.parse(line);
              if (result.ready) { this.workerVoices=result.voices||[];this.host.clearTimeout(timeout); readyResolve(); }
              else {
                const request = this.pending.get(result.id); this.pending.delete(result.id);
                if (request) { this.host.clearTimeout(request.timer); result.ok ? request.resolve(result) : request.reject(new Error(result.error)); }
              }
            }
          }
          throw new Error('语音引擎已退出，请点击重读重新启动');
        } catch (error) {
          this.host.clearTimeout(timeout); readyReject(error);
          if (this.process === proc) { this.process = null; this.rejectPending(error); }
        }
      })();
      await ready;
    })();
    try { await this.processStart; } finally { this.processStart = null; }
  },
  rejectPending(error) { for (const p of this.pending.values()) { this.host.clearTimeout(p.timer); p.reject(error); } this.pending.clear(); },
  async synthesize(text, voice, rate) {
    await this.ensureWorker();
    if(this.workerVoices&&!this.workerVoices.includes(voice))throw new Error('请下载最新版完整包，重新安装离线声音以启用多语言朗读。');
    const id = ++this.sequence;
    return new Promise((resolve,reject) => {
      const timer = this.host.setTimeout(() => {
        this.pending.delete(id); reject(new Error('本段语音生成超时，请选择较短段落后重试'));
        this.process?.kill(); this.process = null;
        this.rejectPending(new Error('语音引擎已重置，请重试'));
      }, 90000);
      this.pending.set(id, {resolve,reject,timer});
      this.process.stdin.write(JSON.stringify({id,text,voice,rate})+'\n').catch(error => {
        this.host.clearTimeout(timer); this.pending.delete(id); reject(error);
      });
    });
  },
  async speak(text, reader, sample = false, keepSentence = false) {
    text=PaperVoiceCore.cleanText(text);if(!text)return;
    this.stop(false);const generation=this.generation;this.currentReader=reader;this.ensurePanel(reader);
    if(text.length>24000){this.setStatus('选区过长，请分段选择或使用全文连读','error');return;}
    if(!sample){this.lastText=text;this.lastReader=reader;if(!keepSentence)this.sentenceIndex=0;}
    const requestedMode=sample?'selection':this.get('mode','selection');
    const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(!sample&&pdf&&['sentence','paragraph'].includes(requestedMode)){
      this.playbackMode=requestedMode;this.setStatus('正在定位所选文字…','loading');
      try{
        const all=await this.documentUnits(reader);
        if(generation!==this.generation)return;
        const context=this.selectionContexts.get(reader);
        const pageIndex=context?.pageIndex??(reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer?.currentPageNumber||1)-1;
        let offset=context?.anchorOffset;
        if(!Number.isInteger(offset)){
          const page=Components.utils.waiveXrays(await pdf.getPage(pageIndex+1));
          const raw=PaperVoiceCore.anchorText(PaperVoiceCore.pdfText((await page.getTextContent()).items));
          const needle=PaperVoiceCore.anchorText(context?.text||text);
          offset=needle?raw.indexOf(needle):-1;
          if(offset>=0&&raw.indexOf(needle,offset+1)>=0)offset=-1;
        }
        if(generation!==this.generation)return;
        const units=offset>=0?PaperVoiceCore.scopeUnits(all,{pageIndex,anchorOffset:offset,text},requestedMode):[];
        if(!units.length)throw new Error('未能准确定位选区，请在 PDF 中重新划选后再开始');
        return this.runUnits(units,reader,generation,{mode:requestedMode,loops:Number(this.get('repeat',0))});
      }catch(error){if(generation===this.generation)this.setStatus(error.message||String(error),'error');return;}
    }
    if(!PaperVoiceCore.speechText(text)){this.setStatus('选区仅包含引文标记，无需朗读','idle');return;}
    if(!/\p{L}/u.test(text)){this.setStatus('请选择可识别的正文；扫描 PDF 需要先做文字识别','error');return;}
    const mode=sample?'selection':this.get('mode','selection');
    this.setStatus('正在定位所选文字…','loading');
    let sentences=PaperVoiceCore.sentences(text);
    if(mode==='sentence')sentences=[sentences[this.sentenceIndex||0] || sentences[0]];
    this.playbackMode=mode;
    const context=this.selectionContexts.get(reader);
    const pageIndex=context?.pageIndex ?? (reader._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfViewer?.currentPageNumber||1)-1;
    const units=sentences.flatMap(x=>PaperVoiceCore.chunks(x).map(part=>({text:part,sentenceText:x,pageIndex})));
    if(!sample)await this.locateSelectionUnits(reader,units,context?.text||text,generation);
    if(generation!==this.generation)return;
    const loops=sample?1:Number(this.get(mode==='selection'?'selectionRepeat':'repeat',mode==='selection'?1:0));
    return this.runUnits(units,reader,generation,{mode,loops,sample});
  },
  async runUnits(units,reader,generation,{mode,loops,sample=false,startIndex=0}) {
    startIndex=units.slice(0,startIndex).filter(unit=>unit.spokenText??PaperVoiceCore.speechText(unit.text)).length;
    units=units.filter(unit=>unit.spokenText??PaperVoiceCore.speechText(unit.text));
    if(!units.length||startIndex>=units.length){this.setStatus('选区仅包含引文标记，无需朗读','idle');return;}
    if(this.state!=='paused')this.setStatus('正在准备自然语音…','loading');
    const languageMode=sample?this.speechLanguage():this.get('speechLanguage','auto');
    const selectedVoice=this.get('voice','af_heart'),voiceChoices=Object.fromEntries(PaperVoiceCore.speechLanguages.map(x=>[x.id,this.get('voiceFor_'+x.id,PaperVoiceCore.voices.find(v=>v.language===x.id).id)]));
    voiceChoices[this.speechLanguage()]=selectedVoice;
    let contextText='',documentLanguage=languageMode;
    const rate=PaperVoiceCore.rate(this.get('rate',1));
    const session=this.session={units,pendingMode:this.session?.pendingMode||null,context:this.session?.context};
    const cache=new Map();let lastPage=null;
    const prepare=unit=>{
      const sourceSpeech=unit.spokenText??PaperVoiceCore.speechText(unit.text);
      const paragraphText=unit.paragraphId===undefined?contextText:session.units.filter(u=>u.paragraphId===unit.paragraphId).map(u=>u.text).join(' ');
      const language=languageMode==='auto'?(PaperVoiceCore.detectSpeechLanguage(unit.sentenceText||unit.translationText||unit.text,paragraphText||contextText)||documentLanguage):languageMode;
      if(!PaperVoiceCore.speechLanguages.some(x=>x.id===language))throw new Error('无法确定受支持的朗读语言，请在设置中手动选择英语、中文、日语或法语。');
      const spoken=PaperVoiceCore.measurementSpeech(sourceSpeech,language);
      const voice=voiceChoices[language],cacheKey=voice+'\0'+spoken;
      let speech=cache.get(cacheKey);
      if(!speech){speech=this.synthesize(spoken,voice,rate);this.inflight=speech;if(mode!=='document'&&loops!==1)cache.set(cacheKey,speech);}
      const translation=this.get('translation',false)&&!sample?this.translate(unit.translationText||unit.text,language):Promise.resolve(null);
      translation.catch(()=>{});speech.catch(()=>{});
      return {speech,translation,unit,language,voice,translationKey:this.get('translation',false)+'|'+this.get('translationProvider','tencenttransmart')+'|'+this.get('translationTarget','zh-Hans')};
    };
    try {
      if(this.inflight){try{await this.inflight;}catch(_){}}
      if(generation!==this.generation || this.dead)return;
      if(session.pendingMode){
        const all=await session.context;
        if(generation!==this.generation||this.dead)return;
        mode=session.pendingMode;session.pendingMode=null;this.playbackMode=mode;
        const scoped=mode==='selection'?units:mode==='document'?(all.length?all.slice(Math.max(0,PaperVoiceCore.unitIndex(all,units[0]))):units):PaperVoiceCore.scopeUnits(all.length?all:units,units[0],mode);
        if(scoped.length)units=scoped;
        session.units=units;loops=1;startIndex=0;
      }
      if(languageMode==='auto'){
        contextText=units.slice(0,30).map(u=>u.text).join(' ').slice(0,6000);
        if(contextText.length<400){
          const all=await this.documentUnits(reader).catch(()=>[]);
          if(generation!==this.generation||this.dead)return;
          const page=units[0].pageIndex;
          contextText=all.filter(u=>u.pageIndex===page).slice(0,30).map(u=>u.text).join(' ').slice(0,6000)||contextText;
        }
        documentLanguage=PaperVoiceCore.detectSpeechLanguage(contextText);
      }
      let next=prepare(units[startIndex]);
      for(let cycle=0;loops===0 || cycle<loops;cycle++) {
        for(let i=cycle===0?startIndex:0;i<units.length;i++) {
          const prepared=next,result=await prepared.speech;
          if(generation!==this.generation || this.dead)return;
          this.activeSpeechLanguage=prepared.language;
          if(languageMode==='auto'&&this.get('speechLanguage','auto')==='auto'){this.set('voice',prepared.voice);this.syncSettings();}
          const hasNext=i+1<units.length || loops===0 || cycle+1<loops;
          if(hasNext)next=prepare(units[(i+1)%units.length]);
          const unit=units[i];this.currentSentence=unit.text;this.currentUnit=unit;this.readProgress={current:i+1,total:units.length};
          if(mode==='document' && unit.pageIndex!==lastPage){await reader.navigate({pageIndex:unit.pageIndex});lastPage=unit.pageIndex;}
          await this.highlightSentence?.(reader,unit,generation);
          if(generation!==this.generation||this.dead)return;
          const sentenceTicket=++this.translationTicket;
          if(this.get('translation',false)&&!sample){
            this.showTranslation(reader,unit,'正在翻译…');
            const translationKey='true|'+this.get('translationProvider','tencenttransmart')+'|'+this.get('translationTarget','zh-Hans');
            const translated=prepared.translationKey===translationKey?prepared.translation:this.translate(unit.translationText||unit.text);
            translated.then(value=>{if(generation===this.generation && sentenceTicket===this.translationTicket && this.get('translation',false))this.showTranslation(reader,unit,value?.text || '译文暂不可用',value?.source);},()=>{if(generation===this.generation && sentenceTicket===this.translationTicket)this.showTranslation(reader,unit,'翻译暂时不可用，可切换服务或译文语言。');});
          }
          const prefix=mode==='document'?`第 ${unit.pageIndex+1} 页 · `:mode==='sentence'?`第 ${(this.sentenceIndex||0)+1}/${PaperVoiceCore.sentences(this.lastText).length} 句 · `:'';
          const suffix=['sentence','paragraph'].includes(mode)?` · 第 ${cycle+1}${loops?'/'+loops:''} 遍`:'';
          this.pendingProgress=sample?null:{reader,unit,generation,mode};
          await this.playAudio(result.audio,reader,generation,`${prefix}正在朗读 ${i+1}/${units.length}${suffix}`);
          if(generation!==this.generation || this.dead)return;
          if(session.pendingMode){
            const all=await session.context;
            if(generation!==this.generation||this.dead)return;
            mode=session.pendingMode;session.pendingMode=null;this.playbackMode=mode;
            const scope=mode==='document'?(all.length?all:units):mode==='selection'?session.units:PaperVoiceCore.scopeUnits(all.length?all:units,unit,mode);
            units=PaperVoiceCore.afterUnit(scope,unit).filter(u=>u.spokenText??PaperVoiceCore.speechText(u.text));
            loops=1;cycle=0;i=-1;session.units=units;
            if(units.length)next=prepare(units[0]);
          }
        }
      }
      if(generation===this.generation){this.session=null;this.releaseAudio();this.clearSentenceHighlight?.();this.setStatus(mode==='document'&&this.documentEmptyPages?`朗读完成 · ${this.documentEmptyPages} 页无文字，已跳过`:'朗读完成 · 可以继续划选下一段','idle');}
    }catch(error){if(generation===this.generation && !this.dead){this.releaseAudio();this.clearSentenceHighlight?.();this.setStatus(error.message || String(error),'error');Zotero.logError(error);}}
  },
  async locateSelectionUnits(reader,units,selection,generation) {
    const pdf=reader._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(!pdf)return;
    // Locate the complete selection across PDF pages before splitting at actual
    // column/page boundaries. This works before the next page's DOM is rendered.
    try{
      const margins=await this.publicationMargins(pdf),layouts=[];let joined='';
      for(let index=units[0]?.pageIndex||0;index<pdf.numPages;index++){
        if(generation!==this.generation)return;
        const page=Components.utils.waiveXrays(await pdf.getPage(index+1));
        const layout=PaperVoiceCore.pdfLayout((await page.getTextContent()).items,index,Math.abs(page.view?.[3]-page.view?.[1])||undefined,{margins});layouts.push(layout);joined+=PaperVoiceCore.anchorText(layout.text);
        if(joined.includes(PaperVoiceCore.anchorText(selection))){
          const selected=units.map(u=>u.text).join(' '),from=joined.indexOf(PaperVoiceCore.anchorText(selection));
          const located=PaperVoiceCore.layoutUnits(layouts,selected,from);
          if(located?.length){units.splice(0,units.length,...located);return;}
        }
      }
    }catch(error){Zotero.logError(error);}
    let pageIndex=units[0]?.pageIndex||0,offset=0;
    const pages=new Map();
    const getText=async index=>{
      if(!pages.has(index)){
        const page=Components.utils.waiveXrays(await pdf.getPage(index+1));
        pages.set(index,PaperVoiceCore.anchorText(PaperVoiceCore.pdfText((await page.getTextContent()).items)));
      }
      return pages.get(index);
    };
    try{
      const full=await getText(pageIndex),start=full.indexOf(PaperVoiceCore.anchorText(selection));
      if(start>=0)offset=start;
      for(const unit of units){
        const needle=PaperVoiceCore.anchorText(unit.text);
        // A selected sentence may cross a page boundary. Its leading words anchor it.
        for(let page=pageIndex;page<pdf.numPages;page++){
          if(generation!==this.generation)return;
          const haystack=await getText(page),from=page===pageIndex?offset:0;
          let at=haystack.indexOf(needle,from);
          if(at<0&&needle.length>64)at=haystack.indexOf(needle.slice(0,64),from);
          if(at<0)continue;
          unit.pageIndex=page;unit.anchorOffset=at;
          pageIndex=page;offset=at+needle.length;break;
        }
      }
    }catch(error){Zotero.logError(error);}
  },
  rememberPlayback(progress) {
    if(!progress || progress.generation!==this.generation || !progress.reader.itemID)return;
    const {unit,reader,mode}=progress;
    if(!Number.isInteger(unit.pageIndex))return;
    this.set('progress.'+reader.itemID,JSON.stringify({version:2,pageIndex:unit.pageIndex,unitInPage:unit.unitInPage,anchorOffset:unit.anchorOffset,text:unit.text,mode,updatedAt:Date.now()}));
  },
  playAudio(encoded, reader, generation, message) {
    const win = this.host;
    const paused = this.state === 'paused';
    this.releaseAudio();
    const binary = this.host.atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    const blob = new win.Blob([bytes], {type:'audio/wav'});
    this.audioURL = win.URL.createObjectURL(blob); this.audioWindow = win;
    const audio = new win.Audio(this.audioURL); this.audio = audio;
    const progress=this.pendingProgress;
    return new Promise((resolve,reject) => {
      this.audioDone = resolve;
      audio.onended = resolve;
      audio.onplaying = () => this.rememberPlayback(progress);
      audio.onerror = () => reject(new Error('无法播放音频，请检查音频输出后重试'));
      this.resumeStatus = message;
      this.setStatus(paused ? '已暂停，点击继续' : message, paused ? 'paused' : 'playing');
      if (!paused && generation === this.generation) audio.play().catch(error=>{
        // A pause while play() is still opening the device rejects with AbortError.
        // It is a valid paused session, not a synthesis/playback failure.
        if(generation===this.generation&&this.audio===audio&&this.state!=='paused')reject(error);
      });
    });
  },
  togglePause() {
    if (this.state === 'paused') {
      if (this.audio) { const audio=this.audio,generation=this.generation;audio.play().catch(e => {if(this.audio===audio&&this.generation===generation&&this.state!=='paused')this.setStatus(e.message,'error');}); this.setStatus(this.resumeStatus || '正在朗读','playing'); }
      else this.setStatus('正在准备自然语音…','loading');
    } else if (this.state === 'playing' || this.state === 'loading') {
      this.audio?.pause(); this.setStatus('已暂停，点击继续','paused');
    }
  },
  releaseAudio() {
    if (this.audio) { this.audio.pause(); this.audio.onended=null; this.audio.onerror=null;this.audio.onplaying=null; this.audio.removeAttribute('src'); this.audio.load(); }
    this.audio = null;
    if (this.audioURL) { try { this.audioWindow.URL.revokeObjectURL(this.audioURL); } catch (_) {} this.audioURL=null; }
    this.audioDone?.(); this.audioDone=null;
  },
  stop(show = true) {
    this.cancelTranslationClick();
    this.session=null;this.generation++; this.translationTicket++; this.currentUnit=null;this.pendingProgress=null;this.playbackMode=null; this.clearSelectionTimers(); this.releaseAudio();
    this.hideTranslation?.();this.clearSentenceHighlight?.();
    this.state = 'idle';
    if (show) this.setStatus('已停止 · 拖选下一段即可朗读','idle');
  },
  async shutdown() {
    this.dead=true; this.stop(false);
    this.host.clearInterval(this.scanTimer);
    Zotero.Reader.unregisterEventListener('renderTextSelectionPopup', this.selectionHandler);
    Zotero.Reader.unregisterEventListener('renderToolbar', this.toolbarHandler);
    if (this.tabObserver) Zotero.Notifier.unregisterObserver(this.tabObserver);
    for (const reader of [...this.readerHooks.keys()]) this.detachReader(reader);
    for (const reader of Zotero.Reader._readers) {
      try { reader._iframeWindow.document.querySelectorAll('[data-paper-voice]').forEach(el => el.remove()); } catch (_) {}
    }
    for (const win of [...this.windows.keys()]) this.removeWindow(win);
    this.rejectPending(new Error('Paper Voice 已停用'));
    if (this.process) { this.process.kill(); this.process=null; }
    delete Zotero.PaperVoice;
  },
};
Object.assign(PaperVoice, PaperVoiceTranslation);

if(typeof PaperVoiceUpdater!=='undefined')Object.assign(PaperVoice,PaperVoiceUpdater);
