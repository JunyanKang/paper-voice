/* One palette across reader surfaces. Personal backgrounds never leave the profile. */
var PaperVoiceThemes = {
  themes: [
    {id:'porcelain',name:'玉瓷',paper:'#f6f5f0',ink:'#243a36',muted:'#52625c',accent:'#286452',soft:'#dce9e1',focus:'#876219',highlight:'#d3a52942',art:null},
    {id:'botanical',name:'森雾',paper:'#edf2e9',ink:'#293b2c',muted:'#52634f',accent:'#3e6637',soft:'#d7e4d0',focus:'#795822',highlight:'#87aa4a42',art:'botanical'},
    {id:'tidal',name:'潮汐',paper:'#edf4f8',ink:'#233c50',muted:'#4c6173',accent:'#275f8c',soft:'#d3e6f2',focus:'#8b5f26',highlight:'#5fa1d842',art:'tidal'},
    {id:'amber',name:'暮砂',paper:'#f6eee7',ink:'#49372e',muted:'#675246',accent:'#8b4b32',soft:'#edd9ca',focus:'#6c5845',highlight:'#d4996242',art:'amber'},
    {id:'midnight',name:'深空',paper:'#202937',ink:'#f0f2f6',muted:'#c0cad8',accent:'#afc9ef',soft:'#384c65',focus:'#e8c48c',highlight:'#9082cc45',art:'midnight',dark:true}
  ],
  theme() {return this.themes.find(t=>t.id===this.get('theme','porcelain'))||this.themes[0];},
  themeImage() {return this.get('themeImageEnabled',false)&&this.customThemeImage?this.customThemeImage:(this.theme().art?this.assetURI+'themes/'+this.theme().art+'.png':'');},
  setTheme(id) {if(!this.themes.some(t=>t.id===id))return;this.set('theme',id);this.set('themeImageEnabled',false);this.syncSettings();},
  applyTheme(root,caption=false) {
    const t=this.theme(),image=this.themeImage(),rgb=t.paper.match(/\w\w/g).map(x=>parseInt(x,16)).join(','),reduced=root.ownerDocument.defaultView.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    root.dataset.theme=t.id;root.dataset.themeTone=t.dark?'dark':'light';
    for(const key of ['paper','ink','muted','accent','soft','focus','highlight'])root.style.setProperty('--pv-'+key,t[key]);
    // A second tint layer protects reading contrast even over a black/white photo.
    const custom=this.get('themeImageEnabled',false)&&!!this.customThemeImage;
    const alpha=reduced?1:1-(1-this.surfaceOpacity())*(custom ? .05 : caption ? .075 : .15);
    root.style.setProperty('--pv-glass',`rgba(${rgb},${alpha})`);
    root.style.setProperty('--pv-glass-line',t.dark?'#ffffff20':'#ffffff80');
    root.style.setProperty('--pv-glass-shadow',t.dark?'0 8px 28px #0005':'0 8px 28px #23393022,0 1px 3px #23393010');
    root.style.setProperty('--pv-art',image&&!reduced?`url("${image}")`:'none');
    root.style.setProperty('--pv-art-opacity',String(reduced?0:caption ? .04 : custom ? .08 : .42));
    root.style.setProperty('--pv-icon-filter',t.dark?'brightness(0) invert(.92)':'brightness(0) opacity(.78)');
    root.style.setProperty('--pv-primary-ink',t.dark?'#202937':'#ffffff');
    root.style.setProperty('--pv-primary-filter',t.dark?'brightness(0) opacity(.85)':'brightness(0) invert(1)');
    root.style.colorScheme=t.dark?'dark':'light';
    if(caption){root.style.color=t.ink;root.style.backgroundColor=`rgba(${rgb},${alpha})`;root.style.backgroundImage='none';root.style.isolation='isolate';root.style.boxShadow='var(--pv-glass-shadow), inset 0 0 0 1px var(--pv-glass-line)';}
  },
  syncTheme(root) {
    this.applyTheme(root);
    for(const b of root.querySelectorAll('[data-theme-choice]'))b.setAttribute('aria-pressed',String(b.dataset.themeChoice===this.theme().id&&!this.get('themeImageEnabled',false)));
    const find=name=>root.querySelector(`[data-field="${name}"]`),image=this.customThemeImage;
    if(find('customBackground')){find('customBackground').hidden=!image;find('customBackground').setAttribute('aria-pressed',String(!!image&&this.get('themeImageEnabled',false)));}
    if(find('removeBackground'))find('removeBackground').hidden=!image;
    if(this.caption)this.applyTheme(this.caption.box,true);
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
