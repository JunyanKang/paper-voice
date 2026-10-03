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
  language() { return PaperVoiceI18n.resolveLanguage(this.get('interfaceLanguage','auto'),Zotero.locale||Services.locale?.appLocaleAsBCP47||'en'); },
  t(text) { return typeof PaperVoiceI18n==='undefined'?text:PaperVoiceI18n.translate(text,this.language()); },
  localize(root) { if(typeof PaperVoiceI18n!=='undefined')PaperVoiceI18n.apply(root,this.language());if(typeof PaperVoiceUI!=='undefined')PaperVoiceUI.syncSelects(root); },
  setLanguage(value) { this.set('interfaceLanguage',value);this.syncSettings();for(const [reader] of this.panels){for(const el of reader._iframeWindow.document.querySelectorAll('[data-paper-voice="toolbar"]')){el.title=this.t('Paper Voice · 免费离线自然朗读');el.setAttribute('aria-label',this.t('Paper Voice 论文听读'));}for(const el of reader._iframeWindow.document.querySelectorAll('[data-paper-voice="selection"]'))el.textContent=this.t(this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection'?'▶ 从此句开始连读':'▶ 自然朗读');}for(const item of this.windows.values())item.setAttribute('label',this.t('Paper Voice · 论文听读')); },
  get host() { return Zotero.getMainWindow(); },
  async start() {
    this.dead = false;
    await this.loadThemeImage?.();
    this.loadReadingSession();
    this.quitObserver=()=>{this.quitting=true;this.saveReadingSession();Services.prefs.savePrefFile(null);};
    Services.obs.addObserver(this.quitObserver,'quit-application-granted');
    this.selectionHandler = e => this.onSelection(e);
    this.toolbarHandler = e => this.onToolbar(e);
    Zotero.Reader.registerEventListener('renderTextSelectionPopup', this.selectionHandler, this.id);
    Zotero.Reader.registerEventListener('renderToolbar', this.toolbarHandler, this.id);
    this.tabObserver = Zotero.Notifier.registerObserver({notify: (event, type) => {
      if(type==='tab' && event==='select' && this.currentReader && !this.restoredSession && this.playbackMode!=='document')this.stop();
      // Reader disposal is handled by detachReader; unrelated tabs cannot stop a book.
    }}, ['tab'], 'paper-voice-tabs');
    for (const win of Zotero.getMainWindows()) this.addWindow(win);
    for (const reader of Zotero.Reader._readers) this.attachReader(reader);
    this.scanTimer = this.host.setInterval(() => {
      if (this.dead) return;
      const active = new Set(Zotero.Reader._readers);
      for (const reader of active){this.attachReader(reader);this.panels.get(reader)?.tickCompanion?.();}
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
    this.restoreReadingSession(reader);
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
        const editable=e.target.closest?.('input,textarea,select,[role="combobox"],[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
        if(editable||e.isComposing||e.ctrlKey||e.metaKey)return;
        const active=this.currentReader===reader&&['playing','paused','loading'].includes(this.state);
        // Preserve native controls and the popover's own arrow-key navigation.
        const control=e.target.closest?.('button,[role="button"],[role="menu"],[role="listbox"],[role="combobox"],[role="tree"],[role="slider"],[data-field="playbackTools"]');
        const navigation=!e.shiftKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')
          ?{scope:e.altKey?'paragraph':'sentence',delta:e.key==='ArrowUp'?-1:1}
          :!e.shiftKey&&!e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')
            ?{scope:e.key==='ArrowLeft'?'sentence':'paragraph',delta:0}:null;
        if(active&&this.currentUnit&&navigation&&!control){
          e.preventDefault();e.stopPropagation();
          // Holding an arrow neither skips multiple passages nor scrolls the PDF.
          if(!e.repeat)this.navigateScope(navigation.delta,reader,navigation.scope);
          return;
        }
        if(e.repeat)return;
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
    const panel=this.panels.get(reader);if(panel?.dispose)panel.dispose();else panel?.root.remove(); this.panels.delete(reader);
    if (this.currentReader === reader) this.stop();
  },
  toolbarButton(doc, reader) {
    const button = doc.createElement('button'); button.dataset.paperVoice = 'toolbar';
    const icon=doc.createElement('img');icon.src=this.assetURI+'mascot.png';icon.alt='';icon.style.cssText='width:24px;height:24px;object-fit:contain;pointer-events:none;';button.append(icon);button.title='Paper Voice · 免费离线自然朗读';
    button.setAttribute('aria-label', 'Paper Voice 论文听读');
    button.style.cssText = 'width:32px;min-width:32px;height:28px;padding:2px 4px;display:inline-flex;align-items:center;justify-content:center;';
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
    const position=params.annotation?.position;
    const selected={text,pageIndex:position?.pageIndex??null,position:position?JSON.parse(JSON.stringify(position)):null,anchorOffset:this.selectionAnchor?.(reader,position)??null};
    button.addEventListener('click', async e => {
      e.preventDefault();e.stopPropagation();if(button.disabled)return;
      this.clearSelectionTimers();this.selectionContexts.set(reader,selected);this.lastText=text;this.lastReader=reader;
      this.currentSentence='';this.readProgress=null;
      this.showPanel(reader);const panel=this.panels.get(reader);if(panel&&!panel.find('settingsPage').hidden)panel.action('settings').click();
      button.disabled=true;button.textContent=this.t('定位中…');button.setAttribute('aria-busy','true');
      try{
        if(this.get('mode','selection')==='document'&&!fromSelection()){this.stop();this.set('mode','selection');this.syncSettings();}
        const task=fromSelection()?this.startDocument(reader,'selection'):this.speak(text,reader);
        this.selectionAction={button,reader,generation:this.generation};this.updateSelectionAction();await task;
      }catch(error){this.setStatus(error.message||String(error),'error');}
      finally{this.updateSelectionAction();}
    });
    this.localize(button);append(button);
    this.selectedPage=params.annotation?.position?.pageIndex ?? null;
    this.selectionContexts.set(reader,selected);
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
    PaperVoiceUI.visibility(panel,toggle?!(panel.dataset.pvVisible==='true'||(!panel.hidden&&panel.dataset.pvVisible!=='false')):true);
  },
  modeHint() {
    if(this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection')return '划选字母或词，从所在句句首一直读到文末。';
    return ({selection:'拖选文字，松开即读。悬浮按钮随时暂停。',document:'按页连续听读，可选择起点或继续上次进度。',paragraph:'划选段中任意文字，朗读所在完整段落。',sentence:'划选句中任意文字，朗读所在完整句子。'})[this.get('mode','selection')];
  },
  setMode(mode) {
    if(!PaperVoiceCore.modes.some(x=>x.id===mode)||mode===this.get('mode','selection'))return;
    this.set('mode',mode);
    if(['playing','paused','loading'].includes(this.state)){
      if(this.restoredSession){
        this.restoredSession.mode=mode;this.restoredSession.rescope=true;this.restoredSession.loops=mode==='document'?1:Number(this.get(mode==='selection'?'selectionRepeat':'repeat',1));
        this.playbackMode=mode;this.saveReadingSession();this.syncSettings();return;
      }
      this.session ||= {units:[]};
      this.session.pendingMode=mode;
      this.session.context ||= this.documentUnits(this.currentReader).catch(()=>[]);
      this.playbackMode=mode;
      this.saveReadingSession();this.syncSettings();
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
  translationVoiceLanguage(target=this.get('translationTarget','zh-Hans')) {
    return ({'zh-Hans':'zh','zh-Hant':'zh',en:'en',ja:'ja',fr:'fr'})[target]||null;
  },
  companionIntervalMs() {return Math.max(1,Math.min(60,Number(this.get('companionInterval',5))||5))*60000;},
  setCompanionInterval(value) {value=Number(value);if(![1,3,5,10,15,30].includes(value))return;this.set('companionInterval',value);for(const panel of this.livePanels())panel.resetCompanionSchedule?.();this.syncSettings();},
  captionFontFamily() {return ({system:'system-ui,sans-serif',serif:'Georgia,"Noto Serif CJK SC","Songti SC",SimSun,serif',sans:'Arial,"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif'})[this.get('captionFont','system')]||'system-ui,sans-serif';},
  setCaptionStyle(name,value) {
    if(name==='captionFont'){if(!['system','serif','sans'].includes(value))return;this.set(name,value);}
    else if(name==='captionSize')this.set(name,Math.max(10,Math.min(20,Math.round(Number(value)||12))));
    this.syncSettings();
    if(this.caption){this.caption.box.style.fontFamily=this.captionFontFamily();this.caption.box.style.fontSize=this.get('captionSize',12)+'px';this.positionTranslation(this.caption);}
  },
  surfaceOpacity() {return 1-Math.max(0,Math.min(40,Number(this.get('surfaceTransparency',12))||0))/100;},
  setSurfaceTransparency(value) {this.set('surfaceTransparency',Math.max(0,Math.min(40,Math.round(Number(value)||0))));this.syncSettings();if(this.caption)this.caption.box.style.setProperty('--pv-caption-opacity',String(this.surfaceOpacity()));},
  settingsVoiceLanguage() {return this.get('readTranslation',false)?(this.translationVoiceLanguage()||this.speechLanguage()):this.speechLanguage();},
  settingsVoice() {const language=this.settingsVoiceLanguage();return this.get('readTranslation',false)?this.get('voiceFor_'+language,PaperVoiceCore.voices.find(v=>v.language===language).id):this.get('voice','af_heart');},
  setReadTranslation(enabled) {
    if(enabled&&!this.translationVoiceLanguage()){this.setStatus('译文朗读暂不可用，请更换译文语种');this.syncSettings();return;}
    this.set('readTranslation',!!enabled);this.syncSettings();
    if(['playing','paused','loading'].includes(this.state))this.setStatus(enabled?'译文朗读已开启，下句生效':'译文朗读已关闭，下句生效');
  },
  syncSettings() {
    const mode=this.get('mode','selection');
    for (const {root,find} of this.livePanels()) {
      root.style.setProperty('--pv-opacity',String(this.surfaceOpacity()));
      this.syncTheme?.(root);
      if(find('companionInterval'))find('companionInterval').value=this.get('companionInterval',5);
      if(find('companion'))find('companion').checked=this.get('companionInteractions',true);
      if(find('captionFont')){find('captionFont').value=this.get('captionFont','system');find('captionSize').value=this.get('captionSize',12);}
      if(find('transparency')){find('transparency').value=this.get('surfaceTransparency',12);find('transparencyLabel').textContent=this.get('surfaceTransparency',12)+'%';}
      if(find('language')){find('language').value=this.get('interfaceLanguage','auto');find('language').querySelector('[value=auto]').textContent=this.t('跟随系统');}
      if(find('speechLanguage')) {
        find('speechLanguage').value=this.get('speechLanguage','auto');
        const select=find('voice');select.replaceChildren();
        for(const v of PaperVoiceCore.voices.filter(v=>v.language===this.settingsVoiceLanguage())){const option=root.ownerDocument.createElement('option');option.value=v.id;option.textContent=v.label;select.append(option);}
      }
      find('voice').value=this.settingsVoice();find('auto').checked=this.get('auto',true);
      find('rate').value=this.get('rate',1);find('rateLabel').textContent=`${Number(this.get('rate',1)).toFixed(2)}×`;
      find('documentRow').hidden=mode!=='document';find('documentStart').value=this.get('documentStart','begin');
      find('repeat').value=this.get(mode==='selection'?'selectionRepeat':'repeat',mode==='selection'?1:0);find('repeatRow').hidden=mode==='document';
      find('autoRow').hidden=mode==='document';find('modeNote').textContent=this.modeHint();
      for (const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
      const currentMode=PaperVoiceCore.modes.find(x=>x.id===mode)||PaperVoiceCore.modes[0];
      if(find('translation'))find('translation').checked=this.get('translation',false);
      if(find('readTranslation')){
        find('readTranslation').checked=this.get('readTranslation',false);
        find('readTranslation').disabled=!this.translationVoiceLanguage();
        find('readTranslationRow').title=this.translationVoiceLanguage()?'译文朗读支持中文、日语、法语和英语':'该译文语种暂无离线声音';
        for(const option of find('target').options)option.disabled=(this.get('readTranslation',false)&&!this.translationVoiceLanguage(option.value))||(option.value==='zh-Hant'&&this.get('translationProvider','tencenttransmart')==='tencenttransmart');
      }
      if(find('provider'))find('provider').value=this.get('translationProvider','tencenttransmart');
      if(find('target'))find('target').value=this.get('translationTarget','zh-Hans');
      find('voiceSummary').textContent=PaperVoiceCore.voices.find(v=>v.id===this.settingsVoice())?.label||'声音设置';
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
    if(this.get('readTranslation',false)&&!this.translationVoiceLanguage(target))return;
    this.cancelTranslationClick();this.set('translationTarget',target);this.translationTicket++;this.hideTranslation();this.syncSettings();
    if(this.get('translation',false))this.toggleTranslation(true);
  },
  cycleTranslationLanguage() {
    const languages=['zh-Hans','zh-Hant','ja','ko','fr','en','de','es','ru'].filter(x=>(!this.get('readTranslation',false)||this.translationVoiceLanguage(x))&&(x!=='zh-Hant'||this.get('translationProvider','tencenttransmart')!=='tencenttransmart'));
    const index=languages.indexOf(this.get('translationTarget','zh-Hans'));
    this.setTranslationTarget(languages[(index+1)%languages.length]);
    if(!this.get('translation',false))this.toggleTranslation(true);
  },
  translationLanguage() {
    const languages={'zh-Hans':['简','简体中文'],'zh-Hant':['繁','繁體中文'],ja:['日','日本語'],ko:['한','한국어'],fr:['FR','Français'],en:['EN','English'],de:['DE','Deutsch'],es:['ES','Español'],ru:['RU','Русский']};
    const code=this.get('translationTarget','zh-Hans'),[badge,label]=languages[code]||languages['zh-Hans'];return {code,badge,label};
  },
  updateSelectionAction() {
    const action=this.selectionAction;if(!action)return;
    const {button,reader,generation}=action;
    const current=generation===this.generation&&reader===this.currentReader,active=current&&['loading','playing','paused'].includes(this.state);
    button.disabled=!!active;button.setAttribute('aria-busy',String(current&&this.state==='loading'));
    const label=active?(this.state==='loading'?'准备中…':this.state==='playing'?'正在朗读':'已暂停'):current&&this.state==='error'?'重试朗读':this.get('mode','selection')==='document'&&this.get('documentStart','begin')==='selection'?'▶ 从此句开始连读':'▶ 自然朗读';
    button.textContent=this.t(label);button.title=current?this.t(this.status):'';
    if(!current||!button.isConnected)this.selectionAction=null;
  },
  setStatus(message, state = this.state) { this.status = message; this.state = state; this.updatePanels();this.updateSelectionAction(); },
  updatePanels() {
    const active=['playing','paused','loading'].includes(this.state),mode=this.get('mode','selection');
    for (const {root,find,action,closeNavigation,closeAudioPopover,finishInteraction,syncCompanionPose} of this.livePanels()) {
      if(root.dataset.state!==this.state)finishInteraction?.();root.dataset.state=this.state;syncCompanionPose?.();find('status').textContent=this.status;
      find('preview').textContent=this.currentSentence || this.lastText.slice(0,220);if(!find('preview').textContent)find('preview').textContent='选择一段文字，留一点时间给耳朵。';
      find('progressBar').style.width=(this.readProgress?100*this.readProgress.current/this.readProgress.total:0)+'%';
      if(action('quickReadTranslation')){action('quickReadTranslation').setAttribute('aria-checked',String(this.get('readTranslation',false)));action('quickReadTranslation').disabled=!this.translationVoiceLanguage();action('quickReadTranslation').title=this.translationVoiceLanguage()?(this.get('readTranslation',false)?'只读译文 · 点击切回原文':'朗读原文 · 点击切换译文'):'该译文语种暂无离线声音';}
      if(!active)closeAudioPopover?.();
      action('quickTranslate').setAttribute('aria-pressed',String(this.get('translation',false)));
      const language=this.translationLanguage();
      find('quickTranslateLabel').textContent=language.badge;
      action('quickTranslate').title='单击切换译文语言 · 双击关闭译文 · '+language.label+' · Option/Alt + T';
      action('quickTranslate').setAttribute('aria-label',action('quickTranslate').title);
      find('quick').hidden=false;
      action('quickStop').hidden=!active;action('quickTranslate').hidden=!active;
      action('quickPause').hidden=!active&&!this.lastText&&mode!=='document';
      find('playbackTools').hidden=action('quickPause').hidden;
      find('primaryLabel').textContent=this.state==='paused'?'继续':active?'暂停':mode==='document'?(this.get('documentStart','begin')==='resume'?'继续上次':'开始连读'):'开始朗读';
      action('primary').querySelector('img').src=this.assetURI+'icons/'+(active && this.state!=='paused'?'pause':'play')+'.svg';
      action('quickPause').querySelector('img').src=this.assetURI+'icons/'+(!active||this.state==='paused'?'play':'pause')+'.svg';
      const modeIndex=PaperVoiceCore.modes.findIndex(x=>x.id===mode),current=PaperVoiceCore.modes[modeIndex]||PaperVoiceCore.modes[0],next=PaperVoiceCore.modes[(modeIndex+1)%4];
      action('quickMode').querySelector('img').src=this.assetURI+'icons/'+current.icon+'.svg';
      find('quickModeLabel').textContent=current.short;
      action('quickMode').setAttribute('aria-label',current.label+'；点击切换为'+next.label);action('quickMode').title=current.label+' → '+next.label;
      action('orb').title='Paper Voice · '+this.status;
      const canNavigate=active&&mode!=='selection'&&!!this.currentUnit;
      const modifier=Zotero.isMac?'Option':'Alt';
      find('paragraphNavigation').hidden=mode==='sentence';
      find('playbackTools').dataset.available=String(canNavigate);
      if(!canNavigate)closeNavigation?.();
      for(const name of ['Previous','Replay','Next']){
        action('quick'+name).disabled=!canNavigate;
        action('quickSentence'+name).disabled=!canNavigate;
        const label=(name==='Previous'?'上一':name==='Next'?'下一':'重读当前');
        const arrow=name==='Previous'?'↑':name==='Next'?'↓':null;
        for(const [button,unit,shortcut] of [[action('quick'+name),'段',arrow?modifier+' + '+arrow:'→'],[action('quickSentence'+name),'句',arrow||'←']]){
          button.title=label+unit+' · '+shortcut;
          button.setAttribute('aria-keyshortcuts',arrow?(unit==='段'?'Alt+':'')+(name==='Previous'?'ArrowUp':'ArrowDown'):unit==='段'?'ArrowRight':'ArrowLeft');
        }
      }
      action('quickPause').title='暂停或继续'+(canNavigate?' · 悬停展开句段导航':'');
      action('quickPause').setAttribute('aria-label',action('quickPause').title);
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
  async resolveSelection(reader,selection) {
    if(!selection||!Number.isInteger(selection.pageIndex))return null;
    const view=reader?._internalReader?._primaryView,pdf=view?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(!pdf||selection.pageIndex<0||selection.pageIndex>=pdf.numPages)return null;
    const page=Components.utils.waiveXrays(await pdf.getPage(selection.pageIndex+1)),items=(await page.getTextContent()).items;
    const anchorOffset=PaperVoiceCore.selectionOffset(items,selection,view._pdfPages?.[selection.pageIndex]?.chars||[]);
    return anchorOffset>=0?{...selection,anchorOffset}:null;
  },
  async navigateScope(delta,reader,scope=null) {
    const current=this.currentUnit,mode=this.get('mode','selection'),generation=this.generation;
    if(!current||(mode==='selection'&&!scope))return;
    try{
      const all=await this.documentUnits(reader);
      if(generation!==this.generation)return;
      const source=all.length?all:(this.session?.units||[]);
      const target=PaperVoiceCore.scopeUnits(source,current,scope||mode,delta)[0];
      if(!target)return;
      const readScope=mode==='selection'?scope:mode==='sentence'&&scope==='paragraph'?'paragraph':mode;
      const units=mode==='document'?source.slice(PaperVoiceCore.unitIndex(source,target)):PaperVoiceCore.scopeUnits(source,target,readScope);
      if(!units.length)return;
      const startIndex=scope==='sentence'&&mode==='paragraph'?Math.max(0,PaperVoiceCore.unitIndex(units,target)):0;
      this.stop(false);this.currentReader=reader;this.playbackMode=mode;
      return this.runUnits(units,reader,this.generation,{mode,startIndex,loops:mode==='document'?1:Number(this.get(mode==='selection'?'selectionRepeat':'repeat',mode==='selection'?1:0))});
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
      const selected=this.selectionContexts.get(reader);
      if(origin==='selection'&&(!selected?.text||!Number.isInteger(selected.pageIndex)))throw new Error('请先在这篇 PDF 中划选字母、单词或句子，再从选定位置开始');
      const resolved=origin==='selection'?await this.resolveSelection(reader,selected):null;
      if(generation!==this.generation)return;
      if(origin==='selection'&&!resolved)throw new Error('未能准确定位选区，请在 PDF 中重新划选后再开始');
      const margins=await this.publicationMargins(pdf);
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
        const index=PaperVoiceCore.selectedSentenceIndex(units,resolved.pageIndex,resolved.anchorOffset);
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
    if(!sample){this.lastText=text;this.lastReader=reader;this.currentSentence='';this.readProgress=null;if(!keepSentence)this.sentenceIndex=0;}
    const requestedMode=sample?'selection':this.get('mode','selection');
    const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(!sample&&pdf&&['sentence','paragraph'].includes(requestedMode)){
      this.playbackMode=requestedMode;this.setStatus('正在定位所选文字…','loading');
      try{
        const context=this.selectionContexts.get(reader);
        const pageIndex=context?.pageIndex??(reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer?.currentPageNumber||1)-1;
        const resolved=await this.resolveSelection(reader,{...context,pageIndex,text:context?.text||text});
        if(generation!==this.generation)return;
        if(!resolved)throw new Error('未能准确定位选区，请在 PDF 中重新划选后再开始');
        const all=await this.documentUnits(reader);
        if(generation!==this.generation)return;
        const units=PaperVoiceCore.scopeUnits(all,resolved,requestedMode);
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
    const languageMode=sample?this.settingsVoiceLanguage():this.get('speechLanguage','auto');
    const selectedVoice=this.get('voice','af_heart'),voiceChoices=Object.fromEntries(PaperVoiceCore.speechLanguages.map(x=>[x.id,this.get('voiceFor_'+x.id,PaperVoiceCore.voices.find(v=>v.language===x.id).id)]));
    voiceChoices[this.speechLanguage()]=selectedVoice;
    let contextText='',documentLanguage=languageMode;
    const rate=PaperVoiceCore.rate(this.get('rate',1));
    const session=this.session={units,sample,remainingLoops:loops,pendingMode:this.session?.pendingMode||null,context:this.session?.context};
    const cache=new Map();let lastPage=null;
    let activeConfig=null,activeSentence=null;
    const sameSentence=(a,b)=>a&&b&&(a.sentenceId!==undefined?b.sentenceId===a.sentenceId:a.sentenceText&&a.text!==a.sentenceText&&b.sentenceText===a.sentenceText);
    const configFor=index=>activeConfig&&sameSentence(activeSentence,units[index])?activeConfig:{readTranslation:!sample&&this.get('readTranslation',false),provider:this.get('translationProvider','tencenttransmart'),target:this.get('translationTarget','zh-Hans')};
    const audioKey=config=>[config.readTranslation,config.provider,config.target].join('|');
    const prepare=index=>{
      const unit=units[index],config=configFor(index),{readTranslation,target,provider}=config,key=audioKey(config);
      let endIndex=index;
      // One translated sentence may span several PDF columns/pages. Translate it
      // once, keeping every original fragment available for focus and restoration.
      if(readTranslation)while(endIndex+1<units.length){
        const candidate=units[endIndex+1];
        const same=sameSentence(unit,candidate);
        if(!same)break;endIndex++;
      }
      const members=units.slice(index,endIndex+1);
      const sourceSpeech=members.map(u=>u.spokenText??PaperVoiceCore.speechText(u.text)).join(' ');
      const paragraphText=unit.paragraphId===undefined?contextText:session.units.filter(u=>u.paragraphId===unit.paragraphId).map(u=>u.text).join(' ');
      const language=languageMode==='auto'?(PaperVoiceCore.detectSpeechLanguage(unit.sentenceText||unit.translationText||unit.text,paragraphText||contextText)||documentLanguage):languageMode;
      if(!PaperVoiceCore.speechLanguages.some(x=>x.id===language))throw new Error('无法确定受支持的朗读语言，请在设置中手动选择英语、中文、日语或法语。');
      const outputLanguage=readTranslation?this.translationVoiceLanguage(target):language;
      if(!outputLanguage)throw new Error('译文朗读暂不可用，请更换译文语种');
      const voice=(readTranslation||(sample&&this.get('readTranslation',false)))?this.get('voiceFor_'+outputLanguage,PaperVoiceCore.voices.find(v=>v.language===outputLanguage).id):voiceChoices[outputLanguage];
      const translation=(readTranslation||this.get('translation',false))&&!sample?this.translate(readTranslation?sourceSpeech:(unit.translationText||unit.text),language,{target,provider}):Promise.resolve(null);
      const synthesize=async text=>{
        const spoken=PaperVoiceCore.measurementSpeech(text,outputLanguage),cacheKey=voice+'\0'+spoken;
        let speech=cache.get(cacheKey);
        if(!speech){speech=this.synthesize(spoken,voice,rate);if(mode!=='document'&&loops!==1)cache.set(cacheKey,speech);}
        return speech;
      };
      const speech=readTranslation?(async()=>{
        const translated=await translation;
        if(generation!==this.generation||this.dead)return null;
        if(!translated?.text?.trim())throw new Error('译文未能获取，请重试或切换翻译服务');
        const clips=[];
        for(const chunk of PaperVoiceCore.chunks(translated.text,1000)){
          if(generation!==this.generation||this.dead)return null;
          clips.push(await synthesize(chunk));
        }
        return {clips,translated};
      })():synthesize(sourceSpeech);
      this.inflight=speech;translation.catch(()=>{});speech.catch(()=>{});
      return {speech,translation,unit,language,voice,key,config,readTranslation,endIndex,members,translationKey:this.get('translation',false)+'|'+provider+'|'+target};
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
      let next=prepare(startIndex);
      for(let cycle=0;loops===0 || cycle<loops;cycle++) {
        if(cycle>0){activeConfig=null;activeSentence=null;}
        for(let i=cycle===0?startIndex:0;i<units.length;i++) {
          let prepared=next,result;
          // A prefetched voice/target must never leak into a changed setting.
          while(true){
            try{result=await prepared.speech;}catch(error){if(prepared.key===audioKey(configFor(i)))throw error;}
            if(generation!==this.generation||this.dead)return;
            if(prepared.key===audioKey(configFor(i)))break;
            prepared=prepare(i);
          }
          if(generation!==this.generation || this.dead)return;
          activeConfig=prepared.config;activeSentence=prepared.unit;
          this.activeSpeechLanguage=prepared.language;
          if(!prepared.readTranslation&&languageMode==='auto'&&this.get('speechLanguage','auto')==='auto'){this.set('voice',prepared.voice);this.syncSettings();}
          const hasNext=prepared.endIndex+1<units.length || loops===0 || cycle+1<loops;
          if(hasNext)next=prepare((prepared.endIndex+1)%units.length);
          let unit=units[i];this.currentSentence=unit.text;this.currentUnit=unit;this.readProgress={current:i+1,total:units.length};
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
          session.remainingLoops=loops===0?0:loops-cycle;
          this.pendingProgress=sample?null:{reader,unit,generation,mode};
          const message=`${prefix}正在朗读 ${i+1}/${units.length}${suffix}`;
          if(prepared.readTranslation){
            const total=result.clips.reduce((n,clip)=>n+(clip.duration||1),0);
            const weights=prepared.members.map(u=>Math.max(1,PaperVoiceCore.speechText(u.text).length)),weight=weights.reduce((a,b)=>a+b,0);
            let elapsed=0,memberIndex=0,focus=Promise.resolve();
            const advance=fraction=>{
              let targetIndex=0,sum=weights[0];
              while(targetIndex<weights.length-1&&fraction*weight>=sum)sum+=weights[++targetIndex];
              if(targetIndex<=memberIndex)return;
              memberIndex=targetIndex;
              const targetUnit=prepared.members[targetIndex],progressIndex=i+targetIndex;
              // Translation word order differs from the source. Follow source
              // fragments approximately by elapsed audio, never by target offsets.
              focus=focus.then(async()=>{
                if(generation!==this.generation||this.dead)return;
                this.currentUnit=targetUnit;this.currentSentence=targetUnit.text;
                this.readProgress={current:progressIndex+1,total:units.length};
                this.pendingProgress=sample?null:{reader,unit:targetUnit,generation,mode};
                this.rememberPlayback(this.pendingProgress);
                await this.highlightSentence?.(reader,targetUnit,generation);
                if(generation!==this.generation||this.dead)return;
                if(this.get('translation',false)&&prepared.config.target===this.get('translationTarget','zh-Hans')&&prepared.config.provider===this.get('translationProvider','tencenttransmart'))this.showTranslation(reader,targetUnit,result.translated.text,result.translated.source);
                this.updatePanels();
              });
              focus.catch(()=>{});
            };
            for(const clip of result.clips){
              if(generation!==this.generation||this.dead)return;
              await this.playAudio(clip.audio,reader,generation,message,time=>advance((elapsed+time)/total));
              if(generation!==this.generation||this.dead)return;
              elapsed+=clip.duration||1;advance(elapsed/total);await focus;
            }
            unit=units[prepared.endIndex];i=prepared.endIndex;
          }else await this.playAudio(result.audio,reader,generation,message);
          if(generation!==this.generation || this.dead)return;
          if(session.pendingMode){
            const all=await session.context;
            if(generation!==this.generation||this.dead)return;
            mode=session.pendingMode;session.pendingMode=null;this.playbackMode=mode;
            const scope=mode==='document'?(all.length?all:units):mode==='selection'?session.units:PaperVoiceCore.scopeUnits(all.length?all:units,unit,mode);
            units=PaperVoiceCore.afterUnit(scope,unit).filter(u=>u.spokenText??PaperVoiceCore.speechText(u.text));
            loops=1;cycle=0;i=-1;session.units=units;activeConfig=null;activeSentence=null;
            if(units.length)next=prepare(0);
          }
        }
      }
      if(generation===this.generation){if(!sample)this.clearReadingSession();this.session=null;this.releaseAudio();this.clearSentenceHighlight?.();this.setStatus(mode==='document'&&this.documentEmptyPages?`朗读完成 · ${this.documentEmptyPages} 页无文字，已跳过`:'朗读完成 · 可以继续划选下一段','idle');}
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
    this.saveReadingSession();
  },
  // Keep the checkpoint outside the extension package so upgrades can replace all
  // code without losing the listening context. Never persist DOM, audio or readers.
  loadReadingSession() {
    this.pendingRestoration=null;
    try {
      const raw=this.get('readingSession',null);
      if(raw!==null){
        const saved=JSON.parse(raw);
        if(saved?.version===1&&saved.itemID&&saved.anchor?.text&&PaperVoiceCore.modes.some(m=>m.id===saved.mode))this.pendingRestoration=saved;
        return;
      }
      // One-time recovery from versions which only recorded the last heard unit.
      const previous=Zotero.Reader._readers.map(reader=>{
        try {return {...JSON.parse(this.get('progress.'+reader.itemID,'null')),itemID:reader.itemID};}catch(_){return null;}
      }).filter(x=>x?.text&&Number.isInteger(x.pageIndex)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
      if(previous){
        const mode=PaperVoiceCore.modes.some(m=>m.id===previous.mode)?previous.mode:'document';
        this.pendingRestoration={version:1,itemID:previous.itemID,mode,anchor:previous,legacy:true,loops:mode==='document'?1:Number(this.get(mode==='selection'?'selectionRepeat':'repeat',1))};
      }
      this.set('readingSession',JSON.stringify(this.pendingRestoration));
    }catch(_){this.set('readingSession','null');}
  },
  clearReadingSession() {
    this.pendingRestoration=null;this.restoredSession=null;this.set('readingSession','null');
  },
  saveReadingSession() {
    if(this.restoredSession){this.set('readingSession',JSON.stringify(this.restoredSession));return;}
    const session=this.session,reader=this.currentReader;
    if(!reader?.itemID||!this.currentUnit||!session||session.sample||!['playing','paused','loading'].includes(this.state))return;
    const fields=['text','spokenText','speechSource','sentenceText','translationText','sentenceId','paragraphId','pageIndex','anchorOffset','sentenceOffset','highlightOffset','highlightText','unitInPage'];
    const copy=unit=>Object.fromEntries(fields.filter(key=>['string','number'].includes(typeof unit[key])).map(key=>[key,unit[key]]));
    const mode=session.pendingMode||this.playbackMode||this.get('mode','selection');
    const saved={version:1,itemID:reader.itemID,mode,anchor:copy(this.currentUnit),loops:session.pendingMode?1:session.remainingLoops,updatedAt:Date.now()};
    if(mode!=='document')saved.units=session.units.map(copy);
    if(session.pendingMode)saved.rescope=true;
    this.set('readingSession',JSON.stringify(saved));
  },
  restoreReadingSession(reader) {
    const saved=this.pendingRestoration;
    if(!saved||saved.itemID!==reader.itemID||this.dead)return;
    this.pendingRestoration=null;this.restoredSession=saved;
    this.currentReader=reader;this.lastReader=reader;this.currentUnit=saved.anchor;
    this.currentSentence=saved.anchor.text;this.lastText=(saved.units||[saved.anchor]).map(u=>u.text).join(' ');
    this.playbackMode=saved.mode;this.set('mode',saved.mode);
    this.selectionContexts.set(reader,{text:this.lastText,pageIndex:saved.anchor.pageIndex,anchorOffset:saved.anchor.anchorOffset});
    this.setStatus('已恢复上次朗读，点击继续','paused');this.syncSettings();
  },
  async resumeReadingSession() {
    const saved=this.restoredSession,reader=this.currentReader,generation=this.generation;
    if(!saved||!reader)return;
    this.setStatus('正在恢复上次朗读…','loading');
    if(this.restoringGeneration===generation)return;
    this.restoringGeneration=generation;
    try {
      let units=saved.units;
      if(units?.length&&saved.mode!=='document'&&!saved.rescope){
        // Reapply current PDF text repair and citation rules to older checkpoints.
        units=units.map(unit=>({...unit}));
        await this.locateSelectionUnits(reader,units,units.map(unit=>unit.text).join(' '),generation);
        if(generation!==this.generation||this.dead)return;
      }
      let mode=saved.mode;
      if(!units?.length||mode==='document'||saved.rescope){
        const all=await this.documentUnits(reader);
        if(generation!==this.generation||this.dead)return;
        const at=PaperVoiceCore.unitIndex(all,saved.anchor);
        if(at<0)throw new Error('未能恢复朗读位置，请等待 PDF 加载完成后重试');
        const current=all[at];mode=saved.mode;
        units=mode==='document'?all:PaperVoiceCore.scopeUnits(all,current,mode==='selection'?'sentence':mode);
      }
      if(generation!==this.generation||this.dead)return;
      let index=PaperVoiceCore.unitIndex(units,saved.anchor);
      if(index<0)throw new Error('未能恢复朗读位置，请等待 PDF 加载完成后重试');
      const sentenceId=units[index].sentenceId;
      const sentenceText=units[index].sentenceText;
      while(index>0&&(sentenceId!==undefined?units[index-1].sentenceId===sentenceId:sentenceText&&units[index-1].sentenceText===sentenceText))index--;
      this.restoredSession=null;this.playbackMode=mode;
      this.lastText=units.map(u=>u.text).join(' ');this.lastReader=reader;
      this.session=null;
      return this.runUnits(units,reader,generation,{mode,loops:mode==='document'?1:(Number.isInteger(saved.loops)&&saved.loops>=0?saved.loops:1),startIndex:index});
    }catch(error){
      if(generation===this.generation&&!this.dead)this.setStatus(error.message,'paused');
    }finally{if(this.restoringGeneration===generation)this.restoringGeneration=null;}
  },
  playAudio(encoded, reader, generation, message, onProgress=null) {
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
      audio.onplaying = () => this.rememberPlayback(this.pendingProgress||progress);
      audio.ontimeupdate = () => {if(generation===this.generation&&this.audio===audio&&!audio.paused)onProgress?.(audio.currentTime);};
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
      if(this.restoredSession)return this.resumeReadingSession();
      if (this.audio) { const audio=this.audio,generation=this.generation;audio.play().catch(e => {if(this.audio===audio&&this.generation===generation&&this.state!=='paused')this.setStatus(e.message,'error');}); this.setStatus(this.resumeStatus || '正在朗读','playing'); }
      else this.setStatus('正在准备自然语音…','loading');
    } else if (this.state === 'playing' || this.state === 'loading') {
      this.audio?.pause(); this.setStatus('已暂停，点击继续','paused');this.saveReadingSession();
    }
  },
  releaseAudio() {
    if (this.audio) { this.audio.pause(); this.audio.onended=null; this.audio.onerror=null;this.audio.onplaying=null;this.audio.ontimeupdate=null; this.audio.removeAttribute('src'); this.audio.load(); }
    this.audio = null;
    if (this.audioURL) { try { this.audioWindow.URL.revokeObjectURL(this.audioURL); } catch (_) {} this.audioURL=null; }
    this.audioDone?.(); this.audioDone=null;
  },
  stop(show = true, preserveSession = false) {
    if(!preserveSession&&!this.quitting)this.clearReadingSession();
    this.cancelTranslationClick();
    this.session=null;this.generation++; this.translationTicket++; this.currentUnit=null;this.pendingProgress=null;this.playbackMode=null; this.clearSelectionTimers(); this.releaseAudio();
    this.hideTranslation?.();this.clearSentenceHighlight?.();
    this.state = 'idle';
    if (show) this.setStatus('已停止 · 拖选下一段即可朗读','idle');
  },
  async shutdown() {
    this.saveReadingSession();
    // Flush the preference checkpoint before Zotero terminates or swaps versions.
    Services.prefs.savePrefFile(null);
    this.dead=true; this.stop(false,true);this.currentReader=null;
    this.host.clearInterval(this.scanTimer);
    Services.obs.removeObserver(this.quitObserver,'quit-application-granted');
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

if(typeof PaperVoiceThemes!=='undefined')Object.assign(PaperVoice,PaperVoiceThemes);
