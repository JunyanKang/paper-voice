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
 create(controller, reader) {
  const doc=reader._iframeWindow.document,root=doc.createElement('div');
  root.style.setProperty('--pv-ready-atlas',`url("${controller.assetURI}mascot-ready-atlas.png")`);root.style.setProperty('--pv-reading-atlas',`url("${controller.assetURI}mascot-reading-atlas.png")`);
  root.style.setProperty('--pv-ready-delight',`url("${controller.assetURI}mascot-ready-delight.png")`);root.style.setProperty('--pv-reading-encourage',`url("${controller.assetURI}mascot-reading-encourage.png")`);
  const gestureImages=['mascot-ready-atlas.png','mascot-reading-atlas.png','mascot-ready-delight.png','mascot-reading-encourage.png'].map(name=>{const image=new doc.defaultView.Image();image.src=controller.assetURI+name;return image;});
  root.className='pv-shell';root.dataset.paperVoice='shell';root.dataset.state='idle';
  const icon=name=>`<img class="pv-icon" src="${controller.assetURI}icons/${name}.svg" alt=""/>`;
  root.innerHTML=`<style>${controller.cssText}</style><section class="pv-panel" data-paper-voice="panel" aria-label="Paper Voice 朗读控制" hidden>
   <header class="pv-header"><img class="pv-brand-icon" src="${controller.assetURI}mascot.png" alt=""/><div class="pv-brand">Paper Voice<span>论文听读</span></div><button class="pv-icon-button" data-action="settings" aria-label="声音与翻译设置">${icon('settings')}</button><button class="pv-icon-button" data-action="close" aria-label="收起朗读面板">${icon('x')}</button></header>
   <div data-field="home">
    <div class="pv-mode-options" role="group" aria-label="朗读模式">${PaperVoiceCore.modes.map(mode=>`<button data-mode="${mode.id}" aria-label="${mode.label}" title="${mode.label}" aria-pressed="false">${icon(mode.icon)}<span>${mode.short}</span></button>`).join('')}</div>
    <div class="pv-mode-note" data-field="modeNote"></div>
    <div class="pv-context-row" data-field="repeatRow" hidden><span>循环</span><select data-field="repeat" aria-label="循环次数"><option value="1">1 次</option><option value="0">持续循环</option><option value="2">2 次</option><option value="3">3 次</option><option value="5">5 次</option></select></div>
    <div class="pv-context-row" data-field="documentRow" hidden><span>起点</span><select data-field="documentStart" aria-label="全文朗读起点"><option value="begin">从第 1 页</option><option value="current">从当前页</option><option value="resume">从上次进度</option><option value="selection">从选定位置（句首）</option></select></div>
    <div class="pv-preview" data-field="preview">选择一段文字，留一点时间给耳朵。</div>
    <div class="pv-progress-track"><div data-field="progressBar"></div></div><div class="pv-status" data-field="status" role="status" aria-live="polite"></div>
    <div class="pv-transport"><button class="pv-icon-button" data-action="previous" aria-label="上一句" title="上一句">${icon('chevron-left')}</button><button class="pv-primary" data-action="primary">${icon('play')}<span data-field="primaryLabel">开始朗读</span></button><button class="pv-icon-button" data-action="next" aria-label="下一句" title="下一句">${icon('chevron-right')}</button><button class="pv-icon-button pv-stop" data-action="stop" aria-label="停止朗读" title="停止 · Esc">${icon('square')}</button></div>
    <footer class="pv-footer"><button data-action="voiceSettings" data-field="voiceSummary">美音 · Heart</button><span>免费离线朗读</span></footer>
   </div>
   <div data-field="settingsPage" hidden>
    <div class="pv-settings-tabs" role="tablist" aria-label="设置分类"><button id="pv-tab-voice" data-settings-tab="voice" role="tab" aria-controls="pv-settings-voice" aria-selected="true">声音</button><button id="pv-tab-translation" data-settings-tab="translation" role="tab" aria-controls="pv-settings-translation" aria-selected="false" tabindex="-1">译文</button><button id="pv-tab-appearance" data-settings-tab="appearance" role="tab" aria-controls="pv-settings-appearance" aria-selected="false" tabindex="-1">外观</button></div>
    <div class="pv-settings-content">
     <div id="pv-settings-voice" data-settings-pane="voice" role="tabpanel" aria-labelledby="pv-tab-voice">
    <div class="pv-setting-row"><label for="pv-speech-language">朗读语言</label><select id="pv-speech-language" data-field="speechLanguage" aria-label="朗读语言"><option value="auto">自动识别 PDF 语言</option>${PaperVoiceCore.speechLanguages.map(x=>`<option value="${x.id}">${x.label}</option>`).join('')}</select></div>
    <div class="pv-setting-row"><label for="pv-voice">声音</label><select id="pv-voice" data-field="voice" aria-label="朗读声音"></select></div>
    <div class="pv-setting-row"><label for="pv-rate">语速</label><span data-field="rateLabel"></span></div><input id="pv-rate" class="pv-range" aria-label="朗读语速" data-field="rate" type="range" min="0.6" max="1.6" step="0.05"/>
    <label class="pv-setting-row" data-field="autoRow"><span>划选后自动朗读</span><input type="checkbox" data-field="auto"/></label>
    <button class="pv-sample" data-action="sample">${icon('headphones')}试听当前声音</button>
     </div>
     <div id="pv-settings-translation" data-settings-pane="translation" role="tabpanel" aria-labelledby="pv-tab-translation" hidden>
    <label class="pv-setting-row pv-translation-row"><span>跟读译文</span><input type="checkbox" data-field="translation"/></label>
    <label class="pv-setting-row" data-field="readTranslationRow"><span>朗读译文</span><input type="checkbox" data-field="readTranslation"/></label>
    <div class="pv-setting-row"><label for="pv-provider">翻译服务</label><select id="pv-provider" data-field="provider" aria-label="免费翻译服务"><option value="tencenttransmart">腾讯 · 大陆优先</option><option value="bing">微软 · 免费</option><option value="google">Google · 海外</option></select></div>
    <div class="pv-setting-row"><label for="pv-target">译文语言</label><select id="pv-target" data-field="target" aria-label="译文语言"><option value="zh-Hans">简体中文</option><option value="zh-Hant">繁體中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="fr">Français</option><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option><option value="ru">Русский</option></select></div>
    <div class="pv-setting-row pv-caption-style-row"><label for="pv-caption-font">译文字体</label><select id="pv-caption-font" data-field="captionFont" aria-label="译文字体"><option value="system">系统字体</option><option value="sans">无衬线</option><option value="serif">衬线</option></select><select data-field="captionSize" aria-label="译文字号">${[10,11,12,13,14,15,16,18,20].map(n=>`<option value="${n}">${n} px</option>`).join('')}</select></div>
     </div>
     <div id="pv-settings-appearance" data-settings-pane="appearance" role="tabpanel" aria-labelledby="pv-tab-appearance" hidden>
       <div class="pv-theme-choices" role="group" aria-label="窗口主题">${controller.themes.map(t=>`<button data-theme-choice="${t.id}" aria-pressed="false" title="${t.name}"><span class="pv-theme-swatch" style="background-color:${t.paper};${t.art?`background-image:url('${controller.assetURI}themes/${t.art}.png');`:''}color:${t.accent}"><i></i><i></i></span><span>${t.name}</span></button>`).join('')}</div>
       <div class="pv-background-row"><button data-action="importBackground" title="自动裁切 · 文字保护蒙版 · 仅存本机">导入图片</button><button data-field="customBackground" data-action="customBackground" aria-pressed="false" hidden>我的图片</button><button data-field="removeBackground" data-action="removeBackground" hidden>移除</button><span class="pv-theme-hint" data-field="themeHint" role="status"></span></div>
       <div class="pv-setting-row pv-transparency-row"><label for="pv-transparency">透明度</label><input id="pv-transparency" data-field="transparency" type="range" min="0" max="40" step="1" aria-label="窗口透明度"/><span data-field="transparencyLabel">12%</span></div>
       <div class="pv-setting-row"><label for="pv-language">界面语言</label><select id="pv-language" data-field="language" aria-label="Interface language / 界面语言"><option value="auto">跟随系统</option><option value="zh">简体中文</option><option value="en">English</option></select></div>
       <div class="pv-setting-row pv-companion-row"><label for="pv-companion">角色互动</label><button data-action="previewCompanion">预览</button><select data-field="companionInterval" aria-label="互动间隔" title="互动间隔">${[1,3,5,10,15,30].map(n=>`<option value="${n}">${n} 分钟</option>`).join('')}</select><input id="pv-companion" type="checkbox" data-field="companion"/></div>
     </div>
    </div>
<div class="pv-updater"><div class="pv-update-row"><label><input type="checkbox" data-field="autoUpdate"/>自动更新</label><span data-field="updateStatus" class="pv-update-status" role="status">通过 GitHub 获取插件更新</span><button data-action="checkUpdate">检查更新</button></div></div><div class="pv-about"><span data-field="aboutVersion">Junyan Kang</span><button data-action="help">指南</button><button data-action="feedback">反馈</button><button data-action="privacy">隐私</button></div>
   </div>
  </section><div class="pv-mini"><div class="pv-quick" data-field="quick" hidden><div class="pv-mode-tools" data-field="modeTools"><button class="pv-quick-mode" data-action="quickMode" aria-label="切换朗读模式" aria-expanded="false">${icon("text-select")}<span data-field="quickModeLabel">划选</span><img class="pv-nav-caret" src="${controller.assetURI}icons/chevron-down.svg" alt=""/></button><div class="pv-nav-popover" data-field="navigation" hidden><div class="pv-nav-card" role="group" aria-label="阅读导航"><div class="pv-nav-row" data-field="sentenceNavigation"><span>句子</span><button data-action="quickSentencePrevious" aria-label="上一句" title="上一句">${icon('chevron-left')}</button><button data-action="quickSentenceReplay" aria-label="重读当前句" title="重读当前句">${icon('repeat')}</button><button data-action="quickSentenceNext" aria-label="下一句" title="下一句">${icon('chevron-right')}</button></div><div class="pv-nav-row" data-field="paragraphNavigation"><span>段落</span><button data-action="quickPrevious" aria-label="上一段" title="上一段">${icon('chevron-left')}</button><button data-action="quickReplay" aria-label="重读当前段" title="重读当前段">${icon('repeat')}</button><button data-action="quickNext" aria-label="下一段" title="下一段">${icon('chevron-right')}</button></div></div></div></div><button data-action="quickPause" aria-label="暂停或继续">${icon('pause')}</button><button data-action="quickStop" aria-label="停止朗读">${icon('square')}</button><div class="pv-translation-tools" data-field="translationTools"><button data-action="quickTranslate" aria-label="切换跟读翻译" title="译文开关 · Option/Alt + T"><span class="pv-language-token" data-field="quickTranslateLabel" aria-hidden="true">简</span></button><div class="pv-audio-popover" data-field="audioPopover" hidden><button class="pv-audio-toggle" data-action="quickReadTranslation" role="switch" aria-checked="false">${icon("headphones")}<span>朗读译文</span><span class="pv-switch-track" aria-hidden="true"><i></i></span></button></div></div></div><button class="pv-orb" data-action="orb" aria-label="展开 Paper Voice 朗读面板" title="Paper Voice · 点击展开听读"><img class="pv-mascot" src="${controller.assetURI}mascot.png" alt="Paper Voice 书页精灵"/><img class="pv-mascot pv-mascot-reading" src="${controller.assetURI}mascot-reading.png" alt=""/><span class="pv-mascot-interaction" data-field="mascotInteraction" aria-hidden="true"></span><span class="pv-waves" aria-hidden="true"><i></i><i></i><i></i></span><span class="pv-dot"></span></button></div>`;
  const visible=(el,show)=>PaperVoiceUI.visibility(el,show);
  const find=name=>root.querySelector(`[data-field="${name}"]`),action=name=>root.querySelector(`[data-action="${name}"]`),panel=root.querySelector('.pv-panel');
  if(controller.version)find('aboutVersion').textContent='v'+controller.version+' · Junyan Kang';
  for(const v of PaperVoiceCore.voices){const o=doc.createElement('option');o.value=v.id;o.textContent=v.label;find('voice').append(o);}
  const settings=(open)=>{find('home').hidden=open;find('settingsPage').hidden=!open;action('settings').querySelector('img').src=controller.assetURI+'icons/'+(open?'chevron-left':'settings')+'.svg';action('settings').setAttribute('aria-label',open?'返回播放控制':'声音与翻译设置');controller.localize?.(root);};
  action('settings').onclick=()=>{settings(find('settingsPage').hidden);controller.loadUpdateSettings();fit();};action('voiceSettings').onclick=()=>{settings(true);fit();};
  const fit=()=>{const right=parseFloat(root.style.right)||18,bottom=parseFloat(root.style.bottom)||18;panel.style.transform=`translate(${Math.max(0,right+panel.offsetWidth+8-doc.defaultView.innerWidth)}px,${Math.max(0,bottom+root.offsetHeight+8-doc.defaultView.innerHeight)}px)`;};
  action('orb').onclick=()=>{controller.showPanel(reader,true);fit();};action('close').onclick=()=>{visible(panel,false);};
  const selectSettingsTab=name=>{
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
  find('translation').onchange=e=>controller.toggleTranslation(e.target.checked);
  action('quickTranslate').onclick=e=>controller.quickTranslationClick(e);
  action('quickTranslate').ondblclick=e=>{e.preventDefault();controller.quickTranslationDoubleClick();};
  find('target').onchange=e=>controller.setTranslationTarget(e.target.value);
  find('provider').onchange=e=>{controller.set('translationProvider',e.target.value);if(e.target.value==='tencenttransmart'&&controller.get('translationTarget','zh-Hans')==='zh-Hant')controller.set('translationTarget','zh-Hans');controller.translationTicket++;controller.hideTranslation();controller.syncSettings();if(controller.get('translation',false))controller.toggleTranslation(true);};
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
  const tools=find('modeTools'),navigation=find('navigation');let closeTimer=null,hovering=false;
  const closeNavigation=()=>{doc.defaultView.clearTimeout(closeTimer);visible(navigation,false);action('quickMode').setAttribute('aria-expanded','false');};
  const openNavigation=()=>{
   doc.defaultView.clearTimeout(closeTimer);
   if(controller.get('mode','selection')==='selection'||!controller.currentUnit||!['playing','paused','loading'].includes(controller.state))return;
   closeAudioPopover();visible(navigation,true);action('quickMode').setAttribute('aria-expanded','true');
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
  for(const [name,path] of Object.entries({help:'/blob/main/README.md#使用指南',feedback:'/issues',privacy:'/blob/main/PRIVACY.md'}))action(name).onclick=()=>Zotero.launchURL('https://github.com/JunyanKang/paper-voice'+(name==='help'&&controller.language?.()==='en'?'/blob/main/README.en.md#user-guide':path));
  action('sample').onclick=()=>controller.speak(PaperVoiceCore.speechLanguages.find(x=>x.id===controller.settingsVoiceLanguage()).sample,reader,true);
  let drag=null,moved=false;
  action('orb').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,right:parseFloat(root.style.right)||18,bottom:parseFloat(root.style.bottom)||18};moved=false;action('orb').setPointerCapture(e.pointerId);});
  action('orb').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(moved){closeNavigation();root.style.right=Math.max(8,Math.min(doc.defaultView.innerWidth-root.querySelector('.pv-mini').offsetWidth-8,drag.right-dx))+'px';root.style.bottom=Math.max(8,Math.min(doc.defaultView.innerHeight-70,drag.bottom-dy))+'px';}});
  action('orb').addEventListener('pointerup',()=>{drag=null;});
  action('orb').addEventListener('click',e=>{if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;}},true);
  let nextInteraction=Date.now()+controller.companionIntervalMs(),interactionTimer=null;const gestureQueues={ready:[],reading:[]},lastGestures={ready:-1,reading:-1};
  const finishInteraction=()=>{doc.defaultView.clearTimeout(interactionTimer);if(root.hasAttribute('data-interaction'))root.dataset.resting='true';};
  const companionState=()=>['playing','paused'].includes(controller.state)?'reading':'ready';
  const syncCompanionPose=()=>{const state=companionState();if(root.dataset.interactionSet===state)return;finishInteraction();if(lastGestures[state]>=0){root.dataset.interactionSet=state;root.dataset.interaction=String(lastGestures[state]);root.dataset.resting='true';}else{root.removeAttribute('data-interaction');root.removeAttribute('data-interaction-set');root.removeAttribute('data-resting');}};
  const resetCompanionSchedule=()=>{nextInteraction=Date.now()+controller.companionIntervalMs();};
  const playCompanion=()=>{
   finishInteraction();
   if(doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const state=companionState();
   if(!gestureQueues[state].length){
    const queue=[0,1,2,3,4];for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
    if(queue[0]===lastGestures[state])[queue[0],queue[1]]=[queue[1],queue[0]];
    gestureQueues[state]=queue;
   }
   const index=gestureQueues[state].shift();lastGestures[state]=index;
   root.dataset.interactionSet=state;root.dataset.interaction=String(index);void find('mascotInteraction').offsetWidth;root.removeAttribute('data-resting');
   interactionTimer=doc.defaultView.setTimeout(finishInteraction,3000);
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
   nextInteraction=now+controller.companionIntervalMs();playCompanion();
  };
  const dispose=()=>{doc.defaultView.clearTimeout(closeTimer);doc.defaultView.clearTimeout(audioCloseTimer);finishInteraction();for(const el of [panel,navigation,audioPopover])el._pvFade?.cancel();root.remove();};
  doc.body.append(root);return {root,panel,find,action,closeNavigation,closeAudioPopover,tickCompanion,finishInteraction,syncCompanionPose,resetCompanionSchedule,dispose};
 }
};
