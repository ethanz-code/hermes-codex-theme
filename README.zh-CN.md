<p align="center">
  <img src="assets/cover.png" alt="Codex Theme — Hermes 桌面聊天的石墨纸感主题" width="100%">
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

<h1 align="center">Codex Theme</h1>

<p align="center">
  <em>Hermes 桌面聊天的石墨纸感主题 —— 设计语言学自 OpenAI Codex 与 ChatGPT</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <a href="https://hermes-agent.nousresearch.com/docs"><img src="https://img.shields.io/badge/Hermes-%3E%3D0.22.0-339CFF.svg" alt="hermes"></a>
  <a href="https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk"><img src="https://img.shields.io/badge/platform-Hermes%20Desktop-lightgrey.svg" alt="platform"></a>
</p>

<p align="center">
  <a href="#亮点">亮点</a> •
  <a href="#效果">效果</a> •
  <a href="#安装">安装</a> •
  <a href="#设置">设置</a>
</p>

亮暗双套配色自动跟随系统外观，字体、圆角与间距按 OpenAI Codex 应用和 ChatGPT
的设计语言调校。设置页中英双语，插件对你说的每句话都走本地化。

## 亮点

- **亮暗免管** —— 两套手工调校的配色，默认跟随系统外观，也可在设置里钉死一套
- **石墨纸感** —— 平面表面、发丝线边框（`#E7E7E7` / `#2A2A2A`）、层级靠字重
  （600/500/400）承载；蓝色（浅 `#0285FF` / 深 `#339CFF`）只做交互，绝不用于装饰
- **OpenAI 圆角刻度** —— 行内代码 4px · 侧栏行 8px · 控件 10px ·
  卡片/气泡/菜单/弹窗 12px · 输入区 20px
- **内容间距三档** —— 紧凑 1.3 / 舒适 1.4286（默认）/ 宽松 1.55 行高，
  段距与气泡内距随档联动
- **阅读宽度 768 / 880 / 992px** —— 紧凑 / 舒适（默认）/ 宽松，
  比 ChatGPT 的 720–768px 更宽
- **正文字体 / 代码字体预设** —— 正文（默认 / 衬线 / 等宽）与代码
  （默认 / Fira Code / Courier），每档都排中文回退，中英文混排皆可读；
  「默认」档完全不覆盖你的字体设置
- **气泡颜色自定义** —— 用户气泡与助手回复的背景色、文字色都可自选；
  「默认」保持主题原色
- **输入区可拖拽** —— 按住输入区顶缘把手可拖到视口任意位置（边界钳制不溢出，
  草稿长高落点不漂移）；双击把手回坞，每个面板各自记住落点
- **输入框不抢焦点** —— 鼠标移过聊天区或点击外部时，输入框不再把焦点抢回去；
  习惯旧行为可在设置里选「跟随鼠标」
- **中英双语界面** —— 默认跟随系统与应用语言，也可在设置里固定为中文或英文；
  标签、提示、弹窗文案全部本地化
- **一键反馈** —— 设置页带「打开 GitHub Issues」按钮，经系统交给浏览器打开
- **尊重你的配置** —— 正文字号、界面模式、透明度、会话列表密度等
  全部仍由 Hermes 自己的设置管理；主题只画主题级 token

## 效果

<p align="center">
  <img src="assets/theme-light.png" alt="浅色配色 —— 渲染样张" width="49%">
  <img src="assets/theme-dark.png" alt="深色配色 —— 渲染样张" width="49%">
</p>

<p align="center"><em>两套配色的渲染样张 —— 左浅色、右深色。</em></p>

## 设计语言

| 原则 | 落法 |
|---|---|
| 石墨纸感 | 近白画布（`#FFFFFF`）/ 近黑画布（`#181818`） |
| 字重承载层级 | 标题 600、标签 500、正文 400 —— 不用装饰色 |
| 蓝色只做交互 | 浅 `#0285FF` / 深 `#339CFF`：链接、焦点环、选区 |
| 发丝线代替阴影 | 1px 描边（`#E7E7E7` / `#2A2A2A`）做层次，表面保持平整 |
| 圆角刻度 | 行内 4px · 行 8px · 控件 10px · 卡片/气泡/弹窗 12px · 输入区 20px |
| 行高 | 根行高 1.4286 —— 14px 正文走 20px 行距（对齐 ZCode）；间距档位 1.3 / 1.4286 / 1.55 |
| 阅读宽度 | 默认 880px · 三档 768 / 880 / 992px（ChatGPT：720–768px） |

### 配色

| Token | 深色 | 浅色 |
|---|---|---|
| 画布 | `#181818` | `#FFFFFF` |
| 侧栏 | `#171717` | `#F9F9F9` |
| 卡片 | `#212121` | `#F7F7F7` |
| 用户气泡 | `#202020` | `#F3F3F3` |
| 边框 | `#2A2A2A` | `#E7E7E7` |
| 强调色 | `#339CFF` | `#0285FF` |

## 安装

