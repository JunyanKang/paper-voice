# Paper Voice · 论文听读

面向英文论文阅读的 Zotero 插件：拖选即读、全文连读、段落循环、单句精听和多语言跟读译文。

## 交付与安装

提供 **Windows x64** 与 **Apple Silicon Mac（M 系列，macOS 14+）** 两个完整安装包，插件面向 **Zotero 10**。请在 [Releases](https://github.com/JunyanKang/paper-voice/releases/latest) 选择对应平台。已装语音包的用户只需更新 `.xpi`。

1. 完整解压下载的 ZIP，保留「资源」文件夹。
2. 双击「安装语音包.cmd」（Windows）或「安装语音包.command」（Mac）。安装语音包不需要管理员密码，不联网下载，不要求预装 Python。Windows 如提示缺少 DLL，可先运行「资源/VC_redist.x64.exe」安装微软运行库。
3. Zotero → 工具（Tools）→ 插件（Plugins）→ 齿轮 → Install Plugin From File，选择 `paper-voice-1.1.0.xpi`。
4. 打开 PDF。右下角出现书页精灵；点击它展开控制面板。

语音包安装到 Mac 的 `~/Library/Application Support/Zotero/paper-voice-engine`，或 Windows 的 `%APPDATA%\Zotero\Zotero\paper-voice-engine`。安装器保留已有版本的带日期备份，不修改文献数据库、PDF 或批注。Windows 原生测试环境为 Server 2022 x64，使用静音媒体解码与计时，实体扬声器输出尚未实测。Intel Mac、Windows ARM 与旧版 Zotero 尚未验证。

## 使用方式

- **划选即读**：鼠标拖选英文，松开约 0.28 秒后开始。只保留最新选区，旧音频立即停止。仅将鼠标悬停在文字上不会朗读。
- **全文连读**：可选择从第 1 页、当前页或上次进度开始，自动连续翻页。“上次进度”采用这篇 PDF 最近一次实际播放的位置，包含划选、段落和单句模式；普通点击、滚动与另选文字不会打断连读。包括 PDF 中可提取的标题、正文、图注、参考文献；空白/扫描页会跳过并提示。
- **段落循环**：划选所需段落，选择持续循环或 2/3/5 次。循环使用同一语音缓存，不反复生成。
- **单句精听**：划选一段文字，当前句反复播放；左右按钮切换上一句/下一句。次数同样可设。
- **播放控制**：顶部大按钮负责播放/暂停/继续；方形按钮停止。`Esc` 停止，`Option/Alt + P` 暂停/继续，`Option/Alt + T` 切换译文。
- **收起与移动**：点击右上角 × 收起。悬浮精灵没有白色圆底，可拖动；就绪与朗读使用不同表情，朗读时轻微律动，暂停时静止，也遵循系统减少动态效果设置。朗读时旁边显示紧凑的暂停、停止和译文开关，不会自动打开设置面板。
- **逐句高亮**：正在朗读的整句显示柔和背景色，暂停保留，停止或完成后清除；无需开启翻译，不会生成永久批注。
- **跳过引文**：过滤常见数字方括号、作者年份和可识别的上标引用。纯数字方括号（含 `[0, 1]`）统一不读；原文和高亮保持完整。
- **声音与翻译**：点击右上角设置图标，可设置六个自然声音、0.60–1.60× 语速、自动朗读和多语言译文。

## 六个免费离线声音

| 口音 | 女声 | 男声 |
|---|---|---|
| 美音 | Heart、Bella | Michael、Fenrir |
| 英音 | Emma | George |

使用 Kokoro-82M 本地自然语音模型。无需订阅、云语音额度或 API 密钥。属于自然语音合成，并非真人逐字录音；声音偏好可先用“试听声音”比较。英文科学缩写、基因名、公式和少见专有名词可能需要人工核对。

## 跟读翻译与大陆使用

“多语言跟读译文”默认关闭，开启后将当前句和预取的下一句发送至所选服务：

- **腾讯免费翻译（默认）**：腾讯交互翻译公共通道，优先照顾大陆用户。
- **微软免费翻译**：Microsoft Edge 公共翻译通道。
- **Google 免费翻译**：供海外或网络可达的用户选用。
- **译文语言**：简体中文、繁體中文、日本語、한국어、Français、Deutsch、Español、Русский。腾讯通道暂不支持繁体中文，请选择微软或 Google。
- 如果安装了 **Translate for Zotero**，优先调用其公开 `api.translate` 接口，明确选择上述免费服务；没有该插件时使用独立适配器。
- 不调用付费模型，不读取/保存 API 密钥，不自动降级到收费服务。
- 直连测试禁用了请求层代理；两条通道均返回中文。不需要依赖 Google、OpenAI 或翻墙服务。免费公共网站接口可能限流或调整，不能保证所有运营商、校园网及未来时点持续可用。
- 翻译失败会保留英文朗读并显示提示；可手动切换腾讯/微软/Google。译文只在会话内缓存，不写入 PDF 或文献元数据。

译文跟随当前句。有可验证的完整空白区域时，浮在英文句子下方；行距密集、双栏排版或可能遮盖图文时，自动在阅读区底部让出独立字幕区，英文在上、中文在下，正文视口相应缩小。不会在原 PDF 上插入或覆盖内容。专业术语及复杂限定关系仍需以英文为准，不能把机器译文当作经人工审校的出版译稿。

## 已知边界

- PDF 必须含可提取文字。扫描 PDF 请先 OCR；本插件不提供 OCR。
- 全文按 PDF 文本层顺序朗读；排版复杂的双栏、脚注和公式可能出现阅读顺序或发音偏差，此时建议划选段落。
- 引文识别是启发式处理，不能保证所有排版均识别；按当前策略，真正的纯数字方括号区间也会略过。
- 自动分句依赖英语标点；极少数缩写与不规则 PDF 断句可用精确划选修正。
- 暂停可继续当前位置；停止后可重读任务；全文选“从上次进度”会从上次播放的句子重新开始，避免遗漏。
- 切换模式会停止当前朗读；声音、速度和全文起点修改保留当前播放，下次开始生效。关闭正在读的 PDF 或停用插件也会停止。
- 跟读字幕不等于生成永久双语 PDF；关闭或卸载后原文布局恢复。

## 源码与验证

- `addon/`：插件源码；`engine/worker.py`：本地语音进程。
- `npm test`：文本、取消、预取、循环和全文读取回归测试。
- `python3 scripts/build.py`：生成 XPI。
- `scripts/build_engine.py`：从经过校验的便携 Python/模型来源构建离线语音包；首次重建需提供源码参数对应的 runtime/models 目录。
- `tests/harness.js` 与 `tests/extended-integration.js`：独立测试资料库使用的 Zotero 集成测试，不包含在正式 XPI 内。
- 验证结果见仓库内的[测试报告](测试报告.md)；本地详细日志存于 `test-results/`（不上传资料库或原始日志）。正式插件没有测试命令入口、远程控制端口或测试资料库。

参考项目：[Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx)、[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)、[Translate for Zotero](https://github.com/windingwind/zotero-pdf-translate)、[Lucide](https://lucide.dev)。运行依赖、模型和图标库许可证见交付包“资源/许可证”。本项目代码使用 MIT 许可；第三方组件保留各自许可。

## 项目与反馈

作者：Junyan Kang。源代码与更新：[JunyanKang/paper-voice](https://github.com/JunyanKang/paper-voice)。问题反馈：[Issues](https://github.com/JunyanKang/paper-voice/issues)。隐私说明：[PRIVACY.md](PRIVACY.md)。变更记录：[CHANGELOG.md](CHANGELOG.md)。

## 卸载

在 Zotero 插件管理器中停用或移除 Paper Voice。无需删除任何文献。若不再需要离线声音，可自行移除 上述平台对应的 `paper-voice-engine` 目录及安装器生成的同名前缀备份；设置与进度位于 Zotero 偏好设置的 `extensions.paperVoice.*` 下。
