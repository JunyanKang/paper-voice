import Cocoa

let app = NSApplication.shared
let resources = Bundle.main.resourceURL!
let isQuiet = CommandLine.arguments.contains("--quiet")

func install() -> (Int32, String) {
    let python = resources.appendingPathComponent("engine/python/bin/python3")
    let script = resources.appendingPathComponent("install_engine.py")
    guard FileManager.default.fileExists(atPath: python.path), FileManager.default.fileExists(atPath: script.path) else {
        return (1, "安装文件不完整，请重新下载并完整解压安装包。")
    }
    let task = Process(), pipe = Pipe()
    task.executableURL = python
    task.arguments = ["-E", "-s", "-B", "-X", "utf8", script.path]
    task.environment = ["HOME": ProcessInfo.processInfo.environment["HOME"] ?? NSHomeDirectory(), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin", "LANG": "en_US.UTF-8"]
    task.standardOutput = pipe; task.standardError = pipe
    do {
        try task.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    } catch { return (1, "无法启动安装：\(error.localizedDescription)") }
}

if isQuiet {
    let result = install()
    print(result.1)
    exit(result.0)
}

final class InstallerDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var status: NSTextField!
    var action: NSButton!
    var progress: NSProgressIndicator!
    var working = false
    var complete = false

    func text(_ value: String, _ size: CGFloat, _ weight: NSFont.Weight, _ frame: NSRect, color: NSColor = .labelColor) -> NSTextField {
        let label = NSTextField(wrappingLabelWithString: value)
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color; label.frame = frame
        window.contentView!.addSubview(label)
        return label
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        app.setActivationPolicy(.regular)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 600, height: 440), styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "Paper Voice 安装助手"; window.delegate = self
        window.appearance = NSAppearance(named: .aqua)
        window.backgroundColor = NSColor(calibratedRed: 0.975, green: 0.97, blue: 0.95, alpha: 1)
        let image = NSImageView(frame: NSRect(x: 425, y: 225, width: 140, height: 165))
        image.image = NSImage(contentsOf: resources.appendingPathComponent("mascot.png")); image.imageScaling = .scaleProportionallyUpOrDown
        window.contentView!.addSubview(image)
        let teal = NSColor(calibratedRed: 0.07, green: 0.25, blue: 0.28, alpha: 1)
        _ = text("PAPER VOICE  /  FOR ZOTERO", 11, .semibold, NSRect(x: 40, y: 373, width: 380, height: 18), color: teal)
        _ = text("让论文，读给你听。", 29, .semibold, NSRect(x: 40, y: 302, width: 390, height: 48), color: teal)
        _ = text("自然声音，本地运行。\n为你的 Zotero 准备好六种英文声音。", 15, .regular, NSRect(x: 40, y: 235, width: 380, height: 56), color: .secondaryLabelColor)
        _ = text("01  安装离线声音", 16, .semibold, NSRect(x: 40, y: 188, width: 510, height: 25))
        _ = text("02  在 Zotero 中添加同一下载包里的 .xpi 插件", 14, .regular, NSRect(x: 40, y: 155, width: 520, height: 24), color: .secondaryLabelColor)
        status = text("无需账户，无需联网下载，不需要管理员密码。", 12, .regular, NSRect(x: 40, y: 95, width: 520, height: 43), color: .secondaryLabelColor)
        progress = NSProgressIndicator(frame: NSRect(x: 40, y: 73, width: 520, height: 5))
        progress.style = .bar; progress.isIndeterminate = true; progress.isHidden = true
        window.contentView!.addSubview(progress)
        action = NSButton(title: "安装声音", target: self, action: #selector(start))
        action.bezelStyle = .rounded; action.controlSize = .large
        action.frame = NSRect(x: 407, y: 23, width: 155, height: 38)
        action.keyEquivalent = "\r"; action.contentTintColor = teal
        window.contentView!.addSubview(action)
        let help = NSButton(title: "安装帮助", target: self, action: #selector(helpPage))
        help.bezelStyle = .inline; help.frame = NSRect(x: 34, y: 31, width: 80, height: 24)
        window.contentView!.addSubview(help)
        window.center(); window.makeKeyAndOrderFront(nil); app.activate(ignoringOtherApps: true)
    }
    @objc func start() {
        if complete { app.terminate(nil); return }
        working = true; action.isEnabled = false; action.title = "正在安装…"
        status.stringValue = "正在配置本地声音，请稍候。你的文献和批注不会改变。"
        progress.isHidden = false; progress.startAnimation(nil)
        DispatchQueue.global(qos: .userInitiated).async {
            let result = install()
            DispatchQueue.main.async {
                self.working = false; self.progress.stopAnimation(nil); self.progress.isHidden = true; self.action.isEnabled = true
                if result.0 == 0 {
                    self.complete = true; self.action.title = "完成"
                    self.status.stringValue = "声音已就绪。打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装，选择下载包里的 .xpi 文件。"
                } else {
                    self.action.title = "重试安装"; self.status.stringValue = "安装未完成，原有声音保持不变。请查看错误详情。"
                    let alert = NSAlert(); alert.messageText = "暂时无法完成安装"
                    alert.informativeText = String(result.1.suffix(2200)); alert.alertStyle = .warning
                    alert.addButton(withTitle: "好"); alert.beginSheetModal(for: self.window)
                }
            }
        }
    }
    @objc func helpPage() { NSWorkspace.shared.open(URL(string: "https://github.com/JunyanKang/paper-voice/blob/main/docs/INSTALL.md")!) }
    func windowShouldClose(_ sender: NSWindow) -> Bool { return !working }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply { return working ? .terminateCancel : .terminateNow }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { return true }
}
let delegate = InstallerDelegate()
app.delegate = delegate
app.run()
