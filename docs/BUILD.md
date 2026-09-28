# 构建与发布

## 插件

需要 Node.js 22+ 和 Python 3.12+。没有 npm 安装依赖。

```sh
npm test
npm run build
python3 scripts/release_metadata.py
```

产物位于 `dist/Paper Voice/`。构建会从 panel.css 生成 panel-style.js；XPI 仅收录 addon/。更新 JSON 包含实际 XPI 的 SHA512 与 Zotero 兼容范围。CI 只验证和提供构建产物，不代表实机验收，不自动发布未测试版本。

## 离线语音包

第一版仅分发 Apple Silicon / macOS 14+。直接依赖版本见 `engine/requirements-runtime.txt`，完整依赖和模型哈希见 release 语音包内的 runtime-manifest.json。

准备下列目录，再运行 `python3 scripts/build_engine.py PORTABLE_SOURCE_DIR`：

```text
PORTABLE_SOURCE_DIR/
  runtime/python/   # 可搬移 CPython 及安装好的依赖
  models/tts/kokoro-v1.0.onnx
  models/tts/voices-v1.0.bin
```

CPython 来自 [Astral python-build-standalone](https://github.com/astral-sh/python-build-standalone/releases/tag/20260924) 的 CPython 3.12.14 aarch64-apple-darwin install_only，归档 SHA256 为 `9763f43db2481a6af36af82ec40302aab7a73632f880129d07a6e81aec846277`。使用其 Python 安装依赖后，审计所有 Mach-O 动态库，确保没有指向 Homebrew 或构建机绝对目录的非系统链接；必要时调整 install-name 为相对路径并进行 ad-hoc 签名。

模型来源：[kokoro-onnx v1.0 models](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)。文件 SHA256：

- kokoro-v1.0.onnx：`beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a`
- voices-v1.0.bin：`bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`

打包时保留 Python 许可、所有实际依赖许可、Kokoro 模型与 voicebank 的上游许可、eSpeak NG/phonemizer/libsndfile 对应源码和构建入口。语音包、模型、测试资料库均不进入 Git 源码仓库。

## 实机验证与 release

`tests/harness.js` 及 `*-integration.js` 仅用于独立测试 profile。`scripts/build_test_plugin.py` 为测试 XPI 注入本机测试路径和命令轮询器；它们绝不可随正式 XPI 发布。不要用个人资料库运行测试。

发布前检查：实际鼠标选区、六种声音、暂停/停止、各循环模式、跨页/当前页/断点续读、翻译服务与语言、字幕不覆盖原文、面板无滚动条、安装器和离线运行。网络服务可用性报告应保留超时与不支持组合，不能改写成全部成功。

更新 manifest 与 package.json 版本，完成 CHANGELOG 和测试报告，构建最终 XPI 并运行 `python3 scripts/package_release.py` 生成包含语音运行环境的完整 ZIP。计算每个附件 SHA256，创建相同版本的 `vX.Y.Z` 标签，再将 XPI、语音 ZIP、updates.json、SHA256SUMS 与测试报告发布到对应 GitHub release。Zotero 的更新地址指向 latest release 的 updates.json；语音包独立于插件更新。