等收录进[插件市场](https://hermes-agent.nousresearch.com/docs/plugins)后：

```bash
hermes plugins install codex-theme
```

或直接从 GitHub 安装：

```bash
hermes plugins install ethanz-code/hermes-codex-theme
```

然后打开 **设置 → 插件 → Codex Theme** 点「重新应用」（首次加载时主题也会自动
接管一次）。

> [!TIP]
> 手动 / 开发安装：把 `desktop/plugin.js` 拷到
> `~/.hermes/desktop-plugins/codex-theme/plugin.js`，再在 ⌘K 里运行
> **Reload desktop plugins**。

## 设置

全部设置在 **设置 → 插件 → Codex Theme**，分为「外观」「排版与布局」
「对话气泡」「通用」四组面板：

| 设置项 | 可选项 | 说明 |
|---|---|---|
| 亮暗模式 | 跟随系统 / 深色 / 浅色 | 默认跟随系统外观 |
| 阅读宽度 | 紧凑（768px）/ 舒适（880px，默认）/ 宽松（992px） | 主题级旋钮；Hermes 无内置宽度设置 |
| 内容间距 | 紧凑（1.3）/ 舒适（1.4286，默认）/ 宽松（1.55） | 行高 + 段距/气泡节奏联动 |
| 正文字体 | 默认 / 衬线 / 等宽 | 每档带中文回退；「默认」沿用主题/应用字体 |
| 代码字体 | 默认 / Fira Code / Courier | Fira Code、JetBrains Mono 需本机已安装，否则自动回退系统等宽 |
| 用户气泡背景 | 拾色器 + 「默认」 | 「默认」为主题灰（浅 #F3F3F3 / 深 #202020） |
| 用户气泡文字 | 拾色器 + 「默认」 | 「默认」跟随主题正文色 |
| 助手气泡背景 | 拾色器 + 「默认」 | 「默认」透明，回复直接落在画布上 |
| 助手气泡文字 | 拾色器 + 「默认」 | 「默认」跟随主题正文色 |
| 输入框焦点 | 防抢占（默认）/ 跟随鼠标 | 鼠标移过聊天区或点击外部时，输入框是否把焦点抢回去；「防抢占」只在应用启动、切新会话、直接点击/键入输入框时聚焦 |
| 语言 | 跟随系统 / 中文 / English | 只作用于插件界面，不改 Hermes 语言 |
| 反馈问题 | 「打开 GitHub Issues」 | 在浏览器打开本仓库 Issues 页 |

`⌘K` 里另有两条低调命令：*Theme: 使用 Codex 主题* 和 *Theme: Codex 主题设置*
（中英文搜索词都能命中）。

> [!NOTE]
> 选非默认字体档会整体覆盖 `--dt-font-sans` / `--dt-font-mono` ——
> 包括你在 Hermes 外观设置里配的自定义聊天字体；「默认」档完全不覆盖。
> 气泡颜色改完立即生效、重启后保留，亮暗两套同一颜色，且只在 Codex 主题
> 生效时上色；点「默认」恢复主题原色。

### 这个主题刻意不碰的东西

你的 Hermes 配置归你。主题只画**主题级 token**（配色、字体栈、圆角、间距），
所有用户可配置项一概不碰 —— 正文字号（设置 → 外观）、界面模式、透明度、
会话列表密度、聊天背景、时间戳，以及 `config.yaml` 里的一切。两条铁律：

> [!IMPORTANT]
> - 主题绝不写 `--chat-text-scale` —— 那个旋钮归 **设置 → 外观** 所有，
>   写了就会出现两个所有者互相覆盖。
> - 主题只在首次安装时接管一次配色；之后你在「外观」里手动选的主题永远优先，
>   「重新应用」是主动操作。

## 披露

按市场规则 13，安装前你应知道的一切：

- **无网络请求。** 不拉取任何东西，也不回传任何东西。
- **无遥测。** 不做任何用量上报。
- **无凭据。** 不读不写任何密钥。
- **不打核心补丁。** 主题、命令面板行、设置页全部通过桌面插件 SDK 注册
  （`THEMES_AREA`、`PALETTE_AREA`、`ctx.registerSettingsPage`、`ctx.i18n`）。
- **外链一处：**「反馈问题」按钮请系统在浏览器打开仓库 Issues 页
  （`ctx.os.openExternal`）—— 全插件唯一的对外动作，且只在你按下按钮时发生。
- **存储：** 仅插件自有存储（`ctx.storage`），保存设置页的选择
  （亮暗模式、阅读宽度、内容间距、字体、气泡颜色、输入框焦点与语言），
  外加输入区拖拽落点与首次安装标记。
- **样式：** 主题的 `customCSS` 由应用自带主题引擎以作用域样式注入，
  与用户皮肤机制完全相同；只改视觉，不改行为。

## 致谢

设计语言致意 **OpenAI Codex 应用**与 **ChatGPT**（石墨纸感配色、圆角刻度、
间距节奏）。这是独立的社区主题 —— 与 OpenAI 无隶属、无背书关系。

基于 [Hermes Desktop Plugin SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk)
构建，[MIT 许可证](LICENSE) 发布。
