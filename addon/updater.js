/* Delegate download, hash validation and installation to Zotero's add-on manager. */
var PaperVoiceUpdater = {
 updateState:'idle',updateMessage:'通过 GitHub 获取插件更新',updateAuto:true,
 addonManager(){return ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs').AddonManager;},
 setUpdateState(state,message){this.updateState=state;this.updateMessage=message;if(!this.dead)this.updateUpdateControls();},
 updateUpdateControls(){
  for(const {find,action} of this.livePanels()){
   find('autoUpdate').checked=!!this.updateAuto;
   find('updateStatus').textContent=this.updateMessage;
   action('checkUpdate').textContent=this.updateState==='available'?'安装更新':this.updateState==='checking'?'正在检查':this.updateState==='installing'?'正在更新':'检查更新';
   action('checkUpdate').disabled=['checking','installing'].includes(this.updateState);
  }
 },
 async loadUpdateSettings(){
  try{
   const manager=this.addonManager(),addon=await manager.getAddonByID(this.id);if(!addon)return;
   this.installedVersion=addon.version;
   this.updateAuto=addon.applyBackgroundUpdates===manager.AUTOUPDATE_DEFAULT?manager.shouldAutoUpdate(addon):addon.applyBackgroundUpdates===manager.AUTOUPDATE_ENABLE;
   if(this.updateState==='idle')this.updateMessage=manager.updateEnabled===false?'Zotero 的插件更新已关闭，可手动检查':this.updateAuto?'自动更新已开启 · 由 Zotero 定期检查':'自动更新已关闭 · 可随时手动检查';
   this.updateUpdateControls();
  }catch(_){this.setUpdateState('error','暂时无法读取更新设置');}
 },
 async setAutoUpdate(enabled){
  try{
   const manager=this.addonManager(),addon=await manager.getAddonByID(this.id);if(!addon)throw Error('Plugin unavailable');
   addon.applyBackgroundUpdates=enabled?manager.AUTOUPDATE_ENABLE:manager.AUTOUPDATE_DISABLE;
   this.updateState='idle';await this.loadUpdateSettings();
  }catch(_){this.setUpdateState('error','未能保存更新设置，请重试');}
 },
 async checkForUpdates(){
  if(['checking','installing'].includes(this.updateState))return;
  this.updateInstall=null;this.setUpdateState('checking','正在连接 GitHub…');
  try{
   const manager=this.addonManager(),addon=await manager.getAddonByID(this.id);if(!addon)throw Error('Plugin unavailable');
   await new Promise((resolve,reject)=>{
    let finished=false;
    const finish=error=>{if(finished)return;finished=true;this.host.clearTimeout(timer);error?reject(error):resolve();};
    const timer=this.host.setTimeout(()=>{finish(Error('Update timed out'));try{addon.cancelUpdate();}catch(_){}},45000);
    try{addon.findUpdates({
     onUpdateAvailable:(_addon,install)=>{if(!finished)this.updateInstall=install;},
     onUpdateFinished:(_addon,error)=>finish(error?Error('Update failed: '+error):null),
    },manager.UPDATE_WHEN_USER_REQUESTED);}catch(error){finish(error);}
   });
   if(this.updateInstall)this.setUpdateState('available','发现新版本 '+this.updateInstall.version+' · 点击安装更新');
   else this.setUpdateState('current','已是最新版本 '+addon.version);
  }catch(_){this.updateInstall=null;this.setUpdateState('error','无法检查 GitHub 更新，请稍后重试或查看发布页');}
 },
 async installUpdate(){
  const install=this.updateInstall;if(!install||this.updateState!=='available')return;
  this.setUpdateState('installing','正在下载并校验插件…');
  const fail=()=>{install.removeListener(listener);this.updateInstall=null;this.setUpdateState('error','更新未完成，原版本保留，请重新检查');};
  const listener={
   onDownloadProgress:()=>{if(install.maxProgress>0)this.setUpdateState('installing','正在下载更新 '+Math.round(install.progress/install.maxProgress*100)+'%');},
   onDownloadFailed:fail,onInstallFailed:fail,onDownloadCancelled:fail,onInstallCancelled:fail,
   onInstallEnded:()=>{install.removeListener(listener);this.updateInstall=null;this.setUpdateState('current','更新已安装');},
  };
  install.addListener(listener);try{await install.install();}catch(_){fail();}
 },
};
