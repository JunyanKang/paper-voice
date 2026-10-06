import Cocoa
import CryptoKit
import Foundation
import CoreText

let resources=Bundle.main.resourceURL!,fm=FileManager.default
func arg(_ name:String)->String?{let a=CommandLine.arguments;guard let i=a.firstIndex(of:name),i+1<a.count else{return nil};return a[i+1]}
func flag(_ name:String)->Bool{CommandLine.arguments.contains(name)}
func fail(_ text:String)->NSError{NSError(domain:"PaperVoice",code:1,userInfo:[NSLocalizedDescriptionKey:text])}
let config=try! JSONSerialization.jsonObject(with:Data(contentsOf:resources.appendingPathComponent("installer.json"))) as! [String:Any]
let runtime=config["runtime"] as! [String:Any],version=config["version"] as! String
let packages=runtime["packages"] as! [[String:Any]]
let appData=fm.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Zotero")
let location=appData.appendingPathComponent("paper-voice-location.json")
func defaultRoot()->URL{if let b=try? Data(contentsOf:location),let j=(try? JSONSerialization.jsonObject(with:b)) as? [String:Any],let s=j["root"] as? String{return URL(fileURLWithPath:s)};return appData.appendingPathComponent("paper-voice-engine")}
func sha(_ url:URL)throws->String{let f=try FileHandle(forReadingFrom:url);defer{try? f.close()};var h=SHA256();while let b=try f.read(upToCount:1024*1024),!b.isEmpty{h.update(data:b)};return h.finalize().map{String(format:"%02x",$0)}.joined()}
func valid(_ url:URL,_ asset:[String:Any])->Bool{((try? url.resourceValues(forKeys:[.fileSizeKey]).fileSize)==(asset["bytes"] as! NSNumber).intValue) && (try? sha(url))==asset["sha256"] as? String}
final class Transfer: NSObject, URLSessionDownloadDelegate {
 private var task: URLSessionDownloadTask?; private var session: URLSession?; private let done=DispatchSemaphore(value:0)
 var cancelled=false; var error: Error?;var destination:URL!;var expected:Int64=0;var progress:((Double)->Void)?
 func cancel(){cancelled=true;task?.cancel()}
 func download(_ asset:[String:Any],to target:URL) throws {
  if cancelled{throw fail("已取消 / Cancelled")};destination=target;expected=(asset["bytes"] as! NSNumber).int64Value
  let cfg=URLSessionConfiguration.ephemeral;cfg.timeoutIntervalForRequest=60;cfg.timeoutIntervalForResource=600
  session=URLSession(configuration:cfg,delegate:self,delegateQueue:nil);task=session!.downloadTask(with:URL(string:asset["url"] as! String)!);task!.resume();if cancelled{task!.cancel()};done.wait();session?.finishTasksAndInvalidate();session=nil;task=nil
  if let e=error{throw e};if cancelled{throw fail("已取消 / Cancelled")}
  let size=(try target.resourceValues(forKeys:[.fileSizeKey])).fileSize ?? 0
  guard size==expected,try sha(target)==asset["sha256"] as! String else {throw fail("文件校验失败，请重试 / File verification failed")}
 }
 func urlSession(_ session: URLSession,downloadTask:URLSessionDownloadTask,didWriteData bytesWritten:Int64,totalBytesWritten:Int64,totalBytesExpectedToWrite:Int64){if totalBytesWritten>expected{error=fail("文件大小不符 / Unexpected file size");downloadTask.cancel()};progress?(min(1,Double(totalBytesWritten)/Double(max(1,expected))))}
 func urlSession(_ session:URLSession,downloadTask:URLSessionDownloadTask,didFinishDownloadingTo location:URL){do{guard let response=downloadTask.response as? HTTPURLResponse,response.statusCode==200 else{throw fail("下载暂不可用 / Download unavailable")};try FileManager.default.moveItem(at:location,to:destination)}catch{self.error=error}}
 func urlSession(_ session:URLSession,task:URLSessionTask,didCompleteWithError error:Error?){if self.error==nil{self.error=error};done.signal()}
 func urlSession(_ session:URLSession,task:URLSessionTask,willPerformHTTPRedirection response:HTTPURLResponse,newRequest request:URLRequest,completionHandler:@escaping(URLRequest?)->Void){completionHandler(request.url?.scheme=="https" ? request:nil)}
}
final class Engine{
 var cancelled=false,committing=false;var transfer:Transfer?;var progress:((String,Double)->Void)?
 func cancel(){if !committing{cancelled=true;transfer?.cancel()}}
 func check()throws{if cancelled{throw fail("已取消 / Cancelled")}}
 func verify(_ root:URL)throws{
  let files=runtime["files"] as! [[String:Any]]
  for (i,f) in files.enumerated(){try check();let path=root.appendingPathComponent(f["name"] as! String)
   if let link=f["link"] as? String{guard (try? fm.destinationOfSymbolicLink(atPath:path.path))==link else{throw fail("声音文件不完整 / Incomplete voices")}}
   else if !valid(path,f){throw fail("声音文件不完整 / Incomplete voices")}
   if i%40==0{progress?("verify",Double(i)/Double(files.count))}
  }
 }
 func fetch(_ a:[String:Any],_ cache:URL,_ phase:String,_ before:Double=0,_ total:Double=1)throws->URL{
  try check();let path=cache.appendingPathComponent(a["name"] as! String),size=(a["bytes"] as! NSNumber).doubleValue
  if valid(path,a){progress?(phase,(before+size)/total);return path}
  let temp=cache.appendingPathComponent(".download-"+UUID().uuidString);defer{try? fm.removeItem(at:temp)}
  if let local=arg("--package-dir"){
   try fm.copyItem(at:URL(fileURLWithPath:local).appendingPathComponent(a["name"] as! String),to:temp)
   guard valid(temp,a) else{throw fail("下载校验失败 / Download verification failed")};progress?(phase,(before+size)/total)
  }else{
   let t=Transfer();transfer=t;t.progress={[weak self] v in self?.progress?(phase,(before+v*size)/total)};defer{transfer=nil};try t.download(a,to:temp)
  }
  try check();if fm.fileExists(atPath:path.path){try fm.removeItem(at:path)};try fm.moveItem(at:temp,to:path);return path
 }
 func task(_ exe:URL,_ args:[String])throws{
  let p=Process(),pipe=Pipe();p.executableURL=exe;p.arguments=args;p.standardOutput=pipe;p.standardError=pipe
  p.environment=ProcessInfo.processInfo.environment.merging(["HF_HUB_OFFLINE":"1","PYTHONNOUSERSITE":"1"]){_,n in n}
  try p.run();let output=pipe.fileHandleForReading.readDataToEndOfFile();p.waitUntilExit();guard p.terminationStatus==0 else{throw fail(String(data:output,encoding:.utf8) ?? "Installation failed")}
 }
 func exportPlugin(_ source:URL,_ asset:[String:Any])throws->URL{
  let folder=arg("--plugin-dir").map{URL(fileURLWithPath:$0)} ?? fm.urls(for:.downloadsDirectory,in:.userDomainMask)[0].appendingPathComponent("Paper Voice")
  try fm.createDirectory(at:folder,withIntermediateDirectories:true)
  let target=folder.appendingPathComponent(source.lastPathComponent)
  if valid(target,asset){return target}
  let temp=folder.appendingPathComponent(".paper-voice-"+UUID().uuidString)
  defer{try? fm.removeItem(at:temp)}
  try fm.copyItem(at:source,to:temp)
  if fm.fileExists(atPath:target.path){_ = try fm.replaceItemAt(target,withItemAt:temp)}else{try fm.moveItem(at:temp,to:target)}
  return target
 }
 func install(_ root:URL,_ cache:URL,_ pointer:URL,pluginOnly:Bool=false)throws->URL{
  try fm.createDirectory(at:cache,withIntermediateDirectories:true)
  let plugin=config["plugin"] as! [String:Any];progress?("plugin",0);let cached=try fetch(plugin,cache,"plugin",0,(plugin["bytes"] as! NSNumber).doubleValue);let xpi=try exportPlugin(cached,plugin);progress?("pluginDone",1)
  if pluginOnly{return xpi}
  guard root.lastPathComponent=="paper-voice-engine" else{throw fail("请选择声音保存文件夹 / Choose a voice folder")}
  try fm.createDirectory(at:root.deletingLastPathComponent(),withIntermediateDirectories:true)
  progress?("verify",0);let reusable=(try? verify(root)) != nil;try check()
  let work=root.deletingLastPathComponent().appendingPathComponent(".paper-voice-setup-"+UUID().uuidString)
  try fm.createDirectory(at:work,withIntermediateDirectories:true);defer{try? fm.removeItem(at:work)}
  if !reusable{
   for a in packages.reversed(){
    let phase=(a["name"] as! String).hasPrefix("runtime") ? "runtime":"voices",archive=work.appendingPathComponent(a["name"] as! String)
    fm.createFile(atPath:archive.path,contents:nil);let out=try FileHandle(forWritingTo:archive);var downloaded:Double=0;let total=(a["bytes"] as! NSNumber).doubleValue
    do{for part in a["parts"] as! [[String:Any]]{let path=try fetch(part,cache,phase,downloaded,total);let input=try FileHandle(forReadingFrom:path);while let bytes=try input.read(upToCount:1024*1024),!bytes.isEmpty{try check();try out.write(contentsOf:bytes)};try input.close();downloaded+=(part["bytes"] as! NSNumber).doubleValue};try out.close()}catch{try? out.close();throw error}
    guard valid(archive,a) else{throw fail("下载校验失败 / Download verification failed")};try check();progress?(phase+"Extract",1)
    try task(URL(fileURLWithPath:"/usr/bin/ditto"),["-x","-k",archive.path,work.path]);try fm.removeItem(at:archive);progress?(phase+"Done",1)
   }
   try verify(work.appendingPathComponent("engine"))
  }else{progress?("reused",1)}
  try check();committing=true;progress?("setup",0)
  let source=reusable ? root:work.appendingPathComponent("engine")
  var args=["-E","-s","-B","-X","utf8",resources.appendingPathComponent("commit_runtime.py").path,"--source",source.path,"--destination",root.path,"--pointer",pointer.path,"--runtime-id",runtime["id"] as! String]
  if reusable{args.append("--reuse")}
  try task(source.appendingPathComponent("python/bin/python3"),args);progress?("ready",1);return xpi
 }
}
if flag("--quiet"){
 do{guard let c=arg("--download-dir"),let d=arg("--destination"),let p=arg("--pointer"),arg("--plugin-dir") != nil else{throw fail("Explicit test directories required")};let e=Engine();if flag("--cancel-test"){e.progress={phase,v in if ["voices","runtime"].contains(phase)&&v>0{e.cancel()}}};print(try e.install(URL(fileURLWithPath:d),URL(fileURLWithPath:c),URL(fileURLWithPath:p),pluginOnly:flag("--plugin-only")).path);exit(0)}catch{fputs(error.localizedDescription+"\n",stderr);exit(1)}
}
let app=NSApplication.shared
let appearance=try! JSONSerialization.jsonObject(with:Data(contentsOf:resources.appendingPathComponent("appearance.json"))) as! [String:Any]
func color(_ key:String)->NSColor{let hex=(appearance["colors"] as! [String:String])[key]!,v=UInt32(hex,radix:16)!;return NSColor(srgbRed:CGFloat((v>>16)&255)/255,green:CGFloat((v>>8)&255)/255,blue:CGFloat(v&255)/255,alpha:1)}
let ink=color("ink"),muted=color("muted"),accent=color("accent"),green=color("success")
let registeredFonts:[CGFont] = ["VoiceSans-Regular","VoiceSans-SemiBold"].map { name in
 let packed=try! Data(contentsOf:resources.appendingPathComponent(name+".ttf.deflate"))
 let data=try! (packed as NSData).decompressed(using:.zlib) as Data
 let cg=CGFont(CGDataProvider(data:data as CFData)!)!
 precondition(CTFontManagerRegisterGraphicsFont(cg,nil),"Bundled font registration failed")
 return cg
}
func font(_ size:CGFloat,_ bold:Bool=false)->NSFont{NSFont(name:bold ? "VoiceSans-SemiBold":"VoiceSans-Regular",size:size)!}
final class VoiceButton:NSButton {
 var primary=false,hover=false
 override func updateTrackingAreas(){super.updateTrackingAreas();for t in trackingAreas{removeTrackingArea(t)};addTrackingArea(NSTrackingArea(rect:bounds,options:[.mouseEnteredAndExited,.activeInKeyWindow],owner:self,userInfo:nil))}
 override func mouseEntered(with event:NSEvent){hover=true;needsDisplay=true}
 override func mouseExited(with event:NSEvent){hover=false;needsDisplay=true}
 override func draw(_ dirtyRect:NSRect){
  let fill = !isEnabled ? color("disabled") : color(primary ? (hover ? "primaryHover":"accent"):(hover ? "hover":"button"))
  fill.setFill();NSBezierPath(roundedRect:bounds,xRadius:9,yRadius:9).fill()
  if window?.firstResponder === self{accent.withAlphaComponent(0.6).setStroke();let ring=NSBezierPath(roundedRect:bounds.insetBy(dx:2,dy:2),xRadius:7,yRadius:7);ring.lineWidth=1;ring.stroke()}
  let style=NSMutableParagraphStyle();style.alignment = .center;style.lineBreakMode = .byTruncatingTail
  let attrs:[NSAttributedString.Key:Any]=[.font:font ?? NSFont.systemFont(ofSize:11),.foregroundColor:!isEnabled ? color("disabledInk"):(primary ? NSColor.white:ink),.paragraphStyle:style]
  let height=(title as NSString).size(withAttributes:attrs).height
  (title as NSString).draw(in:NSRect(x:6,y:(bounds.height-height)/2,width:bounds.width-12,height:height),withAttributes:attrs)
 }
}
final class Track:NSView{var value:Double=0{didSet{needsDisplay=true}};var tint=accent
 override func draw(_ rect:NSRect){color("track").setFill();NSBezierPath(roundedRect:bounds,xRadius:1.5,yRadius:1.5).fill();if value>0{tint.setFill();NSBezierPath(roundedRect:NSRect(x:0,y:0,width:bounds.width*min(1,value),height:3),xRadius:1.5,yRadius:1.5).fill()}}
}
final class UI:NSObject,NSApplicationDelegate,NSWindowDelegate{
 var window:NSWindow!,heading:NSTextField!,intro:NSTextField!,path:NSTextField!,status:NSTextField!,targetLabel:NSTextField!,action:NSButton!,only:NSButton!,browse:NSButton!,cancel:NSButton!,help:NSButton!,languageMenu:NSButton!
 var titles:[NSTextField]=[],details:[NSTextField]=[],bars:[Track]=[],badges:[NSTextField]=[]
 var language=arg("--lang") ?? ((Locale.preferredLanguages.first ?? "").hasPrefix("zh") ? "zh":"en"),working=false,complete=false,root=arg("--preview-path").map{URL(fileURLWithPath:$0)} ?? defaultRoot(),engine:Engine?,xpi:URL?,started=Date(),currentPhase=""
 func t(_ cn:String,_ en:String)->String{language=="zh" ? cn:en}
 func label(_ text:String,_ size:CGFloat,_ bold:Bool,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat)->NSTextField{let l=NSTextField(wrappingLabelWithString:text);l.frame=NSRect(x:x,y:510-y-h,width:w,height:h);l.font=font(size,bold);l.textColor=ink;window.contentView!.addSubview(l);return l}
 func button(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ selector:Selector)->NSButton{let b=VoiceButton(title:"",target:self,action:selector);b.frame=NSRect(x:x,y:510-y-34,width:w,height:34);b.isBordered=false;b.wantsLayer=true;b.layer?.cornerRadius=9;b.layer?.backgroundColor=NSColor.white.cgColor;b.font=font(11,true);window.contentView!.addSubview(b);return b}
 func refresh(){window.title=t("Paper Voice 安装助手","Paper Voice Installer");heading.stringValue=t("让论文，读给你听。","Make room for listening.");intro.stringValue=t("按需下载。装好声音后，日常听读无需联网。","Download once. Listen offline, every day.")
  let names=[t("Zotero 插件","Zotero plugin"),t("声音引擎","Voice engine"),t("多语言声音","Multilingual voices")]
  let descriptions=[t("听读与翻译 · 保存至下载/Paper Voice","Reading & translation · Downloads/Paper Voice"),t("为当前电脑准备本地运行环境","Local runtime for this computer"),t("英语 · 中文 · 日语 · 法语","English · Chinese · Japanese · French")]
  let assets=[config["plugin"] as! [String:Any],packages[1],packages[0]]
  for i in 0..<3{titles[i].stringValue=names[i];details[i].stringValue=descriptions[i];badges[i].stringValue=String(format:"%.1f MB",(assets[i]["bytes"] as! NSNumber).doubleValue/1e6)}
  languageMenu.title=language=="zh" ? "English":"简体中文";targetLabel.stringValue=t("声音位置","Voice folder");path.stringValue=root.path.replacingOccurrences(of:fm.homeDirectoryForCurrentUser.path,with:"~");path.toolTip=root.path;browse.title=t("选择文件夹","Browse");help.title=t("帮助","Help");only.title=t("仅更新插件","Plugin only");cancel.title=t("取消","Cancel");action.title=complete ? t("查看插件文件","Show plugin file"):t("下载并安装","Download & install");status.stringValue=t("已有声音会先检查并复用，不重复下载。","Existing voices are checked and reused.")
 }
 func applicationDidFinishLaunching(_ n:Notification){app.setActivationPolicy(.regular);window=NSWindow(contentRect:NSRect(x:0,y:0,width:640,height:510),styleMask:[.titled,.closable,.miniaturizable],backing:.buffered,defer:false);window.delegate=self;window.appearance=NSAppearance(named:.aqua);window.backgroundColor=color("paper");window.contentView!.wantsLayer=true;window.contentView!.layer?.backgroundColor=window.backgroundColor.cgColor
  _=label("PAPER VOICE  /  FOR ZOTERO",10,true,30,20,440,18);heading=label("",24,true,30,46,490,42);intro=label("",11,false,32,94,540,24);intro.textColor=muted
  let image=NSImageView(frame:NSRect(x:541,y:407,width:72,height:80));image.image=NSImage(contentsOf:resources.appendingPathComponent("mascot.png"));image.imageScaling = .scaleProportionallyUpOrDown;window.contentView!.addSubview(image)
  for i in 0..<3{let y=CGFloat(135+i*70),card=NSView(frame:NSRect(x:30,y:510-y-62,width:580,height:62));card.wantsLayer=true;card.layer?.backgroundColor=NSColor.white.cgColor;card.layer?.cornerRadius=12;card.layer?.borderWidth=1;card.layer?.borderColor=color("line").cgColor;window.contentView!.addSubview(card);let number=label(String(format:"%02d",i+1),11,true,46,y+12,30,20);number.textColor=accent;titles.append(label("",13,true,82,y+8,360,23));let d=label("",11,false,82,y+33,455,20);d.textColor=muted;details.append(d);let badge=label("",10,false,509,y+10,85,20);badge.alignment = .right;badge.textColor=muted;badges.append(badge);let bar=Track(frame:NSRect(x:82,y:510-y-59,width:512,height:3));window.contentView!.addSubview(bar);bars.append(bar)}
  targetLabel=label("",11,true,34,357,85,23);path=label("",12,false,120,356,367,25);path.maximumNumberOfLines=1;path.lineBreakMode = .byTruncatingMiddle;path.textColor=muted;browse=button(493,351,117,#selector(choose));status=label("",11,false,34,394,572,43);status.textColor=muted
  help=button(30,458,52,#selector(openHelp));languageMenu=button(91,458,110,#selector(changeLanguage));
  only=button(301,458,116,#selector(pluginOnly));cancel=button(301,458,116,#selector(cancelWork));cancel.isHidden=true;action=button(425,458,185,#selector(start));(action as! VoiceButton).primary=true;action.contentTintColor = .white;action.keyEquivalent="\r";refresh();window.center();window.makeKeyAndOrderFront(nil);app.activate(ignoringOtherApps:true)
  if flag("--progress-preview") || arg("--preview-state")=="progress"{busy(true);update("pluginDone",1);update("runtimeDone",1);update("voices",0.42)}
  if arg("--preview-state")=="complete"{complete=true;update("pluginDone",1);update("runtimeDone",1);update("voicesDone",1);update("ready",1);action.title=t("查看插件文件","Show plugin file");status.stringValue=t("下一步：Zotero → 工具 → 插件 → 从文件安装，选择「下载/Paper Voice」中的 XPI。","Next: Zotero → Tools → Plugins → Install From File. Choose the XPI in Downloads/Paper Voice.")}
  if arg("--preview-state")=="error"{action.title=t("重试","Retry");status.stringValue=t("下载未完成，请检查网络后重试。已有声音会保留。","Download interrupted. Check your connection and retry. Existing voices are kept.")}
  if let report=arg("--visual-report"){writeVisualReport(report)}
  if let shot=arg("--screenshot"){DispatchQueue.main.asyncAfter(deadline:.now()+0.6){let v=self.window.contentView!,r=v.bitmapImageRepForCachingDisplay(in:v.bounds)!;v.cacheDisplay(in:v.bounds,to:r);try? r.representation(using:.png,properties:[:])?.write(to:URL(fileURLWithPath:shot));self.working=false;app.terminate(nil)}}
 }
 func covered(_ f:NSFont,_ text:String)->Bool{let chars=Array(text.utf16);var glyphs=[CGGlyph](repeating:0,count:chars.count);return CTFontGetGlyphsForCharacters(f as CTFont,chars,&glyphs,chars.count)}
 func writeVisualReport(_ destination:String){
  let probe=appearance["glyphProbe"] as! String
  let fonts=[false,true].map{bold -> [String:Any] in let f=font(12,bold),chars=Array(probe.utf16);var glyphs=[CGGlyph](repeating:0,count:chars.count);let ok=CTFontGetGlyphsForCharacters(f as CTFont,chars,&glyphs,chars.count);return ["name":f.fontName,"probe":probe,"covered":ok]}
  let labels=window.contentView!.subviews.compactMap{$0 as? NSTextField}.map{l -> [String:Any] in ["text":l.stringValue,"font":l.font!.fontName,"size":l.font!.pointSize,"covered":self.covered(l.font!,l.stringValue),"frame":[l.frame.minX,510-l.frame.maxY,l.frame.width,l.frame.height]]}
  let result:[String:Any]=["platform":"macOS","language":language,"state":arg("--preview-state") ?? "idle","fonts":fonts,"labels":labels,"width":640,"height":510]
  try! JSONSerialization.data(withJSONObject:result,options:.prettyPrinted).write(to:URL(fileURLWithPath:destination))
 }
 @objc func changeLanguage(){language=language=="zh" ? "en":"zh";refresh()}
 @objc func choose(){let p=NSOpenPanel();p.canChooseDirectories=true;p.canChooseFiles=false;p.canCreateDirectories=true;p.directoryURL=root.deletingLastPathComponent();if p.runModal() == .OK,let url=p.url{root=url.lastPathComponent=="paper-voice-engine" ? url:url.appendingPathComponent("paper-voice-engine");complete=false;refresh()}}
 @objc func openHelp(){NSWorkspace.shared.open(URL(string:"https://github.com/JunyanKang/paper-voice/blob/main/docs/INSTALL"+(language=="en" ? ".en":"")+".md")!)}
 @objc func cancelWork(){engine?.cancel();cancel.isEnabled=false;status.stringValue=t("正在取消，已下载文件留待重试。","Cancelling. Verified downloads will be kept.")}
 func update(_ phase:String,_ value:Double){if currentPhase != phase{currentPhase=phase;started=Date()};let index=phase.hasPrefix("plugin") ? 0:phase.hasPrefix("runtime") ? 1:2
  if ["plugin","runtime","voices"].contains(phase){bars[index].value=value;let asset=index==0 ? config["plugin"] as! [String:Any]:packages[index==1 ? 1:0],total=(asset["bytes"] as! NSNumber).doubleValue;badges[index].stringValue=String(format:"%.0f%%",value*100);details[index].stringValue=t("下载中","Downloading")+String(format:" · %.1f / %.1f MB",value*total/1e6,total/1e6);status.stringValue=t("下载完成后将校验文件并配置声音。","Files are verified before voice setup.")}
  else if phase.hasSuffix("Done"){bars[index].value=1;bars[index].tint=green;badges[index].stringValue=t("✓ 已下载","✓ Ready");details[index].stringValue=t("文件已校验","Download verified")}
  else if phase.hasSuffix("Extract"){details[index].stringValue=t("正在解压…","Unpacking…")}
  else if phase=="verify"{status.stringValue=t("正在检查声音文件…","Checking voice files…")+String(format:" %.0f%%",value*100)}
  else if phase=="reused"{for i in 1...2{bars[i].value=1;bars[i].tint=green;badges[i].stringValue=t("✓ 已有","✓ Found");details[i].stringValue=t("已校验，跳过下载","Verified · No download needed")}}
  else if phase=="setup"{cancel.isEnabled=false;status.stringValue=t("正在验证声音可用性并完成安装…","Checking voices and finishing setup…")}
  else if phase=="ready"{for i in 1...2{badges[i].stringValue=t("✓ 已就绪","✓ Ready");details[i].stringValue=t("声音已安装，可以离线听读","Installed · Ready for offline listening")}}
 }
 func busy(_ b:Bool){working=b;action.isEnabled = !b;only.isEnabled = !b;browse.isEnabled = !b;languageMenu.isEnabled = !b;cancel.isHidden = !b;only.isHidden=b;cancel.isEnabled=true}
 @objc func pluginOnly(){run(true)}
 @objc func start(){if complete,let file=xpi{NSWorkspace.shared.activateFileViewerSelecting([file]);return};run(false)}
 func run(_ pluginOnly:Bool){busy(true);complete=false;let e=Engine();engine=e;e.progress={[weak self] p,v in DispatchQueue.main.async{self?.update(p,v)}};let destination=root,cache=fm.urls(for:.cachesDirectory,in:.userDomainMask)[0].appendingPathComponent("PaperVoiceInstaller"),pointer=location
  DispatchQueue.global(qos:.userInitiated).async{let result=Result{try e.install(destination,cache,pointer,pluginOnly:pluginOnly)};DispatchQueue.main.async{self.busy(false);switch result{case .success(let file):self.xpi=file;self.complete=true;self.action.title=self.t("查看插件文件","Show plugin file");self.status.stringValue=self.t("下一步：Zotero → 工具 → 插件 → 从文件安装，选择「下载/Paper Voice」中的 XPI。","Next: Zotero → Tools → Plugins → Install From File. Choose the XPI in Downloads/Paper Voice.");case .failure(let error):self.action.title=self.t("重试","Retry");self.status.stringValue=e.cancelled ? self.t("已取消。原有声音保留，可继续下载。","Cancelled. Existing voices kept; retry to continue."):self.t("未完成：","Not completed: ")+error.localizedDescription;self.status.toolTip=error.localizedDescription};self.engine=nil}}
 }
 func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply{working ? .terminateCancel:.terminateNow}
 func windowShouldClose(_ sender:NSWindow)->Bool{!working}
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{true}
}
let ui=UI();app.delegate=ui;app.run()
