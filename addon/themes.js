/* One palette across reader surfaces. Personal backgrounds never leave the profile. */
var PaperVoiceThemes = {
  // Legacy IDs preserve saved choices; their original artwork and palettes are replaced.
  themes: [
    {id:'porcelain',name:'织麦',paper:'#f6f1e7',surface:'#fffaf0',ink:'#3e372b',muted:'#544a3b',accent:'#72552e',soft:'#e9ddc7',line:'#d7c9af',focus:'#72552e',highlight:'#c5a46438',art:'linen.jpg',mask:.54},
    {id:'botanical',name:'靛蓝',paper:'#172c49',surface:'#223c5f',ink:'#f2f6fd',muted:'#ceddf4',accent:'#b7d6fb',soft:'#2d4769',line:'#4b6484',focus:'#b7d6fb',highlight:'#8caedd40',art:'indigo.jpg',mask:.52,dark:true},
    {id:'tidal',name:'天际',paper:'#edf4f8',surface:'#f8fcfe',ink:'#20384b',muted:'#3e5261',accent:'#245d85',soft:'#d4e5ef',line:'#bfd6e4',focus:'#245d85',highlight:'#5fa1d838',art:'horizon.jpg',mask:.50},
    {id:'amber',name:'赤陶',paper:'#f6eee8',surface:'#fff7f0',ink:'#48342e',muted:'#60463e',accent:'#874935',soft:'#eed9cc',line:'#dec4b6',focus:'#874935',highlight:'#cb907238',art:'terracotta.jpg',mask:.56},
    {id:'midnight',name:'月岩',paper:'#25292e',surface:'#32383f',ink:'#f5f3ee',muted:'#dddad2',accent:'#e2cdab',soft:'#43443f',line:'#666962',focus:'#e2cdab',highlight:'#b7ae943c',art:'lunar.jpg',mask:.54,dark:true},
    {id:'sakura',name:'樱雾',paper:'#faf2f4',surface:'#fffafc',ink:'#4c2d3a',muted:'#634453',accent:'#85405b',soft:'#f0dce5',line:'#dfc5d0',focus:'#85405b',highlight:'#d991b238',art:'sakura.jpg',mask:.64},
    {id:'inkstone',name:'墨竹',paper:'#f3f2ee',surface:'#fbfaf6',ink:'#2c3332',muted:'#454d49',accent:'#85443b',soft:'#e8dcd7',line:'#cfcfc5',focus:'#85443b',highlight:'#b1aaa03a',art:'inkstone.jpg',mask:.72},
    {id:'silver',name:'银翼',paper:'#f0f3f5',surface:'#fbfcfd',ink:'#2d3742',muted:'#46515c',accent:'#455c73',soft:'#dbe3ea',line:'#c6d0d9',focus:'#455c73',highlight:'#7f9dbb38',art:'silver.jpg',mask:.70},
    {id:'aurora',name:'极光',paper:'#14292d',surface:'#1d383e',ink:'#ecf9f6',muted:'#c2e2dc',accent:'#8adccb',soft:'#29464b',line:'#426469',focus:'#8adccb',highlight:'#71c2ae3c',art:'aurora.jpg',mask:.55,dark:true},
    {id:'velvet',name:'酒绒',paper:'#2e222c',surface:'#3e2d3a',ink:'#fff2f5',muted:'#edd3df',accent:'#f1bfc8',soft:'#513644',line:'#745465',focus:'#f1bfc8',highlight:'#d39aa83c',art:'velvet.jpg',mask:.68,dark:true}
  ],
  theme() {return this.themes.find(t=>t.id===this.get('theme','tidal'))||this.themes.find(t=>t.id==='tidal');},
  themeImage() {return this.get('themeImageEnabled',false)&&this.customThemeImage?this.customThemeImage:(this.theme().art?this.assetURI+'themes/'+this.theme().art:'');},
  setTheme(id) {if(!this.themes.some(t=>t.id===id))return;this.set('theme',id);this.set('themeImageEnabled',false);this.syncSettings();},
  applyTheme(root,caption=false) {
    const t=this.theme(),image=this.themeImage(),rgb=t.paper.match(/\w\w/g).map(x=>parseInt(x,16)).join(','),reduced=root.ownerDocument.defaultView.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    root.dataset.theme=t.id;root.dataset.themeTone=t.dark?'dark':'light';
    for(const key of ['paper','surface','ink','muted','accent','soft','line','focus','highlight'])root.style.setProperty('--pv-'+key,t[key]);
    // Apply user transparency to the entire decorative layer, never to text or controls.
    const custom=this.get('themeImageEnabled',false)&&!!this.customThemeImage;
    const alpha=reduced?1:this.surfaceOpacity();
    root.style.setProperty('--pv-glass',`rgba(${rgb},${alpha})`);
    root.style.setProperty('--pv-glass-line',t.dark?'#ffffff32':t.ink+'30');
    root.style.setProperty('--pv-rim-light',t.dark?'#ffffff22':'#ffffffd9');
    root.style.setProperty('--pv-glass-shadow',t.dark?'0 12px 32px #080d183d,0 2px 6px #080d1826':'0 12px 32px #1827381c,0 2px 6px #18273814');
    root.style.setProperty('--pv-small-shadow',t.dark?'0 5px 16px #080d1838,0 1px 3px #080d1826':'0 5px 16px #1827381a,0 1px 3px #18273812');
    root.style.setProperty('--pv-art',image&&!reduced?`url("${image}")`:'none');
    root.style.setProperty('--pv-art-opacity',String(alpha));
    root.style.setProperty('--pv-image-mask',`rgba(${rgb},${caption ? .97 : custom ? .94 : t.mask})`);
    root.style.setProperty('--pv-text-halo','none');
    root.style.setProperty('--pv-icon-filter',t.dark?'brightness(0) invert(.92)':'brightness(0) opacity(.78)');
    root.style.setProperty('--pv-primary-ink',t.dark?t.paper:'#ffffff');
    root.style.setProperty('--pv-control-mask',`rgba(${rgb},${t.dark?.88:.90})`);
    root.style.setProperty('--pv-primary-filter',t.dark?'brightness(0) opacity(.85)':'brightness(0) invert(1)');
    root.style.colorScheme=t.dark?'dark':'light';
    if(caption){root.style.color=t.ink;root.style.backgroundColor='transparent';root.style.textShadow='var(--pv-text-halo)';root.style.backgroundImage='none';root.style.isolation='isolate';root.style.boxShadow='var(--pv-small-shadow),inset 0 1px 0 var(--pv-rim-light)';root.style.outline='1px solid var(--pv-glass-line)';root.style.outlineOffset='-1px';}
  },
  syncTheme(root) {
    this.applyTheme(root);
    for(const b of root.querySelectorAll('[data-theme-choice]')){const selected=b.dataset.themeChoice===this.theme().id&&!this.get('themeImageEnabled',false);b.setAttribute('aria-pressed',String(selected));b.tabIndex=b.dataset.themeChoice===this.theme().id?0:-1;}
    if(root._pvLastTheme!==this.theme().id){root._pvLastTheme=this.theme().id;root._pvRevealTheme?.();}
    const find=name=>root.querySelector(`[data-field="${name}"]`),image=this.customThemeImage;
    if(find('customBackground')){find('customBackground').hidden=!image;find('customBackground').setAttribute('aria-pressed',String(!!image&&this.get('themeImageEnabled',false)));}
    if(find('removeBackground'))find('removeBackground').hidden=!image;
    const row=root.querySelector('.pv-background-row');if(row)row.dataset.hasImage=String(!!image);
    if(this.caption)this.applyTheme(this.caption.box,true);
    for(const selection of this.selectionContexts?.values?.()||[]){
      const card=selection.button?.closest('.pv-selection-card');
      if(card?.isConnected){this.applyTheme(card);const popup=card.closest('.selection-popup');if(popup)this.applyTheme(popup);}
    }
    for(const marker of this.sentenceHighlight?.markers||[])marker.style.background=this.theme().highlight;
  },
  themeImagePath() {return PathUtils.join(PathUtils.profileDir,'paper-voice-background.jpg');},
  async loadThemeImage() {
    try{
      const path=this.themeImagePath();if(!await IOUtils.exists(path))return;
      const data=await IOUtils.read(path,{maxBytes:2097152});
      if(data.length>=2097152)throw Error('Background exceeds storage limit');
      this.customThemeImage='data:image/jpeg;base64,'+this.host.btoa(Array.from(data,x=>String.fromCharCode(x)).join(''));
    }catch(e){Zotero.logError(e);this.customThemeImage=null;}
  },
  async importThemeImage(path) {
    const stat=await IOUtils.stat(path);if(stat.size>12*1024*1024)throw Error(this.t('图片不能超过 12 MB'));
    const bytes=await IOUtils.read(path),png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpeg=bytes[0]===255&&bytes[1]===216,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!png&&!jpeg&&!webp)throw Error(this.t('请选择 PNG、JPG 或 WebP 图片'));
    const win=this.host,url=win.URL.createObjectURL(new win.Blob([bytes],{type:png?'image/png':jpeg?'image/jpeg':'image/webp'}));
    try{
      const img=new win.Image();img.src=url;await img.decode();
      if(!img.width||!img.height||img.width*img.height>24000000)throw Error(this.t('图片分辨率不能超过 2400 万像素'));
      const canvas=win.document.createElementNS('http://www.w3.org/1999/xhtml','canvas');canvas.width=768;canvas.height=1024;
      const ctx=canvas.getContext('2d'),scale=Math.max(canvas.width/img.width,canvas.height/img.height),sw=canvas.width/scale,sh=canvas.height/scale;
      ctx.fillStyle=this.theme().paper;ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',.86),out=Uint8Array.from(win.atob(data.split(',')[1]),x=>x.charCodeAt(0));
      await IOUtils.write(this.themeImagePath(),out,{tmpPath:this.themeImagePath()+'.tmp'});
      this.customThemeImage=data;this.set('themeImageEnabled',true);this.syncSettings();return {width:canvas.width,height:canvas.height,bytes:out.length};
    }finally{win.URL.revokeObjectURL(url);}
  },
  async chooseThemeImage() {
    if(this.choosingThemeImage)return;this.choosingThemeImage=true;
    try{
      const picker=Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
      picker.init(this.host.browsingContext,this.t('导入背景图片'),picker.modeOpen);picker.appendFilter(this.t('背景图片'),'*.png;*.jpg;*.jpeg;*.webp');
      const result=await new Promise(resolve=>picker.open(resolve));
      if(result!==picker.returnOK)return;
      await this.importThemeImage(picker.file.path);this.setStatus('背景已保存');
    }catch(e){this.setStatus(String(e.message||e));Zotero.logError(e);throw e;}finally{this.choosingThemeImage=false;}
  },
  async removeThemeImage() {await IOUtils.remove(this.themeImagePath(),{ignoreAbsent:true});this.customThemeImage=null;this.set('themeImageEnabled',false);this.syncSettings();},
};
