const p=PaperVoice,report={checks:[]},manager=p.addonManager(),addon=await manager.getAddonByID(p.id),old=addon.applyBackgroundUpdates;
const check=(name,ok,details={})=>{report.checks.push({name,ok,...details});if(!ok)throw Error(name);};
try{
 await p.setAutoUpdate(false);check('Disabling auto update is saved in the native addon manager',Number(addon.applyBackgroundUpdates)===manager.AUTOUPDATE_DISABLE&&!p.updateAuto&&!manager.shouldAutoUpdate(addon));
 await p.setAutoUpdate(true);check('Enabling auto update is saved and eligible for background updates',Number(addon.applyBackgroundUpdates)===manager.AUTOUPDATE_ENABLE&&p.updateAuto&&manager.shouldAutoUpdate(addon));
 await p.checkForUpdates();check('Manual check reads the actual public GitHub update feed',['current','available'].includes(p.updateState),{version:addon.version,url:addon.updateURL,message:p.updateMessage});report.passed=true;return report;
}finally{addon.applyBackgroundUpdates=old;await p.loadUpdateSettings();await IOUtils.writeUTF8(p.testPath('test-results/updater-integration.json'),JSON.stringify(report,null,2));}
