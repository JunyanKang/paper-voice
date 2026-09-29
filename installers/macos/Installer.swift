import Cocoa

let app = NSApplication.shared
let resources = Bundle.main.resourceURL!
let isQuiet = CommandLine.arguments.contains("--quiet")

func install(_ language: String) -> (Int32, String) {
    let english = language == "en"
    let python = resources.appendingPathComponent("engine/python/bin/python3")
    let script = resources.appendingPathComponent("install_engine.py")
    guard FileManager.default.fileExists(atPath: python.path), FileManager.default.fileExists(atPath: script.path) else {
        return (1, english ? "Installation files are missing. Download and extract the complete ZIP again." : "安装文件不完整，请重新下载并完整解压安装包。")
    }
    let task = Process(), pipe = Pipe()
    task.executableURL = python
    task.arguments = ["-E", "-s", "-B", "-X", "utf8", script.path, "--lang", language]
    task.environment = ["HOME": ProcessInfo.processInfo.environment["HOME"] ?? NSHomeDirectory(), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin", "LANG": "en_US.UTF-8"]
    task.standardOutput = pipe; task.standardError = pipe
    do {
        try task.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        task.waitUntilExit()
        return (task.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    } catch { return (1, (english ? "Unable to start installation: " : "无法启动安装：") + error.localizedDescription) }
}

if isQuiet {
    let result = install(CommandLine.arguments.contains("--english") ? "en" : "zh")
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
    var language = (Locale.preferredLanguages.first ?? "en").hasPrefix("zh") ? "zh" : "en"
    var titleLabel: NSTextField!, descriptionLabel: NSTextField!, stepOne: NSTextField!, stepTwo: NSTextField!, readyLabel: NSTextField!
    var help: NSButton!, languageMenu: NSPopUpButton!
    func tr(_ zh: String, _ en: String) -> String { language == "zh" ? zh : en }
    func refreshLanguage() {
        window.title = tr("Paper Voice 安装助手", "Paper Voice Installer")
        titleLabel.stringValue = tr("让论文，读给你听。", "Listen. Understand. Explore.")
        titleLabel.font = .systemFont(ofSize: language == "zh" ? 29 : 23, weight: .semibold)
        descriptionLabel.stringValue = tr("自然声音，本地运行。\n英语、中文、日语、法语，随时听读。", "Natural voices. Right on your computer.\nEnglish, Chinese, Japanese and French.")
        stepOne.stringValue = tr("01  安装离线声音", "01  Set up offline voices")
        stepTwo.stringValue = tr("02  在 Zotero 中添加同一下载包里的 .xpi 插件", "02  Add the included .xpi plugin to Zotero")
        readyLabel.stringValue = tr("✓ 声音已就绪", "✓ Voices ready")
        readyLabel.isHidden = !complete
        stepTwo.textColor = complete ? NSColor(calibratedRed: 0.07, green: 0.25, blue: 0.28, alpha: 1) : .secondaryLabelColor
        stepTwo.font = .systemFont(ofSize: 14, weight: complete ? .semibold : .regular)
        help.title = tr("安装帮助", "Help")
        action.title = complete ? tr("完成", "Done") : tr("安装声音", "Install voices")
        status.stringValue = complete ? tr("下一步：打开 Zotero → 工具 → 插件 → 齿轮 → 从文件安装，选择下载包里的 .xpi 文件。", "Next: In Zotero, open Tools → Plugins → gear → Install Plugin From File, then choose the included .xpi.") : tr("无需账户，无需联网下载，不需要管理员密码。", "No account, extra downloads or administrator password needed.")
    }
    @objc func changeLanguage() {
        language = languageMenu.indexOfSelectedItem == 0 ? "zh" : "en"
        refreshLanguage()
    }

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
        titleLabel = text("让论文，读给你听。", 29, .semibold, NSRect(x: 40, y: 302, width: 390, height: 48), color: teal)
        descriptionLabel = text("自然声音，本地运行。\n英语、中文、日语、法语，随时听读。", 15, .regular, NSRect(x: 40, y: 235, width: 380, height: 56), color: .secondaryLabelColor)
        stepOne = text("01  安装离线声音", 16, .semibold, NSRect(x: 40, y: 188, width: 510, height: 25))
        readyLabel = text("", 12, .medium, NSRect(x: 295, y: 190, width: 265, height: 22), color: NSColor(calibratedRed: 0.18, green: 0.43, blue: 0.32, alpha: 1))
        readyLabel.isHidden = true
        stepTwo = text("02  在 Zotero 中添加同一下载包里的 .xpi 插件", 14, .regular, NSRect(x: 40, y: 155, width: 520, height: 24), color: .secondaryLabelColor)
        status = text("无需账户，无需联网下载，不需要管理员密码。", 12, .regular, NSRect(x: 40, y: 95, width: 520, height: 43), color: .secondaryLabelColor)
        progress = NSProgressIndicator(frame: NSRect(x: 40, y: 73, width: 520, height: 5))
        progress.style = .bar; progress.isIndeterminate = true; progress.isHidden = true
        window.contentView!.addSubview(progress)
        action = NSButton(title: "安装声音", target: self, action: #selector(start))
        action.bezelStyle = .rounded; action.controlSize = .large
        action.frame = NSRect(x: 407, y: 23, width: 155, height: 38)
        action.keyEquivalent = "\r"; action.contentTintColor = teal
        window.contentView!.addSubview(action)
        help = NSButton(title: "安装帮助", target: self, action: #selector(helpPage))
        help.bezelStyle = .inline; help.frame = NSRect(x: 34, y: 31, width: 80, height: 24)
        window.contentView!.addSubview(help)
        languageMenu = NSPopUpButton(frame: NSRect(x: 133, y: 30, width: 126, height: 27), pullsDown: false)
        languageMenu.addItems(withTitles: ["简体中文", "English"])
        languageMenu.selectItem(at: language == "zh" ? 0 : 1)
        languageMenu.target = self; languageMenu.action = #selector(changeLanguage)
        languageMenu.setAccessibilityLabel("Language / 语言")
        window.contentView!.addSubview(languageMenu)
        refreshLanguage()
        window.center(); window.makeKeyAndOrderFront(nil); app.activate(ignoringOtherApps: true)
    }
    @objc func start() {
        if complete { app.terminate(nil); return }
        working = true; action.isEnabled = false; languageMenu.isEnabled = false; action.title = tr("正在安装…", "Installing…")
        status.stringValue = tr("正在配置本地声音，请稍候。你的文献和批注不会改变。", "Setting up voices. Your papers and annotations stay unchanged.")
        progress.isHidden = false; progress.startAnimation(nil)
        let selectedLanguage = language
        DispatchQueue.global(qos: .userInitiated).async {
            let result = install(selectedLanguage)
            DispatchQueue.main.async {
                self.working = false; self.progress.stopAnimation(nil); self.progress.isHidden = true; self.action.isEnabled = true; self.languageMenu.isEnabled = true
                if result.0 == 0 {
                    self.complete = true; self.refreshLanguage()
                } else {
                    self.action.title = self.tr("重试安装", "Try again"); self.status.stringValue = self.tr("安装未完成，原有声音保持不变。请查看错误详情。", "Installation did not finish. Your existing voices are unchanged.")
                    let alert = NSAlert(); alert.messageText = self.tr("暂时无法完成安装", "Unable to complete installation")
                    alert.informativeText = String(result.1.suffix(2200)); alert.alertStyle = .warning
                    alert.addButton(withTitle: self.tr("好", "OK")); alert.beginSheetModal(for: self.window)
                }
            }
        }
    }
    @objc func helpPage() { NSWorkspace.shared.open(URL(string: "https://github.com/JunyanKang/paper-voice/blob/main/docs/" + (language == "en" ? "INSTALL.en.md" : "INSTALL.md"))!) }
    func windowShouldClose(_ sender: NSWindow) -> Bool { return !working }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply { return working ? .terminateCancel : .terminateNow }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { return true }
}
let delegate = InstallerDelegate()
app.delegate = delegate
app.run()
