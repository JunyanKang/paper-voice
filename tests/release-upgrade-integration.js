// Run only in the isolated QA profile, after v1.2.0 is public.
const root=PaperVoice.testRoot,out=PaperVoice.testPath('test-results/release-upgrade.json');
if(Services.dirsvc.get('ProfD',Components.interfaces.nsIFile).path!==root+'/test-profile')throw Error('Upgrade test requires the isolated QA profile');
const {AddonManager:manager,AddonManagerPrivate:internal}=ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
const id=PaperVoice.id,report={checks:[]},check=async(name,ok,details={})=>{report.checks.push({name,ok,...details});await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));if(!ok)throw Error(name);};
const file=Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsIFile);file.initWithPath(root+'/.build/update-baseline/paper-voice-1.1.0.xpi');
const installBaseline=async()=>{Zotero.PaperVoice?.stop();const install=await manager.getInstallForFile(file);await install.install();for(let i=0;i<100&&(!Zotero.PaperVoice||Zotero.PaperVoice.dead);i++)await Zotero.Promise.delay(100);const addon=await manager.getAddonByID(id);await check('Public v1.1.0 installed as a real upgrade baseline',addon.version==='1.1.0',{version:addon.version,url:addon.updateURL});return addon;};
let addon=await installBaseline();addon.applyBackgroundUpdates=manager.AUTOUPDATE_ENABLE;
await internal.backgroundUpdateCheck();
for(let i=0;i<600&&(await manager.getAddonByID(id)).version!=='1.2.0';i++)await Zotero.Promise.delay(100);
await check('Zotero background update downloads and installs v1.2.0 from GitHub',(await manager.getAddonByID(id)).version==='1.2.0');
addon=await installBaseline();addon.applyBackgroundUpdates=manager.AUTOUPDATE_DISABLE;
// Exercise the exact new manual-update implementation while the old package is installed.
const scope={ChromeUtils};Services.scriptloader.loadSubScript(Services.io.newFileURI((()=>{const f=file.clone();f.initWithPath(root+'/addon/updater.js');return f;})()).spec,scope);
const updater=scope.PaperVoiceUpdater;updater.id=id;updater.host=Zotero.getMainWindow();updater.livePanels=()=>[];
await updater.checkForUpdates();await check('Manual update discovers the public newer version',updater.updateState==='available'&&updater.updateInstall?.version==='1.2.0',{state:updater.updateState,message:updater.updateMessage});
await updater.installUpdate();
for(let i=0;i<600&&(await manager.getAddonByID(id)).version!=='1.2.0';i++)await Zotero.Promise.delay(100);
await check('Manual native install replaces v1.1.0 with v1.2.0',(await manager.getAddonByID(id)).version==='1.2.0');
for(let i=0;i<100&&(!Zotero.PaperVoice?.checkForUpdates||Zotero.PaperVoice.dead);i++)await Zotero.Promise.delay(100);
const p=Zotero.PaperVoice;await p.checkForUpdates();await check('Installed production plugin checks again and reports current',p.updateState==='current',{message:p.updateMessage});
await p.setAutoUpdate(true);const r=Zotero.Reader._readers.at(-1);p.attachReader(r);await p.speak('The updated plugin can still read the retina paper.',r,true);
await check('Production plugin still synthesizes and completes audio after live upgrade',p.state==='idle'&&p.status.includes('完成'),{status:p.status});
const panel=p.panels.get(r);await check('Production UI has four modes and the manual update control',panel.root.querySelectorAll('[data-mode]').length===4&&!!panel.action('checkUpdate'));
report.passed=true;await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));return report;
