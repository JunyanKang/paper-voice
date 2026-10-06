import Cocoa
import CryptoKit
import Darwin

struct ZoteroProfile {
 let name:String
 let path:URL
}
enum ZoteroInstall {
 static let addonID="paper-voice@local.research"
 static let bundleIDs=["org.zotero.zotero","org.zotero.zotero-beta"]
 static let files=FileManager.default
 static var profileBase:URL {files.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Zotero")}
 static func error(_ text:String)->NSError{NSError(domain:"PaperVoice.Zotero",code:1,userInfo:[NSLocalizedDescriptionKey:text])}
 static func ini(_ file:URL)->[[String:String]] {
  guard let text=try? String(contentsOf:file,encoding:.utf8) else{return []}
  var rows=[[String:String]](),row=[String:String]()
  for raw in text.replacingOccurrences(of:"\u{feff}",with:"").components(separatedBy:.newlines){
   let line=raw.trimmingCharacters(in:.whitespaces)
   if line.hasPrefix(";") || line.hasPrefix("#") || line.isEmpty{continue}
   if line.hasPrefix("[") && line.hasSuffix("]"){if !row.isEmpty{rows.append(row)};row=["section":String(line.dropFirst().dropLast())]}
   else if let eq=line.firstIndex(of:"="){row[String(line[..<eq]).trimmingCharacters(in:.whitespaces)]=String(line[line.index(after:eq)...]).trimmingCharacters(in:.whitespaces)}
  }
  if !row.isEmpty{rows.append(row)};return rows
 }
 static func validProfile(_ url:URL)->Bool {
  var directory:ObjCBool=false
  return files.fileExists(atPath:url.path,isDirectory:&directory) && directory.boolValue && ["prefs.js","times.json"].contains{files.fileExists(atPath:url.appendingPathComponent($0).path)}
 }
 static func profiles(_ base:URL)->[ZoteroProfile] {
  var seen=Set<String>();return ini(base.appendingPathComponent("profiles.ini")).compactMap{row in
   guard row["section"]?.hasPrefix("Profile")==true,let path=row["Path"],!path.isEmpty else{return nil}
   let relative=row["IsRelative"]=="1"
   guard relative || path.hasPrefix("/") else{return nil}
   let url=(relative ? base.appendingPathComponent(path):URL(fileURLWithPath:path)).standardizedFileURL.resolvingSymlinksInPath()
   guard validProfile(url),seen.insert(url.path).inserted else{return nil}
   return ZoteroProfile(name:row["Name"] ?? url.lastPathComponent,path:url)
  }
 }
 static func validApp(_ url:URL)->Bool {
  guard let bundle=Bundle(url:url),bundleIDs.contains(bundle.bundleIdentifier ?? ""),let executable=bundle.executableURL,files.isExecutableFile(atPath:executable.path) else{return false}
  let version=bundle.object(forInfoDictionaryKey:"CFBundleShortVersionString") as? String ?? ""
  return version.split(separator:".").first=="10"
 }
 static func applications()->[URL] {
  var found=NSWorkspace.shared.runningApplications.filter{bundleIDs.contains($0.bundleIdentifier ?? "")}.compactMap{$0.bundleURL}
  found+=bundleIDs.compactMap{NSWorkspace.shared.urlForApplication(withBundleIdentifier:$0)}
  for base in [URL(fileURLWithPath:"/Applications"),files.homeDirectoryForCurrentUser.appendingPathComponent("Applications")]{for name in ["Zotero.app","Zotero Beta.app"]{found.append(base.appendingPathComponent(name))}}
  var seen=Set<String>();return found.filter{validApp($0) && seen.insert($0.standardizedFileURL.path).inserted}
 }
 static func running()->Bool{NSWorkspace.shared.runningApplications.contains{bundleIDs.contains($0.bundleIdentifier ?? "")}}
 static func hash(_ file:URL)throws->String {SHA256.hash(data:try Data(contentsOf:file,options:.mappedIfSafe)).map{String(format:"%02x",$0)}.joined()}
 static func regular(_ file:URL)throws {
  if let values=try? file.resourceValues(forKeys:[.isSymbolicLinkKey]),values.isSymbolicLink==true{throw error("目录包含链接，请手动安装 / Linked directory: install manually")}
 }
 static func status(_ profile:URL,_ version:String,_ digest:String)->String {
  let target=profile.appendingPathComponent("extensions/"+addonID+".xpi")
  guard (try? hash(target))==digest else{return "missing"}
  guard let data=try? Data(contentsOf:profile.appendingPathComponent("extensions.json")),let db=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],let addons=db["addons"] as? [[String:Any]],let addon=addons.first(where:{$0["id"] as? String==addonID}),addon["version"] as? String==version else{return "pending"}
  if addon["appDisabled"] as? Bool==true{return "incompatible"}
  if addon["userDisabled"] as? Bool==true || addon["softDisabled"] as? Bool==true{return "disabled"}
  return addon["active"] as? Bool==true ? "installed":"pending"
 }
 static func stage(_ xpi:URL,_ profile:URL,_ version:String,_ digest:String,_ backups:URL)throws->String {
  guard validProfile(profile) else{throw error("请选择 Zotero 配置目录 / Choose a Zotero profile")}
  guard try hash(xpi)==digest else{throw error("插件校验失败 / Plugin verification failed")}
  let lockURL=profile.appendingPathComponent(".parentlock");try regular(lockURL)
  let fd=open(lockURL.path,O_RDWR|O_CREAT|O_NOFOLLOW,0o600)
  guard fd>=0 else{throw error("无法访问配置目录 / Cannot access profile")};defer{close(fd)}
  var lock=flock();lock.l_type=Int16(F_WRLCK);lock.l_whence=Int16(SEEK_SET);lock.l_start=0;lock.l_len=0
  guard fcntl(fd,F_SETLK,&lock)==0 else{throw error("请先退出 Zotero，再继续 / Quit Zotero, then continue")}
  let extensions=profile.appendingPathComponent("extensions");try regular(extensions)
  try files.createDirectory(at:extensions,withIntermediateDirectories:true)
  let target=extensions.appendingPathComponent(addonID+".xpi");try regular(target)
  guard !files.fileExists(atPath:extensions.appendingPathComponent(addonID).path) else{throw error("检测到开发版插件，请手动安装 / Development copy found: install manually")}
  if files.fileExists(atPath:target.path) {
   if try hash(target)==digest{return status(profile,version,digest)}
   if let data=try? Data(contentsOf:profile.appendingPathComponent("extensions.json")),let db=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],let addons=db["addons"] as? [[String:Any]],let addon=addons.first(where:{$0["id"] as? String==addonID}),let installed=addon["version"] as? String,installed.compare(version,options:.numeric) == .orderedDescending{throw error("已安装更新版本 / A newer version is installed")}
   try files.createDirectory(at:backups,withIntermediateDirectories:true)
   let backup=backups.appendingPathComponent(UUID().uuidString+".xpi");try files.copyItem(at:target,to:backup)
   guard try hash(backup)==hash(target) else{throw error("备份校验失败 / Backup verification failed")}
  }
  let temp=extensions.appendingPathComponent(".paper-voice-"+UUID().uuidString);defer{try? files.removeItem(at:temp)}
  try files.copyItem(at:xpi,to:temp)
  guard try hash(temp)==digest else{throw error("插件校验失败 / Plugin verification failed")}
  // Zotero may otherwise reuse cached manifest/version data after an offline update.
  let startup=profile.appendingPathComponent("addonStartup.json.lz4");try regular(startup)
  if files.fileExists(atPath:startup.path){try files.createDirectory(at:backups,withIntermediateDirectories:true);try files.copyItem(at:startup,to:backups.appendingPathComponent(UUID().uuidString+"-addonStartup.json.lz4"));try files.removeItem(at:startup)}
  // rename is atomic on the same volume; unrelated profile metadata is untouched.
  guard rename(temp.path,target.path)==0 else{throw error("无法写入插件 / Cannot write plugin")}
  guard try hash(target)==digest else{throw error("插件校验失败 / Plugin verification failed")}
  return "pending"
 }
 static func launch(_ application:URL,_ profile:URL)throws {
  guard validApp(application),validProfile(profile) else{throw error("未找到 Zotero 10 / Zotero 10 not found")}
  let p=Process();p.executableURL=Bundle(url:application)!.executableURL;p.arguments=["-profile",profile.path];try p.run()
 }
}
