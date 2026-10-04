/* Physical-key bindings are shared by recording, playback and accessibility. */
var PaperVoiceShortcuts = (() => {
 const actions = [
  {id:'pause',label:'暂停／继续',group:'playback',key:'Space'},
  {id:'stop',label:'停止朗读',group:'playback',key:'Escape'},
  {id:'translation',label:'显示／隐藏译文',group:'playback',key:'Alt+KeyT'},
  {id:'readTranslation',label:'原文／译文朗读',group:'playback',key:'Alt+KeyR'},
  {id:'previousSentence',label:'上一句',group:'sentence',key:'ArrowUp'},
  {id:'replaySentence',label:'重读当前句',group:'sentence',key:'ArrowLeft'},
  {id:'nextSentence',label:'下一句',group:'sentence',key:'ArrowDown'},
  {id:'previousParagraph',label:'上一段',group:'paragraph',key:'Alt+ArrowUp'},
  {id:'replayParagraph',label:'重读当前段',group:'paragraph',key:'ArrowRight'},
  {id:'nextParagraph',label:'下一段',group:'paragraph',key:'Alt+ArrowDown'}
 ];
 const modifiers=['Ctrl','Alt','Shift','Meta'];
 const codes=/^(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Escape|Arrow(?:Up|Down|Left|Right)|Enter|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Backquote|Comma|Period|Slash|IntlBackslash|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter))$/;
 const defaults=()=>Object.fromEntries(actions.map(a=>[a.id,a.key]));
 function normalize(value) {
  if(typeof value!=='string')return null;
  const parts=value.split('+'),code=parts.pop();
  if(!codes.test(code)||parts.some(x=>!modifiers.includes(x))||new Set(parts).size!==parts.length)return null;
  return [...modifiers.filter(x=>parts.includes(x)),code].join('+');
 }
 function eventKey(event,isMac=false) {
  // Gecko reports macOS Option as AltGraph even for navigation keys. Only
  // Windows/Linux AltGr must be excluded to protect character entry.
  if(event.isComposing||['Process','Unidentified','Shift','Control','Alt','Meta','AltGraph'].includes(event.key)||(!isMac&&event.getModifierState?.('AltGraph')))return null;
  let code=event.code;
  if(!codes.test(code||'')){
   const key=event.key;
   code=key===' '?'Space':key==='Esc'?'Escape':key==='Del'?'Delete':key?.length===1&&/[a-z]/i.test(key)?'Key'+key.toUpperCase():key?.length===1&&/[0-9]/.test(key)?'Digit'+key:key;
  }
  return normalize([event.ctrlKey?'Ctrl':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null,event.metaKey?'Meta':null,code].filter(Boolean).join('+'));
 }
 function read(value) {
  let data;
  try{data=typeof value==='string'?JSON.parse(value):value;}catch(_){return defaults();}
  if(!data||data.version!==1||!data.bindings||typeof data.bindings!=='object'||Array.isArray(data.bindings))return defaults();
  const result=defaults(),explicit=[];
  for(const id of Object.keys(data.bindings)){
   if(!Object.hasOwn(result,id))continue;
   const raw=data.bindings[id],key=raw===null?null:normalize(raw);
   if(raw!==null&&!key)continue;
   result[id]=key;
   if(key!==actions.find(a=>a.id===id).key)explicit.push(id);
  }
  // Explicit choices own a key before untouched defaults. Corrupt duplicates
  // are made unassigned, never allowed to trigger two actions.
  const claimed=new Set(),order=[...explicit.reverse(),...actions.map(a=>a.id).filter(id=>!explicit.includes(id))];
  for(const id of order){const key=result[id];if(key&&claimed.has(key))result[id]=null;else if(key)claimed.add(key);}
  return result;
 }
 function encode(bindings){return JSON.stringify({version:1,bindings});}
 function assign(value,id,valueKey) {
  const bindings=read(value);
  if(!Object.hasOwn(bindings,id))return {ok:false,reason:'invalidAction'};
  const key=valueKey===null?null:normalize(valueKey);
  if(valueKey!==null&&!key)return {ok:false,reason:'invalidKey'};
  const previous=bindings[id],other=key&&actions.find(a=>a.id!==id&&bindings[a.id]===key);
  bindings[id]=key;let conflict=null;
  if(other){
   const replacement=previous&&previous!==key&&!actions.some(a=>a.id!==other.id&&bindings[a.id]===previous)?previous:null;
   bindings[other.id]=replacement;
   conflict={id:other.id,replacement,kind:replacement?'swap':'unset'};
  }
  return {ok:true,bindings,conflict,key,id,value:encode(bindings)};
 }
 function format(key,isMac=false,translate=x=>x) {
  if(!key)return translate('未设置');
  const parts=key.split('+'),code=parts.pop(),symbols={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'Esc',Space:translate('空格'),Backspace:isMac?'⌫':'Backspace',Delete:'Delete',Enter:'Enter',Tab:'Tab',Minus:'−',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Backquote:'`',Comma:',',Period:'.',Slash:'/',IntlBackslash:'\\'};
  const label=symbols[code]||code.replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num ');
  return [...parts.map(p=>p==='Alt'?(isMac?'Option':'Alt'):p==='Meta'?(isMac?'Cmd':'Win'):p),label].join(' + ');
 }
 function aria(key){return key?key.replace(/Key([A-Z])/g,'$1').replace(/Digit([0-9])/g,'$1').replace(/Ctrl/g,'Control'):'';}
 function match(value,event,isMac=false){const key=eventKey(event,isMac);if(!key)return null;const bindings=read(value);return actions.find(a=>bindings[a.id]===key)?.id||null;}
 function systemKey(key,isMac=false) {
  const command=isMac?'Meta':'Ctrl';
  return [command+'+KeyF',command+'+KeyW',command+'+KeyQ',command+'+KeyS',command+'+KeyP',command+'+Tab',command+'+Space','Ctrl+Alt+Delete','Alt+F4',...(isMac?['Meta+Tab','Meta+Space','Shift+Meta+Digit3','Shift+Meta+Digit4']:['Meta+KeyL','Meta+KeyD','Meta+KeyE','Alt+Tab'])].some(x=>normalize(x)===key);
 }
 return {actions,defaults,normalize,eventKey,read,encode,assign,format,aria,match,systemKey};
})();
if(typeof module!=='undefined')module.exports=PaperVoiceShortcuts;
