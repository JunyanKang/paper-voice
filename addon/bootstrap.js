var PaperVoiceScope;
async function startup({ rootURI, version }, reason) {
  await Zotero.initializationPromise;
  PaperVoiceScope = { Zotero, ChromeUtils, Services, IOUtils, PathUtils, Components };
  Services.scriptloader.loadSubScript(rootURI + 'vendor/tinyld.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'core.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'i18n.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'shortcuts.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'panel-style.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'companion.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'panel.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'selection-popup.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'translation.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'llm.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'updater.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'themes.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'main.js', PaperVoiceScope);
  const resources=Services.io.getProtocolHandler('resource').QueryInterface(Components.interfaces.nsIResProtocolHandler);
  PaperVoiceScope.assetResource='paper-voice-'+version.replace(/\./g,'-');
  resources.setSubstitutionWithFlags(PaperVoiceScope.assetResource,Services.io.newURI(rootURI),resources.ALLOW_CONTENT_ACCESS);
  PaperVoiceScope.PaperVoice.version = version;
  PaperVoiceScope.PaperVoice.assetURI = 'resource://'+PaperVoiceScope.assetResource+'/assets/';
  PaperVoiceScope.PaperVoice.cssText = PaperVoiceScope.PaperVoiceStyle;
  PaperVoiceScope.PaperVoice.initTranslation();
  await PaperVoiceScope.PaperVoice.start();
}
async function shutdown(data, reason) {
  const assetResource=PaperVoiceScope?.assetResource;
  if (PaperVoiceScope) await PaperVoiceScope.PaperVoice.shutdown();
  PaperVoiceScope = null;
  if(assetResource)Services.io.getProtocolHandler('resource').QueryInterface(Components.interfaces.nsIResProtocolHandler).setSubstitution(assetResource,null);
}
function install() {}
function uninstall() {}
function onMainWindowLoad({ window }) { PaperVoiceScope?.PaperVoice.addWindow(window); }
function onMainWindowUnload({ window }) { PaperVoiceScope?.PaperVoice.removeWindow(window); }
