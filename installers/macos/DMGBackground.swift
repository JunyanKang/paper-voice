// Render the Finder help background with native fonts, at 1x and Retina resolution.
import AppKit

let width = 760, height = 640
let destination = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let ink = NSColor(srgbRed: 0.15, green: 0.20, blue: 0.24, alpha: 1)
let secondary = NSColor(srgbRed: 0.37, green: 0.41, blue: 0.45, alpha: 1)
let accent = NSColor(srgbRed: 0.14, green: 0.36, blue: 0.52, alpha: 1)

for scale in [1, 2] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width * scale,
        pixelsHigh: height * scale, bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: width, height: height)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    // NSBitmapImageRep.size already supplies the Retina scale to AppKit.
    NSColor(srgbRed: 0.96, green: 0.97, blue: 0.97, alpha: 1).setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()

    func text(_ value: String, _ x: CGFloat, _ top: CGFloat, _ w: CGFloat,
              _ h: CGFloat, _ size: CGFloat, _ color: NSColor = ink,
              _ weight: NSFont.Weight = .regular, _ center: Bool = false) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = center ? .center : .left
        paragraph.lineBreakMode = .byWordWrapping
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: color, .paragraphStyle: paragraph
        ]
        let string = value as NSString
        let measured = string.boundingRect(with: NSSize(width: w, height: 1000),
            options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
        precondition(measured.height <= h + 1, "Background text exceeds its space: \(value)")
        string.draw(with: NSRect(x: x, y: CGFloat(height) - top - h, width: w, height: h),
            options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
    }

    text("Paper Voice", 36, 24, 688, 38, 29, ink, .semibold, true)
    text("安装助手  /  Installation assistant", 36, 67, 688, 23, 15, secondary, .regular, true)
    // Finder places the actual, clickable app icon in this open space.
    text("双击上方图标开始 · Double-click the icon to begin", 36, 223, 688, 24, 15, secondary, .regular, true)

    NSColor.white.withAlphaComponent(0.85).setFill()
    NSBezierPath(roundedRect: NSRect(x: 26, y: 79, width: 708, height: 299),
        xRadius: 18, yRadius: 18).fill()
    text("首次打开被阻止？ / First launch blocked?", 46, 281, 668, 25, 18, ink, .semibold)
    text("若提示“无法验证开发者”或“Apple 无法检查是否包含恶意软件”：", 46, 315, 668, 21, 14, secondary)
    text("For “unidentified developer” or “Apple cannot check it for malicious software”:", 46, 338, 668, 21, 14, secondary)

    func step(_ number: String, _ top: CGFloat, _ chinese: String, _ english: String) {
        text(number, 47, top + 3, 24, 25, 17, accent, .semibold)
        text(chinese, 79, top, 632, 23, 15, ink, .medium)
        text(english, 79, top + 24, 632, 23, 14, secondary)
    }
    step("1", 377, "先尝试打开 App，再打开 系统设置 → 隐私与安全性。",
         "Try opening the app first. Then open System Settings → Privacy & Security.")
    step("2", 435, "向下找到 Paper Voice 的拦截提示，点击“仍要打开”。",
         "Scroll to the Paper Voice notice and click Open Anyway.")
    step("3", 493, "再次确认“打开”，按提示输入密码或使用 Touch ID。",
         "Confirm Open, then authenticate with your password or Touch ID if asked.")

    text("仅对从官方发布页下载的安装器执行以上操作。", 36, 576, 688, 20, 12, secondary, .regular, true)
    text("Only allow the installer downloaded from the official release page.", 36, 595, 688, 19, 12, secondary, .regular, true)
    text("github.com/JunyanKang/paper-voice/releases", 24, 620, 712, 18, 10.5, secondary, .regular, true)
    NSGraphicsContext.restoreGraphicsState()
    let name = scale == 1 ? "dmg-background.png" : "dmg-background@2x.png"
    try bitmap.representation(using: .png, properties: [:])!.write(to: destination.appendingPathComponent(name))
}
