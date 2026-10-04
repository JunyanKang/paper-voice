/* Selection translation and reading share a compact card inside Zotero's popup. */
var PaperVoiceSelectionUI = {
 create(controller,doc,button) {
  const card=doc.createElement('section');card.className='pv-selection-card';card.dataset.paperVoice='selection-card';
  const style=doc.createElement('style');style.textContent=`
   /* Zotero owns transform for anchoring; entry animation must never override it. */
   .selection-popup:has(.pv-selection-card):not([class*="page-popup-"]){visibility:hidden}
   .selection-popup[data-pv-selection]{color:var(--pv-ink);background:var(--pv-glass);border:0;outline:1px solid var(--pv-glass-line);outline-offset:-1px;border-radius:15px;box-shadow:var(--pv-small-shadow),inset 0 1px 0 var(--pv-rim-light);backdrop-filter:blur(18px);animation:pv-selection-enter .16s ease-out}
   .selection-popup[data-pv-selection]>.tool-toggle{background:var(--pv-soft)}
   .selection-popup[data-pv-selection]>.tool-toggle>button{color:var(--pv-muted)}
   .selection-popup[data-pv-selection]>.tool-toggle>button.active{background:var(--pv-paper);color:var(--pv-accent)}
   .selection-popup[data-pv-selection] .custom-sections>.section:has(.pv-selection-card){border-top:0;padding:0;margin:0}
   /* Hide only the duplicate source field from Translate for Zotero in this card. */
   .selection-popup[data-pv-selection-translation=true] .zoteropdftranslate-popup-textarea[id$="-text"]{display:none!important}
   .selection-popup[data-pv-selection-translation=true] .custom-sections>.section:has(.zoteropdftranslate-popup-textarea[id$="-text"]){border-top:0;padding:0;margin:0}
   .pv-selection-card{box-sizing:border-box;width:280px;max-width:calc(100vw - 64px);padding:5px 9px 7px;color:var(--pv-ink);background:color-mix(in srgb,var(--pv-paper) 88%,transparent);border-radius:12px;font:12px/1.45 system-ui,sans-serif;text-align:start}
   .pv-selection-card *{box-sizing:border-box}.pv-selection-card [hidden]{display:none!important}
   .pv-selection-heading{display:flex;align-items:center;gap:5px;height:22px;margin:0 0 3px;color:var(--pv-muted);font-size:10px;font-weight:500;letter-spacing:0}
   .pv-selection-symbol{width:15px;height:15px;flex:none;background:var(--pv-accent);mask:var(--pv-selection-translate-icon) center/contain no-repeat}
   .pv-selection-card[data-translation-state=loading] .pv-selection-symbol{animation:pv-selection-breathe 1.3s ease-in-out infinite}
   .pv-selection-heading>span:nth-child(2){flex:1}
   .pv-selection-scopes{display:flex;gap:1px;padding:2px;border-radius:8px;background:color-mix(in srgb,var(--pv-ink) 5%,transparent)}
   .pv-selection-scopes button{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--pv-muted);padding:2px 4px;font:500 10px/14px system-ui,sans-serif;cursor:pointer;transition:background .18s ease,color .18s ease,box-shadow .18s ease}
   .pv-selection-scopes button:hover{color:var(--pv-ink)}.pv-selection-scopes button[aria-pressed=true]{color:var(--pv-accent);background:var(--pv-paper);box-shadow:0 1px 3px #172c3d12}
   .pv-selection-card[data-translation-state=streaming] .pv-selection-symbol{animation:pv-selection-breathe 1.3s ease-in-out infinite}
   .pv-selection-translation{font-size:12px;line-height:1.45;font-weight:400;overflow-wrap:anywhere;white-space:pre-wrap;max-height:min(190px,35vh);overflow-y:auto;scrollbar-width:none;transition:opacity .15s ease}
   .pv-selection-card[data-translation-state=loading] .pv-selection-translation,.pv-selection-card[data-translation-state=error] .pv-selection-translation{color:var(--pv-muted);text-align:center}
   .pv-selection-translation:focus-visible,.pv-selection-card button:focus-visible{outline:none;background:var(--pv-soft)}
   .pv-selection-retry{border:0;background:none;color:var(--pv-accent);font:500 11px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:5px 0;cursor:pointer}
   .pv-selection-card .pv-selection-read{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:5px;padding:5px 9px;min-height:28px;border:0;border-radius:9px;background:var(--pv-soft);color:var(--pv-accent);font:500 11px/1.45 system-ui,sans-serif;cursor:pointer;transition:background .15s ease,transform .15s ease}
   .pv-selection-read::before{content:"";width:15px;height:15px;flex:none;background:currentColor;mask:var(--pv-selection-play-icon) center/contain no-repeat}
   .pv-selection-read:hover:not(:disabled){background:var(--pv-accent);color:var(--pv-primary-ink);transform:none}
   .pv-selection-read:disabled{cursor:default;opacity:.85}.pv-selection-read[data-state=loading]::before,.pv-selection-read[data-state=error]::before{mask-image:var(--pv-selection-retry-icon)}
   .pv-selection-read[data-state=loading]::before{animation:pv-selection-breathe 1.4s ease-in-out infinite}
   .pv-selection-read[data-state=playing]::before{mask-image:var(--pv-selection-audio-icon);animation:pv-selection-breathe .8s ease-in-out infinite}
   .pv-selection-read[data-state=paused]::before{mask-image:var(--pv-selection-pause-icon)}
   @keyframes pv-selection-spin{to{transform:rotate(360deg)}}@keyframes pv-selection-breathe{50%{opacity:.4;transform:none}}@keyframes pv-selection-enter{from{opacity:0}to{opacity:1}}
   @media(prefers-reduced-motion:reduce){.selection-popup[data-pv-selection],.pv-selection-card *,.pv-selection-card *::before{animation:none!important;transition:none!important}}
  `;
  const heading=doc.createElement('div');heading.className='pv-selection-heading';
  const symbol=doc.createElement('span');symbol.className='pv-selection-symbol';symbol.setAttribute('aria-hidden','true');
  const language=doc.createElement('span');language.textContent=controller.t(controller.translationLanguage().label);
  const scopeGroup=doc.createElement('div');scopeGroup.className='pv-selection-scopes';scopeGroup.setAttribute('role','group');scopeGroup.setAttribute('aria-label',controller.t('翻译范围'));
  const scopes=['selection','sentence','paragraph'].map((id,i)=>{const b=doc.createElement('button');b.type='button';b.dataset.scope=id;b.textContent=controller.t(['划选','单句','段落'][i]);b.setAttribute('aria-pressed','false');scopeGroup.append(b);return b;});
  heading.append(symbol,language,scopeGroup);
  const translation=doc.createElement('div');translation.className='pv-selection-translation';translation.dataset.field='selectionTranslation';translation.setAttribute('role','status');translation.setAttribute('aria-live','polite');translation.tabIndex=0;
  controller.applyCaptionTypography(translation);
  const retry=doc.createElement('button');retry.type='button';retry.className='pv-selection-retry';retry.textContent=controller.t('重试翻译');retry.hidden=true;
  button.className='pv-selection-read';button.removeAttribute('style');button.dataset.state='idle';
  card.append(style,heading,translation,retry,button);controller.applyTheme(card);
  for(const [name,asset] of [['translate','languages'],['play','play'],['retry','repeat'],['audio','audio-lines'],['pause','pause']])card.style.setProperty('--pv-selection-'+name+'-icon',`url("${controller.assetURI}icons/${asset}.svg")`);
  const decorate=()=>{if(!card.isConnected)return;const popup=card.closest('.selection-popup');if(popup){popup.dataset.pvSelection='true';popup.dataset.pvSelectionTranslation=String(controller.get('selectionTranslation',true));controller.applyTheme(popup);}};
  doc.defaultView.setTimeout(decorate,0);
  return {card,heading,translation,retry,language,scopes,decorate};
 }
};
