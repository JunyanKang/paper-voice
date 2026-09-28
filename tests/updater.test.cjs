const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(check){
 const addon={version:'1.1.0',applyBackgroundUpdates:1,findUpdates:listener=>check(listener),cancelUpdate(){}};
 const manager={getAddonByID:async()=>addon,UPDATE_WHEN_USER_REQUESTED:1,AUTOUPDATE_DEFAULT:1,AUTOUPDATE_ENABLE:2,AUTOUPDATE_DISABLE:0,shouldAutoUpdate:()=>true};
 const ctx={ChromeUtils:{importESModule:()=>({AddonManager:manager})}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('addon/updater.js','utf8'),ctx);
 const p=ctx.PaperVoiceUpdater;p.id='test';p.host={setTimeout,clearTimeout};p.livePanels=()=>[];return {p,addon};
}
test('update check distinguishes available, current and network failure',async()=>{
 for(const state of ['available','current','error']){
  const {p}=setup(l=>{if(state==='available')l.onUpdateAvailable({}, {version:'1.2.0'});l.onUpdateFinished({},state==='error'?-1:0);});
  await p.checkForUpdates();assert.equal(p.updateState,state);if(state==='error')assert.doesNotMatch(p.updateMessage,/最新/);
 }
});
test('automatic update preference applies only to this addon',async()=>{
 const {p,addon}=setup(()=>{});await p.setAutoUpdate(false);assert.equal(addon.applyBackgroundUpdates,0);assert.equal(p.updateAuto,false);
 await p.setAutoUpdate(true);assert.equal(addon.applyBackgroundUpdates,2);assert.equal(p.updateAuto,true);
});
test('manual installation is delegated to the verified AddonInstall and failure stays recoverable',async()=>{
 let listener,installs=0;const install={version:'1.2.0',addListener:l=>listener=l,removeListener(){},install:async()=>{installs++;listener.onDownloadFailed();}};
 const {p}=setup(l=>{l.onUpdateAvailable({},install);l.onUpdateFinished({},0);});await p.checkForUpdates();assert.equal(installs,0);await p.installUpdate();assert.equal(installs,1);assert.equal(p.updateState,'error');assert.equal(p.updateInstall,null);
});
test('synchronous check failure clears the timeout and reports an error',async()=>{
 const {p}=setup(()=>{throw Error('offline');});let cleared=false;
 p.host={setTimeout:()=>123,clearTimeout:id=>{cleared=id===123;}};
 await p.checkForUpdates();assert.equal(p.updateState,'error');assert.equal(cleared,true);
});
test('timeout cancels the native request and ignores a late available callback',async()=>{
 let callback,listener,cancelled=false;const {p,addon}=setup(l=>{listener=l;});
 addon.cancelUpdate=()=>{cancelled=true;};p.host={setTimeout:fn=>{callback=fn;return 1;},clearTimeout(){}};
 const task=p.checkForUpdates();await Promise.resolve();callback();await task;
 listener.onUpdateAvailable({}, {version:'99'});listener.onUpdateFinished({},0);
 assert.equal(cancelled,true);assert.equal(p.updateState,'error');assert.equal(p.updateInstall,null);
});
