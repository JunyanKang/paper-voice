/* Same-ID transition update. Zotero verifies the pinned successor before handoff.
 * Source preferences, credentials, libraries and voice assets are never removed. */
var PaperLoomMigration={
 targetID:'paper-loom@local.research',targetVersion:'1.1.0',
 url:'https://github.com/JunyanKang/paper-loom/releases/download/v1.1.0/paper-loom-1.1.0.xpi',
 hash:'sha512:dd19cc7c91f864e0b95cbd8cb2f8e4681ee093e55b8e9c54ec7579d2b1af028fd916d856c42364a2fe6c6ed343944976d0549da1b16bbebac75d3d2ff8e93c76',legacyIDs:['paper-voice@local.research','cite-lens@local.research'],
 start(id,version){
  this.id=id;this.version=version;this.host=Zotero.getMainWindow();this.dead=false;
  this.key='extensions.paperLoom.bridge.'+id;
  Zotero._paperLoomMigrationClients||=new Map();Zotero._paperLoomMigrationClients.set(id,this);
  this.menu=this.host.document.createXULElement('menuitem');this.menu.id='paper-loom-migrate-'+id;
  this.menu.setAttribute('label',this.text('迁移到 Paper Loom','Move to Paper Loom'));this.menu.addEventListener('command',()=>this.run());this.host.document.getElementById('menu_ToolsPopup')?.append(this.menu);
  // A failed or interrupted handoff is retried explicitly from Tools, not at every launch.
  if(Services.prefs.getStringPref(this.key,'')!==version)this.timer=this.host.setTimeout(()=>this.run(),1200);
 },
 text(zh,en){
  const saved=typeof CiteLensI18n!=='undefined'?CiteLensI18n.language():typeof PaperVoice!=='undefined'?PaperVoice.language():Zotero.locale||'en',lang=String(saved).split(/[-_]/)[0];
  const phrases={
   'Move to Paper Loom':['Paper Loom に移行','Passer à Paper Loom','Zu Paper Loom wechseln'],
   'Retry':['再試行','Réessayer','Erneut versuchen'],
   'Close':['閉じる','Fermer','Schließen'],
   'Moving to Paper Loom. Your library, settings and voices will be kept.':['Paper Loom に移行します。文献・設定・音声データは保持されます。','Passage à Paper Loom. Votre bibliothèque, vos réglages et vos voix seront conservés.','Wechsel zu Paper Loom. Bibliothek, Einstellungen und Stimmen bleiben erhalten.'],
   'Downloading Paper Loom 1.1.0':['Paper Loom 1.1.0 をダウンロード中','Téléchargement de Paper Loom 1.1.0','Paper Loom 1.1.0 wird heruntergeladen'],
   'Installing and preserving your settings…':['設定を保持してインストール中…','Installation en cours, vos réglages sont conservés…','Installation läuft. Ihre Einstellungen bleiben erhalten…'],
   'Migration was not completed. Your previous plugins and data are kept. Retry here or choose Tools → Move to Paper Loom.':['移行できませんでした。元のプラグインとデータは保持されています。ここで再試行するか、ツール → Paper Loom に移行を選択してください。','La migration a échoué. Vos anciens plugins et vos données sont conservés. Réessayez ici ou via Outils → Passer à Paper Loom.','Der Wechsel konnte nicht abgeschlossen werden. Bisherige Plugins und Daten bleiben erhalten. Versuchen Sie es hier erneut oder über Werkzeuge → Zu Paper Loom wechseln.']
  };
  return lang==='zh'?zh:phrases[en]?.[['ja','fr','de'].indexOf(lang)]||en;
 },
 status(text,error=false){
  const doc=Zotero.getMainWindow()?.document;if(!doc)return;
  let box=doc.getElementById('paper-loom-migration-status');if(!box){box=doc.createElementNS('http://www.w3.org/1999/xhtml','section');box.id='paper-loom-migration-status';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.style.cssText='position:fixed;right:22px;bottom:22px;z-index:2147483647;max-width:330px;padding:16px 18px;border:1px solid GrayText;border-radius:12px;background:Canvas;color:CanvasText;box-shadow:0 8px 28px #0002;font:13px/1.6 system-ui';(doc.body||doc.documentElement).append(box);}
  box.replaceChildren();const label=doc.createElementNS('http://www.w3.org/1999/xhtml','div');label.textContent=text;box.append(label);
  if(error){const retry=doc.createElementNS('http://www.w3.org/1999/xhtml','button');retry.textContent=this.text('重试','Retry');retry.onclick=()=>Zotero._paperLoomMigrationClients?.get(this.id)?.run();box.append(retry);}
  const dismiss=doc.createElementNS('http://www.w3.org/1999/xhtml','button');dismiss.textContent=this.text('关闭','Close');dismiss.onclick=()=>box.remove();box.append(dismiss);
 },
 async run(){
  if(this.dead)return;
  Services.prefs.setStringPref(this.key,this.version);Services.prefs.savePrefFile(null);
  const current=Zotero._paperLoomMigration;if(current)return current.promise;
  const job={handoff:false,cancelled:false,install:null};this.job=job;Zotero._paperLoomMigration=job;
  job.promise=this.migrate(job).catch(error=>{Zotero.logError(Error('Paper Loom migration failed: '+String(error.message||error)));if(!job.cancelled)this.status(this.text('迁移未完成，原插件与数据已保留。可重试，或从「工具 → 迁移到 Paper Loom」继续。','Migration was not completed. Your previous plugins and data are kept. Retry here or choose Tools → Move to Paper Loom.'),true);return false;}).finally(()=>{if(Zotero._paperLoomMigration===job)delete Zotero._paperLoomMigration;this.job=null;});return job.promise;
 },
 async waitFor(test,job,timeout=30000){const until=Date.now()+timeout;while(Date.now()<until){if(job.cancelled)throw Error('Migration cancelled');const result=await test();if(result)return result;await Zotero.Promise.delay(100);}throw Error('Migration startup timed out');},
 async download(manager,job){
  const install=await manager.getInstallForURL(this.url,{hash:this.hash});job.install=install;if(job.cancelled){install.cancel();throw Error('Migration cancelled');}
  await new Promise((resolve,reject)=>{
   let done=false,last=-1;const host=Zotero.getMainWindow();
   const finish=error=>{if(done)return;done=true;host.clearTimeout(timer);install.removeListener(listener);job.install=null;error?reject(error):resolve();};
   const failed=()=>finish(Error('Successor package could not be installed'));
   const listener={onDownloadProgress:()=>{const percent=install.maxProgress>0?Math.floor(install.progress/install.maxProgress*100):-1;if(percent===last)return;last=percent;this.status(this.text('正在下载 Paper Loom 1.1.0','Downloading Paper Loom 1.1.0')+(percent>=0?' · '+percent+'%':''));},onDownloadFailed:failed,onDownloadCancelled:failed,onInstallFailed:failed,onInstallCancelled:failed,
    onInstallStarted:()=>{if(job.cancelled||install.addon?.id!==this.targetID||install.addon?.version!==this.targetVersion){finish(Error('Unexpected successor identity'));install.cancel();return false;}this.status(this.text('正在安装并保留原有配置…','Installing and preserving your settings…'));},onInstallEnded:()=>finish()};
   const timer=host.setTimeout(()=>{finish(Error('Successor installation timed out'));try{install.cancel();}catch(_){}},180000);
   install.addListener(listener);try{Promise.resolve(install.install()).catch(finish);}catch(error){finish(error);}
  });
 },
 async migrate(job){
  const {AddonManager:manager}=ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs'),before=await manager.getAddonByID(this.targetID),wasActive=!!before?.isActive;
  const originals=(await Promise.all(this.legacyIDs.map(id=>manager.getAddonByID(id)))).filter(a=>a?.isActive),disabled=[];
  this.status(this.text('正在迁移到 Paper Loom；文献、设置和声音包会保留。','Moving to Paper Loom. Your library, settings and voices will be kept.'));
  try{
   if(!before||Services.vc.compare(before.version,this.targetVersion)<0)await this.download(manager,job);
   if(job.cancelled)throw Error('Migration cancelled');
   const successor=await manager.getAddonByID(this.targetID);if(!successor||Services.vc.compare(successor.version,this.targetVersion)<0)throw Error('Successor unavailable');
   if(successor.userDisabled)await successor.enable();
   const loom=await this.waitFor(()=>Zotero.PaperLoom?.conflicts&&Services.vc.compare(Zotero.PaperLoom.version,this.targetVersion)>=0?Zotero.PaperLoom:null,job);
   // Stop old Reader hooks and flush their state before the successor imports it.
   job.handoff=true;
   for(const addon of originals){await addon.disable();disabled.push(addon);}
   if(!loom.started)await loom.startModules();
   if(!loom.started)throw Error('Successor did not start');
   for(const win of Zotero.getMainWindows()){win.document.getElementById('paper-loom-conflicts')?.remove();win.document.getElementById('paper-loom-migration-status')?.remove();}
   Services.prefs.setStringPref('extensions.paperLoom.bridge.completed',loom.version);Services.prefs.savePrefFile(null);
   try{await loom.showSettings();}catch(error){Zotero.logError(error);}return true;
  }catch(error){
   // A failed download never touches the old plugins. Failed activation restores
   // only the plugins that this transaction disabled, without deleting any data.
   if(!wasActive){const installed=await manager.getAddonByID(this.targetID);if(installed?.isActive)try{await installed.disable();}catch(_){} }
   for(const addon of disabled)try{await addon.enable();}catch(e){Zotero.logError(e);}
   throw error;
  }
 },
 stop(){this.dead=true;if(Zotero._paperLoomMigrationClients?.get(this.id)===this){Zotero._paperLoomMigrationClients.delete(this.id);if(!Zotero._paperLoomMigrationClients.size)delete Zotero._paperLoomMigrationClients;}this.host?.clearTimeout(this.timer);this.menu?.remove();this.menu=null;if(this.job&&!this.job.handoff){this.job.cancelled=true;try{this.job.install?.cancel();}catch(_){}}}
};
