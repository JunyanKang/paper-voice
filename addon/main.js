/* Paper Voice: Zotero reader integration. Speech stays local; translation is opt-in. */
var PaperVoice = {
  id: 'paper-voice@local.research',
  prefix: 'extensions.paperVoice.',
  panels: new Map(), windows: new Map(), readerHooks: new Map(),
  generation: 0, process: null, processStart: null, pending: new Map(), sequence: 0,
  audio: null, audioURL: null, lastText: '', currentReader: null, state: 'idle', status: '拖选 PDF 英文，松开鼠标即可朗读',
  lastSelections: new Map(), timers: new Map(), dead: false, translationTicket: 0,
  get(name, fallback) { return Zotero.Prefs.get(this.prefix + name, true) ?? fallback; },
  set(name, value) { Zotero.Prefs.set(this.prefix + name, name==='rate'?String(value):value, true); },
  get host() { return Zotero.getMainWindow(); },
  async start() {
    this.dead = false;
    this.selectionHandler = e => this.onSelection(e);
    this.toolbarHandler = e => this.onToolbar(e);
    Zotero.Reader.registerEventListener('renderTextSelectionPopup', this.selectionHandler, this.id);
    Zotero.Reader.registerEventListener('renderToolbar', this.toolbarHandler, this.id);
    this.tabObserver = Zotero.Notifier.registerObserver({notify: (event, type) => {
      if (type === 'tab' && (event === 'select' || event === 'close')) this.stop();
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
  },
  addWindow(win) {
    if (this.windows.has(win)) return;
    const menu = win.document.getElementById('menu_ToolsPopup');
    const item = win.document.createXULElement('menuitem');
    item.id = 'paper-voice-tools'; item.setAttribute('label', 'Paper Voice · 论文听读');
    item.addEventListener('command', () => {
      const reader = Zotero.Reader.getByTabID(win.Zotero_Tabs.selectedID);
      if (reader) this.showPanel(reader);
      else win.alert('请先打开一篇 PDF，再点击阅读器右上角的「听读」。');
    });
    menu?.append(item);
    this.windows.set(win, item);
  },
  removeWindow(win) { this.windows.get(win)?.remove(); this.windows.delete(win); },
  attachReader(reader) {
    const doc = reader._iframeWindow?.document;
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
          // Stop immediately on a new PDF gesture; never queue overlapping speech.
          if (this.currentReader === reader) this.stop();
        }
      };
      const key = e => {
        if (e.key === 'Escape') this.stop();
        if(e.altKey && e.code==='KeyT'){e.preventDefault();this.toggleTranslation();}
        if (e.altKey && e.code === 'KeyP') { e.preventDefault(); this.togglePause(); }
      };
      d.addEventListener('pointerdown', down, true); d.addEventListener('keydown', key, true);
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
      try { h.doc.removeEventListener('pointerdown', h.down, true); h.doc.removeEventListener('keydown', h.key, true); } catch (_) {}
    }
    this.readerHooks.delete(reader); this.lastSelections.delete(reader);
    this.panels.get(reader)?.root.remove(); this.panels.delete(reader);
    if (this.currentReader === reader) this.stop();
  },
  toolbarButton(doc, reader) {
    const button = doc.createElement('button'); button.dataset.paperVoice = 'toolbar';
    button.textContent = '听读'; button.title = 'Paper Voice · 免费离线自然朗读';
    button.setAttribute('aria-label', 'Paper Voice 论文听读');
    button.style.cssText = 'width:auto;min-width:44px;padding:0 9px;font-size:13px;white-space:nowrap;';
    button.addEventListener('click', () => this.showPanel(reader, true));
    return button;
  },
  onToolbar({doc, reader, append}) { append(this.toolbarButton(doc, reader)); },
  onSelection({doc, reader, params, append}) {
    const text = PaperVoiceCore.cleanText(params.annotation?.text);
    if (!text) return;
    this.lastText = text; this.lastReader = reader;
    const button = doc.createElement('button'); button.dataset.paperVoice = 'selection';
    button.textContent = '▶ 自然朗读'; button.style.cssText = 'padding:5px 10px;cursor:pointer;';
    button.addEventListener('click', e => { e.stopPropagation(); this.clearSelectionTimers(); this.speak(text, reader); });
    append(button);
    this.selectedPage=params.annotation?.position?.pageIndex ?? null;
    if (!this.get('auto', true) || this.get('mode','selection')==='document') return;
    const key = text + JSON.stringify(params.annotation?.position || {});
    if (this.lastSelections.get(reader) === key) return;
    this.lastSelections.set(reader, key);
    this.clearSelectionTimers();
    const timer = this.host.setTimeout(() => {
      this.timers.delete(reader);
      if (!this.dead && this.get('auto', true)) this.speak(text, reader);
    }, 280);
    this.timers.set(reader, timer);
  },
  clearSelectionTimers() { for (const t of this.timers.values()) this.host.clearTimeout(t); this.timers.clear(); },
  ensurePanel(reader) {
    if (!this.panels.has(reader)) {
      this.panels.set(reader, PaperVoiceUI.create(this, reader));
      this.syncSettings(); this.updatePanels();
    }
    return this.panels.get(reader);
  },
  showPanel(reader, toggle = false) {
    const panel=this.ensurePanel(reader).panel;
    panel.hidden=toggle ? !panel.hidden : false;
  },
  modeHint() {
    return ({selection:'拖选英文，松开即读。悬浮按钮随时暂停。',document:'按页连续听读，可选择起点或继续上次进度。',paragraph:'划选一个段落，按设定次数反复朗读。',sentence:'划选一段文字，逐句循环；用左右按钮切换。'})[this.get('mode','selection')];
  },
  syncSettings() {
    const mode=this.get('mode','selection');
    for (const {root,find} of this.panels.values()) {
      find('voice').value=this.get('voice','af_heart');find('auto').checked=this.get('auto',true);
      find('rate').value=this.get('rate',1);find('rateLabel').textContent=`${Number(this.get('rate',1)).toFixed(2)}×`;
      find('mode').value=mode;find('documentRow').hidden=mode!=='document';find('documentStart').value=this.get('documentStart','begin');
      find('repeat').value=this.get('repeat',0);find('repeatRow').hidden=!['paragraph','sentence'].includes(mode);
      find('autoRow').hidden=mode==='document';find('modeNote').textContent=this.modeHint();
      for (const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
      if(find('translation'))find('translation').checked=this.get('translation',false);
      if(find('provider'))find('provider').value=this.get('translationProvider','tencenttransmart');
      if(find('target'))find('target').value=this.get('translationTarget','zh-Hans');
      find('voiceSummary').textContent=PaperVoiceCore.voices.find(v=>v.id===this.get('voice','af_heart'))?.label||'声音设置';
    }
    this.updatePanels();
  },
  setStatus(message, state = this.state) { this.status = message; this.state = state; this.updatePanels(); },
  updatePanels() {
    const active=['playing','paused','loading'].includes(this.state),mode=this.get('mode','selection');
    for (const {root,find,action} of this.panels.values()) {
      root.dataset.state=this.state;find('status').textContent=this.status;
      find('preview').textContent=this.currentSentence || this.lastText.slice(0,220);if(!find('preview').textContent)find('preview').textContent='选择一段英文，留一点时间给耳朵。';
      find('progressBar').style.width=(this.readProgress?100*this.readProgress.current/this.readProgress.total:0)+'%';
      action('quickTranslate').setAttribute('aria-pressed',String(this.get('translation',false)));
      action('quickTranslate').title=(this.get('translation',false)?'关闭':'开启')+'跟读翻译 · Option/Alt + T';
      find('quick').hidden=!active;find('primaryLabel').textContent=this.state==='paused'?'继续':active?'暂停':mode==='document'?(this.get('documentStart','begin')==='resume'?'继续上次':'开始连读'):'开始朗读';
      action('primary').querySelector('img').src=this.assetURI+'icons/'+(active && this.state!=='paused'?'pause':'play')+'.svg';
      action('quickPause').querySelector('img').src=this.assetURI+'icons/'+(this.state==='paused'?'play':'pause')+'.svg';
      action('orb').title='Paper Voice · '+this.status;
      action('previous').disabled=mode!=='sentence' || !(this.sentenceIndex>0);
      action('next').disabled=mode!=='sentence' || (this.sentenceIndex||0)>=PaperVoiceCore.sentences(this.lastText).length-1;
      action('stop').disabled=!active;
    }
  },
  primary(reader) {
    if(['playing','paused','loading'].includes(this.state))return this.togglePause();
    if(this.get('mode','selection')==='document')return this.startDocument(reader,this.get('documentStart','begin'));
    if(this.lastText && this.lastReader===reader)return this.speak(this.lastText,reader);
    this.setStatus('请先在这篇 PDF 中划选一段英文');
  },
  stepSentence(delta,reader) {
    const count=PaperVoiceCore.sentences(this.lastText).length;
    this.sentenceIndex=Math.max(0,Math.min(count-1,(this.sentenceIndex||0)+delta));
    if(count)this.speak(this.lastText,reader,false,true);
  },
  async startDocument(reader, origin='begin') {
    this.stop(false);const generation=this.generation;this.currentReader=reader;this.ensurePanel(reader);
    this.setStatus('正在读取 PDF 正文…','loading');
    try {
      const pdf=reader._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;
      if(!pdf)throw new Error('当前阅读器未就绪，请等待 PDF 加载完成');
      let saved={};try{saved=JSON.parse(this.get('progress.'+reader.itemID,'{}'))||{};}catch(_){}
      const current=(reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer?.currentPageNumber||1)-1;
      const requested=origin==='resume'?saved.pageIndex:origin==='current'?current:0;
      const startPage=Math.max(0,Math.min(pdf.numPages-1,Number.isInteger(requested)?requested:0));
      const units=[];let empty=0;
      for(let i=Math.min(pdf.numPages,startPage+1);i<=pdf.numPages;i++) {
        if(generation!==this.generation || this.dead)return;
        const page=Components.utils.waiveXrays(await pdf.getPage(i)),content=await page.getTextContent();
        if(generation!==this.generation || this.dead)return;
        const text=PaperVoiceCore.cleanText(content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));
        if(!text)empty++;
        let unitInPage=0;for(const sentence of PaperVoiceCore.sentences(text))for(const part of PaperVoiceCore.chunks(sentence)){if(!(origin==='resume' && i===startPage+1 && unitInPage<(saved.unitInPage||0)))units.push({text:part,pageIndex:i-1,unitInPage});unitInPage++;}
        this.setStatus(`正在读取第 ${i}/${pdf.numPages} 页…`,'loading');
      }
      if(generation!==this.generation)return;
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
      if (!(await IOUtils.exists(command))) throw new Error('尚未安装免费语音包。请运行安装包中的「安装免费语音包」脚本，然后点击试听。');
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
              if (result.ready) { this.host.clearTimeout(timeout); readyResolve(); }
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
    if(!/[a-zA-Z]/.test(text)){this.setStatus('请选择英文正文；扫描 PDF 需要先做文字识别','error');return;}
    const mode=sample?'selection':this.get('mode','selection');
    let sentences=PaperVoiceCore.sentences(text);
    if(mode==='sentence')sentences=[sentences[this.sentenceIndex||0] || sentences[0]];
    const units=sentences.flatMap(x=>PaperVoiceCore.chunks(x).map(part=>({text:part,pageIndex:this.selectedPage ?? null})));
    const loops=['sentence','paragraph'].includes(mode)?Number(this.get('repeat',0)):1;
    return this.runUnits(units,reader,generation,{mode,loops,sample});
  },
  async runUnits(units,reader,generation,{mode,loops,sample=false}) {
    this.setStatus('正在准备自然语音…','loading');
    const voice=this.get('voice','af_heart'),rate=PaperVoiceCore.rate(this.get('rate',1));
    const cache=new Map();let lastPage=null;
    const prepare=unit=>{
      let speech=cache.get(unit.text);
      if(!speech){speech=this.synthesize(unit.text,voice,rate);this.inflight=speech;if(['sentence','paragraph'].includes(mode))cache.set(unit.text,speech);}
      const translation=this.get('translation',false)&&!sample?this.translate(unit.text):Promise.resolve(null);
      translation.catch(()=>{});speech.catch(()=>{});
      return {speech,translation,unit,translationKey:this.get('translation',false)+'|'+this.get('translationProvider','tencenttransmart')+'|'+this.get('translationTarget','zh-Hans')};
    };
    try {
      if(this.inflight){try{await this.inflight;}catch(_){}}
      if(generation!==this.generation || this.dead)return;
      let next=prepare(units[0]);
      for(let cycle=0;loops===0 || cycle<loops;cycle++) {
        for(let i=0;i<units.length;i++) {
          const prepared=next,result=await prepared.speech;
          if(generation!==this.generation || this.dead)return;
          const hasNext=i+1<units.length || loops===0 || cycle+1<loops;
          if(hasNext)next=prepare(units[(i+1)%units.length]);
          const unit=units[i];this.currentSentence=unit.text;this.currentUnit=unit;this.readProgress={current:i+1,total:units.length};
          if(mode==='document' && reader.itemID)this.set('progress.'+reader.itemID,JSON.stringify({pageIndex:unit.pageIndex,unitInPage:unit.unitInPage||0}));
          if(mode==='document' && unit.pageIndex!==lastPage){reader.navigate({pageIndex:unit.pageIndex});lastPage=unit.pageIndex;}
          const sentenceTicket=++this.translationTicket;
          if(this.get('translation',false)&&!sample){
            this.showTranslation(reader,unit,'正在翻译…');
            const translationKey='true|'+this.get('translationProvider','tencenttransmart')+'|'+this.get('translationTarget','zh-Hans');
            const translated=prepared.translationKey===translationKey?prepared.translation:this.translate(unit.text);
            translated.then(value=>{if(generation===this.generation && sentenceTicket===this.translationTicket && this.get('translation',false))this.showTranslation(reader,unit,value?.text || '译文暂不可用',value?.source);},()=>{if(generation===this.generation && sentenceTicket===this.translationTicket)this.showTranslation(reader,unit,'翻译暂时不可用，可切换服务或译文语言。');});
          }
          const prefix=mode==='document'?`第 ${unit.pageIndex+1} 页 · `:mode==='sentence'?`第 ${(this.sentenceIndex||0)+1}/${PaperVoiceCore.sentences(this.lastText).length} 句 · `:'';
          const suffix=['sentence','paragraph'].includes(mode)?` · 第 ${cycle+1}${loops?'/'+loops:''} 遍`:'';
          await this.playAudio(result.audio,reader,generation,`${prefix}正在朗读 ${i+1}/${units.length}${suffix}`);
          if(generation!==this.generation || this.dead)return;
        }
      }
      if(generation===this.generation){this.releaseAudio();this.setStatus(mode==='document'&&this.documentEmptyPages?`朗读完成 · ${this.documentEmptyPages} 页无文字，已跳过`:'朗读完成 · 可以继续划选下一段','idle');}
    }catch(error){if(generation===this.generation && !this.dead){this.releaseAudio();this.setStatus(error.message || String(error),'error');Zotero.logError(error);}}
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
    return new Promise((resolve,reject) => {
      this.audioDone = resolve;
      audio.onended = resolve;
      audio.onerror = () => reject(new Error('无法播放音频，请检查音频输出后重试'));
      this.resumeStatus = message;
      this.setStatus(paused ? '已暂停，点击继续' : message, paused ? 'paused' : 'playing');
      if (!paused && generation === this.generation) audio.play().catch(reject);
    });
  },
  togglePause() {
    if (this.state === 'paused') {
      if (this.audio) { this.audio.play().catch(e => this.setStatus(e.message,'error')); this.setStatus(this.resumeStatus || '正在朗读','playing'); }
      else this.setStatus('正在准备自然语音…','loading');
    } else if (this.state === 'playing' || this.state === 'loading') {
      this.audio?.pause(); this.setStatus('已暂停，点击继续','paused');
    }
  },
  releaseAudio() {
    if (this.audio) { this.audio.pause(); this.audio.onended=null; this.audio.onerror=null; this.audio.removeAttribute('src'); this.audio.load(); }
    this.audio = null;
    if (this.audioURL) { try { this.audioWindow.URL.revokeObjectURL(this.audioURL); } catch (_) {} this.audioURL=null; }
    this.audioDone?.(); this.audioDone=null;
  },
  stop(show = true) {
    this.generation++; this.translationTicket++; this.currentUnit=null; this.clearSelectionTimers(); this.releaseAudio();
    this.hideTranslation?.();
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
