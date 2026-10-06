import Cocoa

// Render at 2x; Finder displays this at 720 x 520 points.
let width = 720, height = 520
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width * 2,
    pixelsHigh: height * 2, bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)!
bitmap.size = NSSize(width: width, height: height)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
let context = NSGraphicsContext.current!.cgContext
context.translateBy(x: 0, y: CGFloat(height))
context.scaleBy(x: 1, y: -1)
NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
let ink = NSColor(srgbRed: 0.12, green: 0.20, blue: 0.29, alpha: 1)
let muted = NSColor(srgbRed: 0.35, green: 0.42, blue: 0.49, alpha: 1)
let accent = NSColor(srgbRed: 0.10, green: 0.36, blue: 0.54, alpha: 1)
NSGradient(starting: NSColor(srgbRed: 0.93, green: 0.97, blue: 0.99, alpha: 1),
    ending: NSColor(srgbRed: 0.99, green: 0.98, blue: 0.96, alpha: 1))!
    .draw(in: NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)), angle: 80)
func line(_ text: String, _ y: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight = .regular,
          _ color: NSColor = ink) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    (text as NSString).draw(in: NSRect(x: 30, y: y, width: 660, height: size * 1.7),
        withAttributes: [.font: NSFont.systemFont(ofSize: size, weight: weight),
                         .foregroundColor: color, .paragraphStyle: paragraph])
}
line("Paper Voice", 28, 29, .semibold)
line("双击安装助手，开始听读论文", 72, 15, .medium)
line("Double-click the installer to get started", 97, 13, .regular, muted)
// The real app icon and its Finder label occupy the space between 140 and 254.
let card = NSBezierPath(roundedRect: NSRect(x: 24, y: 272, width: 672, height: 224), xRadius: 20, yRadius: 20)
NSColor.white.withAlphaComponent(0.76).setFill(); card.fill()
NSColor(srgbRed: 0.70, green: 0.78, blue: 0.83, alpha: 0.42).setStroke()
card.lineWidth = 1; card.stroke()
line("若 macOS 阻止打开，请先尝试打开一次，再前往", 290, 14)
line("系统设置 → 隐私与安全性 → 仍要打开", 317, 17, .semibold, accent)
line("仅在确认安装器来自 Paper Voice 官方发布页时允许运行。", 350, 13, .medium)
line("If macOS blocks the installer, first try opening it once. Then go to", 387, 12, .regular, muted)
line("System Settings → Privacy & Security → Open Anyway", 410, 14, .semibold, accent)
line("Allow only after verifying it came from the official Paper Voice release page.", 438, 12, .regular, muted)
line("github.com/JunyanKang/paper-voice/releases", 467, 12, .medium, accent)
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
