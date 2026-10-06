/* Delegate download, hash validation and installation to Zotero's add-on manager. */
var PaperVoiceUpdater = {
 updateState:'idle',updateMessage:'通过 GitHub 获取插件更新',updateAuto:true,
 updateInterval(){const days=Number(this.get('updateCheckDays',7));return [1,7,30].includes(days)?days:7;},
 availableUpdateVersion(){const v=this.updateInstall?.version||this.get('availableUpdateVersion','');try{return v&&Services.vc.compare(v,this.version||this.installedVersion)>0?v:'';}catch(_){return '';}},
 hasUpdateNotice(){const version=this.availableUpdateVersion();return !!version&&version!==this.get('ignoredUpdateVersion','');},
 ignoreUpdate(){const version=this.availableUpdateVersion();if(!version)return;this.set('ignoredUpdateVersion',version);Services.prefs.savePrefFile(null);this.updateUpdateControls();},
 setUpdateInterval(days){this.set('updateCheckDays',[1,7,30].includes(Number(days))?Number(days):7);this.updateUpdateControls();this.checkScheduledUpdate();},
 checkScheduledUpdate(){if(this.dead||!this.updateAuto||['checking','installing'].includes(this.updateState))return;const now=Date.now(),last=Number(this.get('lastUpdateCheck','0')),attempt=Number(this.get('lastUpdateAttempt','0'));if(attempt&&now>=attempt&&now-attempt<15*60000)return;if(this.get('updateRetryPending',false)||!last||now-last>=this.updateInterval()*86400000||last>now)this.checkForUpdates({automatic:true});},
 startUpdateSchedule(){this.stopUpdateSchedule();this.updateScheduleHost=this.host;this.updateScheduleTimer=this.updateScheduleHost.setInterval(()=>this.checkScheduledUpdate(),60000);this.updateStartupTimer=this.updateScheduleHost.setTimeout(()=>this.checkScheduledUpdate(),15000);},
 stopUpdateSchedule(){this.updateScheduleHost?.clearInterval(this.updateScheduleTimer);this.updateScheduleHost?.clearTimeout(this.updateStartupTimer);this.updateScheduleTimer=this.updateStartupTimer=null;},
 addonManager(){return ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs').AddonManager;},
 setUpdateState(state,message){this.updateState=state;this.updateMessage=message;if(!this.dead)this.updateUpdateControls();},
 updateUpdateControls(){
  const available=this.availableUpdateVersion(),notice=this.hasUpdateNotice(),fresh=notice&&this.get('announcedUpdateVersion','')!==available;
  const panels=[...this.livePanels()];for(const {root,find,action} of panels){
   const version=this.version||this.installedVersion;
   if(version)find('aboutVersion').textContent='v'+version+' · Junyan Kang';
   find('autoUpdate').checked=!!this.updateAuto;
   find('updateInterval').value=String(this.updateInterval());find('updateInterval').disabled=!this.updateAuto;
   const badge=action('updateNotice');badge.hidden=!notice;if(badge.dataset.version!==available){badge.dataset.version=available;badge.dataset.fresh=String(fresh);}badge.setAttribute('aria-label',this.t('发现新版本')+' '+available);
   find('updateNoticeVersion').textContent=available?'v'+available:'';
   if(!notice){PaperVoiceUI.visibility(find('updateNotice'),false);badge.setAttribute('aria-expanded','false');}
   action('installNotice').disabled=['checking','installing'].includes(this.updateState);
   action('installNotice').textContent=this.updateState==='installing'?'正在更新':'安装更新';
   action('ignoreUpdate').disabled=this.updateState==='installing';
   const status=find('updateStatus'),percent=this.updateMessage.match(/\d+%/);
   status.textContent=({idle:this.updateAuto?'定期检查':'手动检查',checking:'连接中…',available:'有新版本',current:'已是最新',error:this.updateFailure==='install'?'更新失败':'检查失败',installing:percent?percent[0]:'正在下载…'})[this.updateState]||this.updateMessage;
   if(available===this.get('ignoredUpdateVersion','')&&available&&this.updateState==='available')status.textContent='已忽略此版本';
   status.title=this.updateMessage;
   action('checkUpdate').textContent=(this.updateState==='available'||available)&&!['checking','installing'].includes(this.updateState)?'安装更新':this.updateState==='checking'?'正在检查':this.updateState==='installing'?'正在更新':'检查更新';
   action('checkUpdate').disabled=['checking','installing'].includes(this.updateState);this.localize?.(root);
  }
  if(fresh&&panels.length)this.set('announcedUpdateVersion',available);
 },
 async loadUpdateSettings(){
  try{
   const manager=this.addonManager(),addon=await manager.getAddonByID(this.id);if(!addon)return;
   this.installedVersion=addon.version;
   const policy=Number(addon.applyBackgroundUpdates);
   const legacy=policy===manager.AUTOUPDATE_DEFAULT?manager.shouldAutoUpdate(addon):policy===manager.AUTOUPDATE_ENABLE;
   if(this.get('scheduledUpdates',false)!==true){this.set('updateCheckEnabled',legacy);this.set('scheduledUpdates',true);}
   this.updateAuto=!!this.get('updateCheckEnabled',true);
   // Native automatic installation belongs to Zotero. Never override the user's policy.
   if(this.get('updateScheduleRevision',0)!==2){this.set('lastUpdateCheck','0');this.set('updateScheduleRevision',2);}
   this.updatesDisabled=manager.updateEnabled===false;
   if(this.updateState==='idle')this.updateMessage=manager.updateEnabled===false?'Zotero 的插件更新已关闭，可手动检查':manager.shouldAutoUpdate(addon)?'Zotero 自动安装已开启':this.updateAuto?'自动检查已开启 · 安装前会提醒':'自动检查已关闭 · 可随时手动检查';
   this.updateUpdateControls();
  }catch(_){this.setUpdateState('error','暂时无法读取更新设置');}
 },
 async setAutoUpdate(enabled){this.set('updateCheckEnabled',!!enabled);this.updateAuto=!!enabled;this.updateUpdateControls();if(enabled)this.checkScheduledUpdate();},
 async checkForUpdates({automatic=false}={}){
  if(['checking','installing'].includes(this.updateState))return;
  this.set('lastUpdateAttempt',String(Date.now()));this.updateInstall=null;this.updateFailure='check';this.setUpdateState('checking','正在连接 GitHub…');
  try{
   const manager=this.addonManager(),addon=await manager.getAddonByID(this.id);if(!addon)throw Error('Plugin unavailable');
   const query=()=>new Promise((resolve,reject)=>{
    let finished=false;
    const finish=error=>{if(finished)return;finished=true;this.host.clearTimeout(timer);error?reject(error):resolve();};
    const timer=this.host.setTimeout(()=>{finish(Error('Update timed out'));try{addon.cancelUpdate();}catch(_){}},65000);
    try{addon.findUpdates({
     onUpdateAvailable:(_addon,install)=>{if(!finished)this.updateInstall=install;},
     onUpdateFinished:(_addon,error)=>{const issue=error?Object.assign(Error('Update failed: '+error),{code:error}):null;finish(issue);},
    },manager.UPDATE_WHEN_USER_REQUESTED);}catch(error){finish(error);}
   });
   try{await query();}catch(error){if(this.dead)throw error;if(error.code===manager.ERROR_PARSE_ERROR)throw error;await new Promise(resolve=>this.host.setTimeout(resolve,750));await query();}
   if(this.dead)return;this.set('updateRetryPending',false);this.set('lastUpdateCheck',String(Date.now()));this.set('availableUpdateVersion',this.updateInstall?.version||'');
   if(this.updateInstall)this.setUpdateState('available','发现新版本 '+this.updateInstall.version+' · 点击安装更新');
   else this.setUpdateState('current','已是最新版本 '+addon.version);
  }catch(error){this.set('updateRetryPending',true);this.updateInstall=null;this.lastUpdateError={code:error.code??null,message:String(error.message||error),time:Date.now()};Zotero.debug?.('Paper Voice update check failed: '+JSON.stringify(this.lastUpdateError));const manager=this.addonManager();this.setUpdateState('error',error.code===manager.ERROR_PARSE_ERROR?'更新清单暂不可用，请稍后重试':error.code===manager.ERROR_TIMEOUT||/timed out/i.test(error.message||'')?'更新连接超时，请稍后重试':'无法连接更新服务，请稍后重试');}
 },
 async installUpdate(){
  if(['checking','installing'].includes(this.updateState))return;
  if(!this.updateInstall)await this.checkForUpdates();
  const install=this.updateInstall;if(!install||this.updateState!=='available')return;
  this.updateFailure='install';this.setUpdateState('installing','正在下载并校验插件…');
  const fail=()=>{install.removeListener(listener);this.updateInstall=null;this.setUpdateState('error','更新未完成，原版本保留，请重新检查');};
  const listener={
   onDownloadProgress:()=>{if(install.maxProgress>0)this.setUpdateState('installing','正在下载更新 '+Math.round(install.progress/install.maxProgress*100)+'%');},
   onDownloadFailed:fail,onInstallFailed:fail,onDownloadCancelled:fail,onInstallCancelled:fail,
   onInstallEnded:()=>{install.removeListener(listener);this.updateInstall=null;this.setUpdateState('current','更新已安装');},
  };
  install.addListener(listener);try{await install.install();}catch(_){fail();}
 },
};
