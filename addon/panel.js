var PaperVoiceUI = {
 visibility(element,visible) {
  if(!element)return;
  const target=String(visible);
  if(element.dataset.pvVisible===target&&element.hidden===!visible)return;
  const wasHidden=element.hidden,current=wasHidden?0:Number(element.ownerDocument.defaultView.getComputedStyle(element).opacity);
  element._pvFade?.cancel();element.dataset.pvVisible=target;element.inert=!visible;
  element.style.pointerEvents=visible?'':'none';
  if(element.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches||!element.animate){element.hidden=!visible;return;}
  element.hidden=false;
  const animation=element._pvFade=element.animate([{opacity:current},{opacity:visible?1:0}],{duration:160,easing:'ease-out',fill:'both'});
  animation.finished.then(()=>{if(element._pvFade!==animation)return;element.hidden=!visible;animation.cancel();element._pvFade=null;},()=>{});
 },
 syncSelects(root) {root._pvSelects?.sync();},
 installTooltips(root,controller) {
  const doc=root.ownerDocument,win=doc.defaultView,tip=doc.createElement('div');tip.className='pv-tooltip';tip.setAttribute('role','tooltip');tip.id='pv-tooltip';tip.hidden=true;root.append(tip);
  let target=null,timer=null,description=null;
  const owns=el=>el?.closest?.('[data-paper-voice]')&&!!el.closest('[data-paper-voice="shell"],[data-paper-voice="selection-card"],[data-paper-voice="toolbar"],[data-paper-voice="selection"],[data-paper-voice="translation"]');
  const collect=el=>{if(!owns(el))return;if(el.matches('[data-action=settings],[data-action=close],[data-action=llmBack],[data-action=orb]')){delete el.dataset.pvTooltip;el.removeAttribute('title');return;}const hasTitle=el.hasAttribute('title');if(!hasTitle&&el.dataset.pvTooltip)return;const text=hasTitle?el.getAttribute('title'):el.matches('button,a')&&!el.textContent.trim()?el.getAttribute('aria-label'):null;if(text===null)return;const labelled=el.matches('[data-theme-choice],[data-mode],[data-settings-tab]')||el.textContent.trim()===text||el.closest('.pv-panel')&&el.matches('button')&&!el.matches('.pv-select-trigger,[data-action=llmRemoveKey]')&&!!el.textContent.trim();if(text&&!labelled)el.dataset.pvTooltip=text;else delete el.dataset.pvTooltip;if(hasTitle)el.removeAttribute('title');};
  const scan=el=>{collect(el);el.querySelectorAll?.('[title],[aria-label]').forEach(collect);};scan(doc.body);
  const observer=new win.MutationObserver(records=>{for(const rec of records){if(rec.type==='attributes')collect(rec.target);else rec.addedNodes.forEach(scan);}});observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title','aria-label']});
  const hide=()=>{win.clearTimeout(timer);if(target){if(description===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',description);}target=null;PaperVoiceUI.visibility(tip,false);};
  const show=el=>{
   if(!el.isConnected||el.matches(':disabled')||el.getAttribute('aria-expanded')==='true')return;const value=el.querySelector('.pv-select-value');if(value&&value.scrollWidth<=value.clientWidth+1)return;
   const text=el.dataset.pvTooltip;if(!text)return;
   target=el;description=el.getAttribute('aria-describedby');el.setAttribute('aria-describedby',((description||'')+' '+tip.id).trim());tip.textContent=controller.t(text);controller.applyTheme(tip);
   tip.style.left='0px';tip.style.top='0px';tip.style.visibility='hidden';PaperVoiceUI.visibility(tip,true);
   const b=el.getBoundingClientRect(),t=tip.getBoundingClientRect(),top=b.bottom+8;
   // Keep one consistent side. At the screen edge, omit a nonessential hint
   // rather than covering its control or jumping to another side.
   if(top+t.height>win.innerHeight-4){hide();tip.style.visibility='';return;}
   tip.style.left=Math.max(8,Math.min(b.left+(b.width-t.width)/2,win.innerWidth-t.width-8))+'px';tip.style.top=top+'px';tip.style.visibility='';
  };
  const enter=e=>{const el=e.target.closest?.('[data-pv-tooltip]');if(!owns(el)||el===target)return;hide();timer=win.setTimeout(()=>show(el),e.type==='focusin'?0:450);};
  const leave=e=>{if(!target||!target.contains(e.relatedTarget))hide();};
  doc.addEventListener('pointerover',enter);doc.addEventListener('pointerout',leave);doc.addEventListener('focusin',enter);doc.addEventListener('focusout',leave);doc.addEventListener('pointerdown',hide,true);doc.addEventListener('keydown',hide,true);doc.addEventListener('scroll',hide,true);win.addEventListener('resize',hide);
  return {hide,dispose(){hide();observer.disconnect();for(const [name,fn,capture] of [['pointerover',enter],['pointerout',leave],['focusin',enter],['focusout',leave],['pointerdown',hide,true],['keydown',hide,true],['scroll',hide,true]])doc.removeEventListener(name,fn,capture);win.removeEventListener('resize',hide);tip._pvFade?.cancel();tip.remove();}};
 },
 installSelects(root,controller) {
  const doc=root.ownerDocument,win=doc.defaultView,entries=[];
  const menu=doc.createElement('div');menu.className='pv-select-popover';menu.dataset.field='selectPopover';menu.hidden=true;menu.setAttribute('role','listbox');root.append(menu);
  let active=null,index=-1,typeAhead='',typeTimer=null;
  const close=()=>{if(active){active.button.setAttribute('aria-expanded','false');active.button.removeAttribute('aria-activedescendant');}active=null;PaperVoiceUI.visibility(menu,false);};
  const choose=i=>{if(!active)return;const entry=active,option=entry.select.options[i];if(!option||option.disabled)return;entry.select.selectedIndex=i;close();entry.select.dispatchEvent(new win.Event('change',{bubbles:true}));entry.button.focus();sync();};
  const highlight=i=>{if(!active)return;const options=Array.from(active.select.options);if(!options.length)return;index=Math.max(0,Math.min(i,options.length-1));for(const row of menu.children)row.dataset.focused=String(Number(row.dataset.index)===index);const row=menu.children[index];if(row){active.button.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});}};
  const open=entry=>{
   if(entry.select.disabled)return;
   close();active=entry;menu.replaceChildren();menu.id=entry.button.id+'-list';entry.button.setAttribute('aria-controls',menu.id);entry.button.setAttribute('aria-expanded','true');menu.setAttribute('aria-label',entry.button.getAttribute('aria-label')||entry.button.textContent);
   Array.from(entry.select.options).forEach((option,i)=>{const row=doc.createElement('div');row.id=menu.id+'-'+i;row.dataset.index=String(i);row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));row.setAttribute('aria-disabled',String(option.disabled));const label=doc.createElement('span');label.textContent=option.textContent;row.append(label);const mark=doc.createElement('span');mark.className='pv-select-check';mark.textContent=option.selected?'✓':'';mark.setAttribute('aria-hidden','true');row.append(mark);row.onpointermove=()=>highlight(i);row.onpointerdown=e=>e.preventDefault();row.onclick=()=>choose(i);menu.append(row);});
   menu.style.maxHeight='230px';menu.style.width='max-content';menu.style.maxWidth=Math.max(80,win.innerWidth-16)+'px';menu.style.left='8px';menu.style.top='8px';PaperVoiceUI.visibility(menu,true);
   const b=entry.button.getBoundingClientRect(),width=Math.min(Math.max(menu.offsetWidth,b.width),win.innerWidth-16),below=win.innerHeight-b.bottom-12,above=b.top-12,down=below>=Math.min(menu.scrollHeight,230)||below>=above,room=Math.max(36,down?below:above);
   menu.style.width=width+'px';menu.style.maxHeight=Math.min(230,room)+'px';menu.style.left=Math.max(8,Math.min(b.right-width,win.innerWidth-width-8))+'px';menu.style.top=(down?b.bottom+5:Math.max(8,b.top-menu.offsetHeight-5))+'px';highlight(entry.select.selectedIndex);
  };
  for(const [i,select] of Array.from(root.querySelectorAll('select')).entries()){
   const wrapper=doc.createElement('span');wrapper.className='pv-select';wrapper.dataset.selectField=select.dataset.field;
   select.before(wrapper);wrapper.append(select);select.hidden=true;select.tabIndex=-1;
   const button=doc.createElement('button');button.type='button';button.className='pv-select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
   const id=select.id||'pv-select-'+i;select.id=id+'-native';button.id=id;button.setAttribute('aria-label',select.getAttribute('aria-label')||doc.querySelector(`label[for="${id}"]`)?.textContent||'');
   const label=doc.createElement('span');label.className='pv-select-value';button.append(label);const caret=doc.createElement('span');caret.className='pv-select-arrow';caret.setAttribute('aria-hidden','true');button.append(caret);wrapper.append(button);
   const entry={select,button,label,wrapper};entries.push(entry);button.onclick=()=>active===entry?close():open(entry);
   button.onkeydown=e=>{
    if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape','Tab'].includes(e.key)){
     if(e.key==='Tab'){close();return;}e.preventDefault();e.stopPropagation();
     if(e.key==='Escape'){close();return;}
     if(e.key==='Enter'||e.key===' '){if(active===entry)choose(index);else open(entry);return;}
     const wasOpen=active===entry;if(!wasOpen)open(entry);
     const options=Array.from(select.options),step=e.key==='ArrowUp'?-1:1;let next=e.key==='Home'?0:e.key==='End'?options.length-1:wasOpen?index+step:index;
     while(options[next]?.disabled)next+=step;highlight(next);return;
    }
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(active!==entry)open(entry);win.clearTimeout(typeTimer);typeAhead+=e.key.toLocaleLowerCase();typeTimer=win.setTimeout(()=>typeAhead='',700);const at=Array.from(select.options).findIndex(o=>!o.disabled&&o.textContent.toLocaleLowerCase().startsWith(typeAhead));if(at>=0)highlight(at);}
   };
   button.onblur=e=>{if(active===entry&&!menu.contains(e.relatedTarget))close();};
  }
  const sync=()=>{for(const e of entries){e.label.textContent=e.select.selectedOptions[0]?.textContent||'';e.button.disabled=e.select.disabled;e.button.title=e.label.textContent;}};
  const outside=e=>{if(active&&!active.wrapper.contains(e.target)&&!menu.contains(e.target))close();};
  doc.addEventListener('pointerdown',outside,true);win.addEventListener('resize',close);root._pvSelects={sync,close,dispose(){win.clearTimeout(typeTimer);doc.removeEventListener('pointerdown',outside,true);win.removeEventListener('resize',close);menu._pvFade?.cancel();menu.remove();}};sync();
 },
 create(controller, reader) {
  const doc=reader._iframeWindow.document,root=doc.createElement('div');
  root.className='pv-shell';root.dataset.paperVoice='shell';root.dataset.state='idle';
  const icon=name=>`<img class="pv-icon" src="${controller.assetURI}icons/${name}.svg" alt=""/>`;
  root.innerHTML=`<style>${controller.cssText}</style><section class="pv-panel" data-paper-voice="panel" aria-label="Paper Voice 朗读控制" hidden>
   <header class="pv-header"><img class="pv-brand-icon" src="${controller.assetURI}mascot.png" alt=""/><div class="pv-brand">Paper Voice<span>论文听读</span></div><button class="pv-icon-button" data-action="settings" aria-label="声音与翻译设置">${icon('settings')}</button><button class="pv-icon-button" data-action="close" aria-label="收起朗读面板">${icon('x')}</button></header>
   <div data-field="home">
    <div class="pv-mode-options" role="group" aria-label="朗读模式">${PaperVoiceCore.modes.map(mode=>`<button data-mode="${mode.id}" aria-label="${mode.label}" title="${mode.label}" aria-pressed="false">${icon(mode.icon)}<span>${mode.short}</span></button>`).join('')}</div>
    <div class="pv-mode-note" data-field="modeNote"></div>
    <div class="pv-context-row" data-field="repeatRow" hidden><span>循环</span><select data-field="repeat" aria-label="循环次数"><option value="1">1 次</option><option value="0">持续循环</option><option value="2">2 次</option><option value="3">3 次</option><option value="5">5 次</option></select></div>
    <div class="pv-context-row" data-field="documentRow" hidden><span>起点</span><select data-field="documentStart" aria-label="全文朗读起点"><option value="begin">首页</option><option value="current">当前页</option><option value="resume">上次位置</option><option value="selection">选定句</option></select></div>
    <div class="pv-preview" data-field="preview">选择一段文字，留一点时间给耳朵。</div>
    <div class="pv-progress-track"><div data-field="progressBar"></div></div><div class="pv-status" data-field="status" role="status" aria-live="polite"></div>
    <div class="pv-transport"><button class="pv-icon-button" data-action="previous" aria-label="上一句" title="上一句">${icon('chevron-left')}</button><button class="pv-primary" data-action="primary">${icon('play')}<span data-field="primaryLabel">开始朗读</span></button><button class="pv-icon-button" data-action="next" aria-label="下一句" title="下一句">${icon('chevron-right')}</button><button class="pv-icon-button pv-stop" data-action="stop" aria-label="停止朗读" title="停止 · Esc">${icon('square')}</button></div>
    <footer class="pv-footer"><button data-action="voiceSettings" data-field="voiceSummary">美音 · Heart</button><span>免费离线朗读</span></footer>
   </div>
   <div data-field="settingsPage" hidden>
    <div class="pv-settings-tabs" role="tablist" aria-label="设置分类"><button id="pv-tab-voice" data-settings-tab="voice" role="tab" aria-controls="pv-settings-voice" aria-selected="true">声音</button><button id="pv-tab-translation" data-settings-tab="translation" role="tab" aria-controls="pv-settings-translation" aria-selected="false" tabindex="-1">译文</button><button id="pv-tab-appearance" data-settings-tab="appearance" role="tab" aria-controls="pv-settings-appearance" aria-selected="false" tabindex="-1">外观</button></div>
    <div class="pv-settings-content">
     <div id="pv-settings-voice" data-settings-pane="voice" role="tabpanel" aria-labelledby="pv-tab-voice">
    <div class="pv-setting-row"><label for="pv-speech-language">朗读语言</label><select id="pv-speech-language" data-field="speechLanguage" aria-label="朗读语言"><option value="auto">自动</option>${PaperVoiceCore.speechLanguages.map(x=>`<option value="${x.id}">${x.label}</option>`).join('')}</select></div>
    <div class="pv-setting-row"><label for="pv-voice">声音</label><select id="pv-voice" data-field="voice" aria-label="朗读声音"></select></div>
    <div class="pv-setting-row"><label for="pv-rate">语速</label><span data-field="rateLabel"></span></div><input id="pv-rate" class="pv-range" aria-label="朗读语速" data-field="rate" type="range" min="0.6" max="1.6" step="0.05"/>
    <label class="pv-setting-row" data-field="autoRow"><span>划选后自动朗读</span><input type="checkbox" data-field="auto"/></label>
    <button class="pv-sample" data-action="sample">${icon('headphones')}试听当前声音</button>
     </div>
     <div id="pv-settings-translation" data-settings-pane="translation" role="tabpanel" aria-labelledby="pv-tab-translation" hidden>
    <div class="pv-setting-row pv-translation-row pv-translation-switches"><label><span>划词翻译</span><input type="checkbox" data-field="selectionTranslation"/></label><label><span>跟读译文</span><input type="checkbox" data-field="translation"/></label></div>
    <label class="pv-setting-row" data-field="readTranslationRow"><span>朗读译文</span><input type="checkbox" data-field="readTranslation"/></label>
    <div class="pv-setting-row"><label for="pv-provider">翻译服务</label><select id="pv-provider" data-field="provider" aria-label="翻译服务"><option value="tencenttransmart">腾讯 · 大陆优先</option><option value="bing">微软 · 免费</option><option value="google">Google · 海外</option><option value="llm">大模型 · API</option></select></div>
    <button class="pv-llm-summary" data-action="configureLLM" hidden>${icon('sparkles')}<span data-field="llmSummary">配置大模型</span>${icon('chevron-right')}</button>
    <div class="pv-setting-row"><label for="pv-target">译文语言</label><select id="pv-target" data-field="target" aria-label="译文语言"><option value="zh-Hans">简体中文</option><option value="zh-Hant">繁體中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="fr">Français</option><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option><option value="ru">Русский</option></select></div>
    <div class="pv-setting-row pv-caption-style-row"><label for="pv-caption-font">译文字体</label><select id="pv-caption-font" data-field="captionFont" aria-label="译文字体"><option value="system">系统字体</option><option value="sans">无衬线</option><option value="serif">衬线</option></select><select data-field="captionSize" aria-label="译文字号">${[10,11,12,13,14,15,16,18,20].map(n=>`<option value="${n}">${n} px</option>`).join('')}</select></div>
     </div>
     <div data-field="llmPage" hidden>
      <div class="pv-llm-heading"><button data-action="llmBack" aria-label="返回译文设置">${icon('chevron-left')}</button><span>大模型翻译</span><a data-action="llmHelp" href="#" aria-label="API 设置指南">${icon('file-text')}</a></div>
      <div class="pv-llm-row"><label for="pv-llm-provider">服务商</label><select id="pv-llm-provider" data-field="llmProvider" aria-label="大模型服务商">${controller.llmPresets.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
      <div class="pv-llm-row"><label for="pv-llm-model">模型</label><input id="pv-llm-model" data-field="llmModel" type="text" spellcheck="false" autocomplete="off" aria-label="模型名称" placeholder="Model ID"/></div>
      <div class="pv-llm-row"><label for="pv-llm-endpoint">地址</label><input id="pv-llm-endpoint" data-field="llmEndpoint" type="url" spellcheck="false" autocomplete="off" aria-label="API 地址" placeholder="https://…/v1"/></div>
      <div class="pv-llm-row"><label for="pv-llm-key">密钥</label><input id="pv-llm-key" data-field="llmKey" type="password" spellcheck="false" autocomplete="new-password" aria-label="API Key" placeholder="API Key"/><button data-action="llmRemoveKey" aria-label="移除已保存密钥" title="移除已保存密钥">${icon('trash-2')}</button></div>
      <div class="pv-llm-actions"><button data-action="llmSave">保存</button><button data-action="llmTest">保存并测试</button></div>
      <div class="pv-llm-result" data-field="llmResult" role="status" aria-live="polite">密钥仅存本机 · 费用由服务商收取</div>
     </div>
     <div id="pv-settings-appearance" data-settings-pane="appearance" role="tabpanel" aria-labelledby="pv-tab-appearance" hidden>
       <div class="pv-theme-choices" role="group" aria-label="窗口主题">${controller.themes.map(t=>`<button data-theme-choice="${t.id}" aria-pressed="false" title="${t.name}"><span class="pv-theme-swatch" style="background-color:${t.paper};${t.art?`background-image:url('${controller.assetURI}themes/${t.art}.png');`:''}color:${t.accent}"><i></i><i></i></span><span>${t.name}</span></button>`).join('')}</div>
       <div class="pv-background-row"><button data-action="importBackground" title="自动裁切 · 文字保护蒙版 · 仅存本机">导入图片</button><button data-field="customBackground" data-action="customBackground" aria-pressed="false" hidden>我的图片</button><button data-field="removeBackground" data-action="removeBackground" hidden>移除</button><span class="pv-theme-hint" data-field="themeHint" role="status"></span></div>
       <div class="pv-setting-row pv-transparency-row"><label for="pv-transparency">透明度</label><input id="pv-transparency" data-field="transparency" type="range" min="0" max="40" step="1" aria-label="窗口透明度"/><span data-field="transparencyLabel">12%</span></div>
       <div class="pv-setting-row"><label for="pv-language">界面语言</label><select id="pv-language" data-field="language" aria-label="Interface language / 界面语言"><option value="auto">跟随系统</option><option value="zh">简体中文</option><option value="en">English</option><option value="ja">日本語</option><option value="fr">Français</option><option value="de">Deutsch</option></select></div>
       <div class="pv-setting-row pv-companion-row"><label for="pv-companion">角色互动</label><button data-action="previewCompanion">预览</button><select data-field="companionInterval" aria-label="互动间隔" title="互动间隔">${[1,3,5,10,15,30].map(n=>`<option value="${n}">${n} 分钟</option>`).join('')}</select><input id="pv-companion" type="checkbox" data-field="companion"/></div>
     </div>
    </div>
<div class="pv-updater"><div class="pv-update-row"><label><input type="checkbox" data-field="autoUpdate"/>自动更新</label><span data-field="updateStatus" class="pv-update-status" role="status">通过 GitHub 获取插件更新</span><button data-action="checkUpdate">检查更新</button></div></div><div class="pv-about"><span data-field="aboutVersion">Junyan Kang</span><button data-action="help">指南</button><button data-action="feedback">反馈</button><button data-action="privacy">隐私</button></div>
   </div>
  </section><div class="pv-mini"><div class="pv-quick" data-field="quick" hidden><button class="pv-quick-mode" data-action="quickMode" aria-label="切换朗读模式">${icon("text-select")}<span data-field="quickModeLabel">划选</span></button><div class="pv-playback-tools" data-field="playbackTools"><button data-action="quickPause" aria-label="暂停或继续" aria-expanded="false">${icon('pause')}</button><div class="pv-nav-popover" data-field="navigation" hidden><div class="pv-nav-card" role="group" aria-label="阅读导航"><div class="pv-nav-row" data-field="sentenceNavigation"><span>句子</span><button data-action="quickSentencePrevious" aria-label="上一句" title="上一句">${icon('chevron-left')}</button><button data-action="quickSentenceReplay" aria-label="重读当前句" title="重读当前句">${icon('repeat')}</button><button data-action="quickSentenceNext" aria-label="下一句" title="下一句">${icon('chevron-right')}</button></div><div class="pv-nav-row" data-field="paragraphNavigation"><span>段落</span><button data-action="quickPrevious" aria-label="上一段" title="上一段">${icon('chevron-left')}</button><button data-action="quickReplay" aria-label="重读当前段" title="重读当前段">${icon('repeat')}</button><button data-action="quickNext" aria-label="下一段" title="下一段">${icon('chevron-right')}</button></div></div></div></div><button data-action="quickStop" aria-label="停止朗读">${icon('square')}</button><div class="pv-translation-tools" data-field="translationTools"><button data-action="quickTranslate" aria-label="切换跟读翻译" title="译文开关 · Option/Alt + T"><span class="pv-language-token" data-field="quickTranslateLabel" aria-hidden="true">简</span></button><div class="pv-audio-popover" data-field="audioPopover" hidden><button class="pv-audio-toggle" data-action="quickReadTranslation" role="switch" aria-checked="false">${icon("headphones")}<span>朗读译文</span><span class="pv-switch-track" aria-hidden="true"><i></i></span></button></div></div></div><button class="pv-orb" data-action="orb" aria-label="展开 Paper Voice 朗读面板" title="Paper Voice · 点击展开听读"><img class="pv-mascot" src="${controller.assetURI}mascot.png" alt="Paper Voice 书页精灵"/><img class="pv-mascot pv-mascot-reading" src="${controller.assetURI}mascot-reading.png" alt=""/><span class="pv-mascot-interaction" data-field="mascotInteraction" aria-hidden="true"></span><span class="pv-waves" aria-hidden="true"><i></i><i></i><i></i></span><span class="pv-dot"></span></button></div>`;
  const visible=(el,show)=>PaperVoiceUI.visibility(el,show);
  const find=name=>root.querySelector(`[data-field="${name}"]`),action=name=>root.querySelector(`[data-action="${name}"]`),panel=root.querySelector('.pv-panel');
  if(controller.version)find('aboutVersion').textContent='v'+controller.version+' · Junyan Kang';
  for(const v of PaperVoiceCore.voices){const o=doc.createElement('option');o.value=v.id;o.textContent=v.label;find('voice').append(o);}
  const settings=(open)=>{if(!open)find('llmKey').value='';find('home').hidden=open;find('settingsPage').hidden=!open;action('settings').querySelector('img').src=controller.assetURI+'icons/'+(open?'chevron-left':'settings')+'.svg';action('settings').setAttribute('aria-label',open?'返回播放控制':'声音与翻译设置');controller.localize?.(root);};
  action('settings').onclick=()=>{settings(find('settingsPage').hidden);controller.loadUpdateSettings();fit();};action('voiceSettings').onclick=()=>{settings(true);fit();};
  const fit=()=>{const right=parseFloat(root.style.right)||18,bottom=parseFloat(root.style.bottom)||18;panel.style.transform=`translate(${Math.max(0,right+panel.offsetWidth+8-doc.defaultView.innerWidth)}px,${Math.max(0,bottom+root.offsetHeight+8-doc.defaultView.innerHeight)}px)`;};
  action('orb').onclick=()=>{controller.showPanel(reader,true);fit();};action('close').onclick=()=>{find('llmKey').value='';visible(panel,false);};
  const selectSettingsTab=name=>{
   find('llmPage').hidden=true;find('llmKey').value='';find('llmResult').textContent=controller.t('密钥仅存本机 · 费用由服务商收取');
   for(const button of root.querySelectorAll('[data-settings-tab]')){const active=button.dataset.settingsTab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
   for(const pane of root.querySelectorAll('[data-settings-pane]'))pane.hidden=pane.dataset.settingsPane!==name;
  };
  for(const button of root.querySelectorAll('[data-settings-tab]')){
   button.onclick=()=>selectSettingsTab(button.dataset.settingsTab);
   button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const tabs=Array.from(root.querySelectorAll('[data-settings-tab]')),i=tabs.indexOf(button),next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];selectSettingsTab(next.dataset.settingsTab);next.focus();};
  }
  for(const b of root.querySelectorAll('[data-theme-choice]'))b.onclick=()=>controller.setTheme(b.dataset.themeChoice);
  action('importBackground').onclick=async()=>{action('importBackground').disabled=true;try{await controller.chooseThemeImage();find('themeHint').textContent=controller.t(controller.get('themeImageEnabled',false)?'背景已保存':'');}catch(e){find('themeHint').textContent=String(e.message||e);find('themeHint').title=String(e.message||e);}finally{action('importBackground').disabled=false;}};
  action('customBackground').onclick=()=>{controller.set('themeImageEnabled',true);controller.syncSettings();};
  action('removeBackground').onclick=async()=>{try{await controller.removeThemeImage();find('themeHint').textContent='';}catch(e){find('themeHint').textContent=String(e.message||e);}};
  find('companionInterval').onchange=e=>controller.setCompanionInterval(e.target.value);
  find('companion').onchange=e=>{controller.set('companionInteractions',e.target.checked);if(!e.target.checked)finishInteraction();};
  find('language').onchange=e=>{controller.setLanguage(e.target.value);fit();};
  find('speechLanguage').onchange=e=>{controller.setSpeechLanguage(e.target.value);fit();};
  find('captionFont').onchange=e=>controller.setCaptionStyle('captionFont',e.target.value);find('captionSize').onchange=e=>controller.setCaptionStyle('captionSize',e.target.value);
  find('transparency').oninput=e=>controller.setSurfaceTransparency(e.target.value);
  find('readTranslation').onchange=e=>controller.setReadTranslation(e.target.checked);
  find('selectionTranslation').onchange=e=>{controller.set('selectionTranslation',e.target.checked);controller.syncSettings();};
  find('translation').onchange=e=>controller.toggleTranslation(e.target.checked);
  action('quickTranslate').onclick=e=>controller.quickTranslationClick(e);
  action('quickTranslate').ondblclick=e=>{e.preventDefault();controller.quickTranslationDoubleClick();};
  find('target').onchange=e=>controller.setTranslationTarget(e.target.value);
  find('provider').onchange=e=>{if(e.target.value==='llm'){openLLM();return;}controller.set('translationProvider',e.target.value);if(e.target.value==='tencenttransmart'&&controller.get('translationTarget','zh-Hans')==='zh-Hant')controller.set('translationTarget','zh-Hans');controller.translationTicket++;controller.hideTranslation();controller.syncSettings();if(controller.get('translation',false))controller.toggleTranslation(true);};
  const loadLLM=id=>{
   const config=controller.llmConfig(id);find('llmProvider').value=config.id;find('llmEndpoint').value=config.endpoint;find('llmModel').value=config.model;find('llmKey').value='';
   let saved=false;try{saved=!!config.endpoint&&!!controller.llmKey(config);}catch(_){}
   find('llmKey').placeholder=controller.t(saved?'已保存 · 留空保留':'API Key');action('llmRemoveKey').disabled=!saved;PaperVoiceUI.syncSelects(root);
  };
  const openLLM=()=>{selectSettingsTab('translation');root.querySelector('[data-settings-pane=translation]').hidden=true;find('llmPage').hidden=false;loadLLM(controller.get('llmProvider','minimax'));};
  const draftLLM=()=>({...controller.llmConfig(find('llmProvider').value),endpoint:find('llmEndpoint').value.trim(),model:find('llmModel').value.trim()});
  const saveLLM=async test=>{
   action('llmSave').disabled=action('llmTest').disabled=true;find('llmResult').dataset.state='loading';find('llmResult').textContent=controller.t(test?'正在测试…':'正在保存…');
   try{
    await controller.saveLLM(draftLLM(),find('llmKey').value);find('llmKey').value='';find('llmKey').placeholder=controller.t('已保存 · 留空保留');action('llmRemoveKey').disabled=false;
    if(test){const result=await controller.translate('Light is converted into neural signals in the retina.','en',{provider:'llm',target:'zh-Hans',noCache:true});find('llmResult').textContent=controller.t('连接成功')+' · '+(result.totalMs/1000).toFixed(2)+' s';find('llmResult').title=result.text;}
    else find('llmResult').textContent=controller.t('已保存');
    find('llmResult').dataset.state='ready';
   }catch(error){find('llmResult').textContent=controller.t(error.message);find('llmResult').title=controller.t(error.message);find('llmResult').dataset.state='error';}
   finally{action('llmSave').disabled=action('llmTest').disabled=false;}
  };
  action('configureLLM').onclick=openLLM;action('llmBack').onclick=()=>{selectSettingsTab('translation');controller.syncSettings();};
  find('llmProvider').onchange=e=>{loadLLM(e.target.value);find('llmResult').textContent=controller.t('密钥仅存本机 · 费用由服务商收取');};
  action('llmSave').onclick=()=>saveLLM(false);action('llmTest').onclick=()=>saveLLM(true);
  action('llmRemoveKey').onclick=()=>{try{controller.removeLLMKey(controller.validateLLM(draftLLM()));loadLLM(find('llmProvider').value);find('llmResult').textContent=controller.t('密钥已移除');}catch(error){find('llmResult').textContent=controller.t(error.message);}};
  action('llmHelp').onclick=e=>{e.preventDefault();Zotero.launchURL('https://github.com/JunyanKang/paper-voice/blob/main/docs/'+(controller.language()==='zh'?'GUIDE.md':'GUIDE.en.md')+'#'+(controller.language()==='zh'?'大模型翻译':'llm-translation'));};
  find('voice').onchange=e=>{controller.set('voiceFor_'+controller.settingsVoiceLanguage(),e.target.value);if(!controller.get('readTranslation',false))controller.set('voice',e.target.value);controller.syncSettings();controller.setStatus('声音已保存，下次开始朗读生效');};
  find('rate').oninput=e=>{controller.set('rate',PaperVoiceCore.rate(e.target.value));controller.syncSettings();};
  find('rate').onchange=()=>{controller.setStatus('语速已更新，下次开始朗读生效');};
  find('repeat').onchange=e=>{controller.set(controller.get('mode','selection')==='selection'?'selectionRepeat':'repeat',Number(e.target.value));controller.syncSettings();};
  find('documentStart').onchange=e=>{controller.set('documentStart',e.target.value);controller.syncSettings();};
  find('auto').onchange=e=>{controller.set('auto',e.target.checked);controller.clearSelectionTimers();if(!e.target.checked&&controller.playbackMode!=='document')controller.stop();controller.syncSettings();};
  for(const button of root.querySelectorAll('[data-mode]'))button.onclick=()=>controller.setMode(button.dataset.mode);
  for(const [name,delta] of [['Previous',-1],['Replay',0],['Next',1]]){
   action('quick'+name).onclick=()=>controller.navigateScope(delta,reader,'paragraph');
   action('quickSentence'+name).onclick=()=>controller.navigateScope(delta,reader,'sentence');
  }
  const tools=find('playbackTools'),navigation=find('navigation');let closeTimer=null,hovering=false;
  const closeNavigation=()=>{doc.defaultView.clearTimeout(closeTimer);visible(navigation,false);action('quickPause').setAttribute('aria-expanded','false');};
  const openNavigation=()=>{
   doc.defaultView.clearTimeout(closeTimer);
   if(controller.get('mode','selection')==='selection'||!controller.currentUnit||!['playing','paused','loading'].includes(controller.state))return;
   closeAudioPopover();visible(navigation,true);action('quickPause').setAttribute('aria-expanded','true');
   navigation.style.left='0px';navigation.dataset.side='above';
   const anchor=tools.getBoundingClientRect(),bar=find('quick').getBoundingClientRect(),win=doc.defaultView;
   navigation.style.width=bar.width+'px';navigation.style.left=(Math.max(8,Math.min(bar.left,win.innerWidth-bar.width-8))-anchor.left)+'px';
   const box=navigation.getBoundingClientRect();
   if(box.top<8)navigation.dataset.side='below';
  };
  const leaveNavigation=()=>{doc.defaultView.clearTimeout(closeTimer);closeTimer=doc.defaultView.setTimeout(()=>{if(!hovering&&!(tools.contains(doc.activeElement)&&doc.activeElement.matches(':focus-visible')))closeNavigation();},300);};
  tools.addEventListener('pointerenter',()=>{hovering=true;openNavigation();});tools.addEventListener('pointerleave',()=>{hovering=false;leaveNavigation();});
  tools.addEventListener('focusin',openNavigation);tools.addEventListener('focusout',e=>{if(!tools.contains(e.relatedTarget))leaveNavigation();});
  tools.addEventListener('keydown',e=>{
   if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();e.stopPropagation();openNavigation();
    const buttons=Array.from(navigation.querySelectorAll('button')).filter(b=>!b.disabled&&!b.parentElement.hidden);
    const at=buttons.indexOf(doc.activeElement),step=e.key==='ArrowDown'?1:-1;
    buttons[(at<0?0:(at+step+buttons.length)%buttons.length)]?.focus();
   }
  });
  const translationTools=find('translationTools'),audioPopover=find('audioPopover');let audioCloseTimer=null;
  const closeAudioPopover=()=>{doc.defaultView.clearTimeout(audioCloseTimer);visible(audioPopover,false);action('quickTranslate').setAttribute('aria-expanded','false');};
  const openAudioPopover=()=>{
   doc.defaultView.clearTimeout(audioCloseTimer);closeNavigation();visible(audioPopover,true);
   action('quickTranslate').setAttribute('aria-expanded','true');
   audioPopover.style.left='auto';audioPopover.style.right='0px';audioPopover.dataset.side='above';
   const box=audioPopover.getBoundingClientRect();
   if(box.left<8)audioPopover.style.right=(box.left-8)+'px';
   if(box.top<8)audioPopover.dataset.side='below';
  };
  const leaveAudioPopover=()=>{doc.defaultView.clearTimeout(audioCloseTimer);audioCloseTimer=doc.defaultView.setTimeout(()=>{if(!translationTools.matches(':hover,:focus-within'))closeAudioPopover();},180);};
  translationTools.addEventListener('pointerenter',openAudioPopover);translationTools.addEventListener('pointerleave',leaveAudioPopover);
  translationTools.addEventListener('focusin',openAudioPopover);translationTools.addEventListener('focusout',e=>{if(!translationTools.contains(e.relatedTarget))leaveAudioPopover();});
  action('quickReadTranslation').onclick=()=>controller.setReadTranslation(!controller.get('readTranslation',false));
  root.addEventListener('pointerdown',e=>{if(!tools.contains(e.target))closeNavigation();if(!translationTools.contains(e.target))closeAudioPopover();});
  action('quickMode').onclick=()=>controller.cycleMode();
  action('checkUpdate').onclick=()=>controller.updateState==='available'?controller.installUpdate():controller.checkForUpdates();
  find('autoUpdate').onchange=e=>controller.setAutoUpdate(e.target.checked);
  action('primary').onclick=()=>controller.primary(reader);action('previous').onclick=()=>controller.stepSentence(-1,reader);action('next').onclick=()=>controller.stepSentence(1,reader);
  action('stop').onclick=action('quickStop').onclick=()=>controller.stop();action('quickPause').onclick=()=>controller.primary(reader);
  for(const [name,path] of Object.entries({help:'/blob/main/docs/GUIDE.md',feedback:'/issues',privacy:'/blob/main/PRIVACY.md'}))action(name).onclick=()=>Zotero.launchURL('https://github.com/JunyanKang/paper-voice'+(name==='help'&&controller.language?.()!=='zh'?'/blob/main/docs/GUIDE.en.md':path));
  action('sample').onclick=()=>controller.speak(PaperVoiceCore.speechLanguages.find(x=>x.id===controller.settingsVoiceLanguage()).sample,reader,true);
  let drag=null,moved=false;
  action('orb').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,right:parseFloat(root.style.right)||18,bottom:parseFloat(root.style.bottom)||18};moved=false;action('orb').setPointerCapture(e.pointerId);});
  action('orb').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(moved){closeNavigation();root.style.right=Math.max(8,Math.min(doc.defaultView.innerWidth-root.querySelector('.pv-mini').offsetWidth-8,drag.right-dx))+'px';root.style.bottom=Math.max(8,Math.min(doc.defaultView.innerHeight-70,drag.bottom-dy))+'px';}});
  action('orb').addEventListener('pointerup',()=>{drag=null;});
  action('orb').addEventListener('click',e=>{if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;}},true);
  let nextInteraction=Date.now()+controller.companionIntervalMs(),readingSince=null,readingElapsed=0,lastBreakAt=0;
  const gestureQueues={ready:[],reading:[]},lastGestures={ready:null,reading:null},sprite=find('mascotInteraction');
  const player=PaperVoiceCompanion.player(sprite,controller.assetURI,()=>{root.dataset.resting='true';});
  const finishInteraction=()=>{player.finish();if(root.hasAttribute('data-interaction')){root.dataset.resting='true';if(!sprite.style.backgroundImage)root.removeAttribute('data-interaction');}};
  const companionState=()=>['playing','paused'].includes(controller.state)?'reading':'ready';
  const syncCompanionPose=()=>{
   const now=Date.now();if(controller.state==='playing'){if(readingSince===null)readingSince=now;}else{if(readingSince!==null)readingElapsed+=now-readingSince;readingSince=null;if(!['paused','loading'].includes(controller.state)){readingElapsed=0;lastBreakAt=0;}}
   const state=companionState();if(root.dataset.interactionSet===state)return;finishInteraction();if(lastGestures[state]){root.dataset.interactionSet=state;root.dataset.interaction=lastGestures[state];root.dataset.resting='true';player.still(lastGestures[state]);}else{root.removeAttribute('data-interaction');root.removeAttribute('data-interaction-set');root.removeAttribute('data-resting');}
  };
  const resetCompanionSchedule=()=>{nextInteraction=Date.now()+controller.companionIntervalMs();};
  const playCompanion=forced=>{
   finishInteraction();
   if(doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const state=companionState();
   if(!gestureQueues[state].length){
    gestureQueues[state]=PaperVoiceCompanion.shuffled(PaperVoiceCompanion.sets[state],lastGestures[state]);
   }
   const index=forced||gestureQueues[state].shift();lastGestures[state]=index;
   root.dataset.interactionSet=state;root.dataset.interaction=index;root.removeAttribute('data-resting');player.play(index);
  };
  action('orb').addEventListener('pointerenter',()=>{if(!controller.get('companionInteractions',true))return;resetCompanionSchedule();playCompanion();});
  action('orb').addEventListener('pointerdown',finishInteraction);
  action('previewCompanion').onclick=()=>{nextInteraction=Date.now()+controller.companionIntervalMs();playCompanion();};
  action('previewCompanion').disabled=doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(action('previewCompanion').disabled)action('previewCompanion').title=controller.t('系统已开启减少动态效果');
  const tickCompanion=(now=Date.now())=>{
   if(!controller.get('companionInteractions',true)){nextInteraction=now+controller.companionIntervalMs();return;}
   if(now<nextInteraction)return;
   if(doc.hidden||!root.isConnected||root.matches(':hover,:focus-within'))return;
   const activeReader=Zotero.Reader.getByTabID(Zotero.getMainWindow().Zotero_Tabs?.selectedID);
   if(activeReader!==reader&&!reader._window?.document?.hasFocus())return;
   const elapsed=readingElapsed+(readingSince===null?0:now-readingSince),takeBreak=controller.state==='playing'&&elapsed-lastBreakAt>=PaperVoiceCompanion.breakInterval;
   if(takeBreak)lastBreakAt=elapsed;
   nextInteraction=now+controller.companionIntervalMs();playCompanion(takeBreak?'rest':undefined);
  };
  const dispose=()=>{root._pvSelects?.dispose();root._pvTooltips?.dispose();doc.defaultView.clearTimeout(closeTimer);doc.defaultView.clearTimeout(audioCloseTimer);player.dispose();for(const el of [panel,navigation,audioPopover])el._pvFade?.cancel();root.remove();};
  doc.body.append(root);this.installSelects(root,controller);root._pvTooltips=this.installTooltips(root,controller);return {root,panel,find,action,closeNavigation,closeAudioPopover,tickCompanion,finishInteraction,syncCompanionPose,resetCompanionSchedule,dispose};
 }
};
