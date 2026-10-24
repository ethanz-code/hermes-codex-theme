/**
 * codex-theme — Codex × ChatGPT 风格主题（亮/暗双套，随系统切换）
 *
 * 设计语言（学自 OpenAI Codex 应用 + ChatGPT Web 的设计精髓）：
 *   - 石墨纸感（graphite-on-paper）：近白画布 / 近黑 #181818，正文主导、chrome 克制
 *   - 无彩体系：灰阶承载层级（字重 600/500/400），蓝色只做交互点缀
 *   - 发丝线代替阴影：1px 边框做层次，表面保持平整
 *   - 圆角走 OpenAI 官方刻度：内联代码 4px、侧栏行 8px、控件 10px、卡片/菜单/弹窗/气泡 12px、composer 20px
 *   - 边框统一 10% 前景色（浅 #e7e7e7 / 深 #2a2a2a）；用户气泡前景 5%（浅 #f3f3f3 / 深 #202020）无描边
 *   - 间距节奏：4px 网格；行高 1.7（紧凑 1.55 / 宽松 1.8）
 *   - 阅读栏 768 / 880 / 992px 三档（默认 880px）
 *
 * 控制入口（不在输入框加东西）：
 *   设置 → 插件 → Codex Theme：亮暗模式（跟随系统/深色/浅色）、阅读宽度、内容间距、
 *   字体（正文字体/代码字体）、气泡颜色（用户/助手的背景色与文字色）、输入框焦点（防抢占/跟随鼠标）、
 *   语言（跟随系统/中文/英文，文案全走 i18n）、反馈问题（GitHub Issues）
 *   ⌘K：「Theme: 使用 Codex 主题」「Theme: Codex 主题设置」
 *
 * 安装：~/.hermes/desktop-plugins/codex-theme/plugin.js（目录名 == id）
 */

import { Button, host, PALETTE_AREA, pluginSettingsHref, requestTheme, SegmentedControl, THEMES_AREA, usePluginI18n, useTheme } from '@hermes/plugin-sdk'
import { useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'codex-theme'
const ISSUES_URL = 'https://github.com/ethanz-code/hermes-codex-theme/issues'

// ─── 偏好（阅读宽度 / 内容间距 / 字体），注册时与设置页共用 ─────────────────
// 只动主题级的旋钮；不碰 Hermes 自己的配置项（如 --chat-text-scale 正文缩放、
// 聊天字体 display.chat_font、界面模式、透明度等），避免与设置互相覆盖。

// 三档阅读栏：紧凑 768 / 舒适 880（默认）/ 宽松 992px。
// 旧版 42/46/54rem 偏好按像素就近迁移（旧「宽」864px ≈ 新「舒适」880px 的微调值）。
const COL_WIDTHS = [
  { value: '48rem', labelKey: 'compact' },
  { value: '55rem', labelKey: 'comfortable' },
  { value: '62rem', labelKey: 'roomy' }
]
const LEGACY_COL_WIDTH = { '42rem': '48rem', '46rem': '48rem', '54rem': '55rem' }

// 字体档位：正文字体 → --dt-font-sans，代码字体 → --dt-font-mono。
// 每档都排了中文回退（苹方/雅黑/思源）与 emoji 回退，中英文混排皆可；「默认」档
// 不写规则，沿用主题与应用自己的字体（含 display.chat_font / desktop.font_family）。
// 只覆盖主题级变量本身，不写 Hermes 的字体配置项。
const EMOJI_FONTS = "'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', emoji"
const TEXT_FONTS = [
  { value: 'default', labelKey: 'fontDefault' },
  {
    value: 'serif',
    labelKey: 'fontSerif',
    stack: `Georgia, 'Times New Roman', 'Songti SC', STSong, 'Noto Serif SC', 'Source Han Serif SC', SimSun, serif, ${EMOJI_FONTS}`,
    // 小字号宋体横画发细（实测 15px 比无衬线轻约 15% 墨迹，即「看不清」的来源）：
    // 0.15px 同色描边把笔画写实。font-weight 500 对无 Medium 字重的 Songti 是空操作、
    // 600 过粗会封死密集字形、subpixel AA 深色底有彩边 —— 描边是实测最稳的一档。
    legibility: '-webkit-text-stroke-width: 0.15px;\n  -webkit-text-stroke-color: currentColor;'
  },
  {
    value: 'mono',
    labelKey: 'fontMonoText',
    stack: `'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace, ${EMOJI_FONTS}`
  }
]
const CODE_FONTS = [
  { value: 'default', labelKey: 'fontDefault' },
  {
    value: 'fira',
    labelKey: 'fontFira',
    stack: `'Fira Code', 'FiraCode Nerd Font', 'JetBrains Mono', 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace, ${EMOJI_FONTS}`
  },
  {
    value: 'courier',
    labelKey: 'fontCourier',
    stack: `'Courier New', Courier, Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace, ${EMOJI_FONTS}`
  }
]

// 三档内容间距：紧凑 / 舒适（默认）/ 宽松 —— 行高与段距整档缩放，非默认档按
// 当前 pref 直接生成 :root 声明（见 buildCustomCSS），默认档不发规则。
const DENSITIES = [
  { value: 'compact', labelKey: 'compact' },
  { value: 'comfortable', labelKey: 'comfortable' },
  { value: 'roomy', labelKey: 'roomy' }
]

// 非默认档位的声明体（取值沿用旧 html[data-codex-density] 规则）。
const DENSITY_RULES = {
  compact: `:root {
  --paragraph-gap: 0.5rem;
  --turn-block-gap: 0.875rem;
  --tool-row-gap: 0.375rem;
  --codex-bubble-pad-y: 0.5rem;
  --codex-bubble-pad-x: 0.75rem;
  --codex-li-gap: 0.2rem;
  --dt-line-height: 1.3 !important;
}`,
  roomy: `:root {
  --paragraph-gap: 0.875rem;
  --turn-block-gap: 1.625rem;
  --tool-row-gap: 0.625rem;
  --codex-bubble-pad-y: 0.75rem;
  --codex-bubble-pad-x: 1rem;
  --codex-li-gap: 0.4rem;
  --dt-line-height: 1.55 !important;
}`
}

// 气泡颜色四档（用户/助手 × 背景/文字）：'' 表示不覆盖，未配置时不发任何规则，
// 外观与默认完全一致。取值只收十六进制色（拾色器产出），其余输入一律丢弃，
// 避免拼进 customCSS 时注入外来声明。
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function normalizeColor(value) {
  return typeof value === 'string' && HEX_COLOR_RE.test(value) ? value.toLowerCase() : ''
}

const PREF_DEFAULTS = {
  colWidth: '55rem',
  density: 'comfortable',
  language: 'system',
  fontText: 'default',
  fontCode: 'default',
  bubbleUserBg: '',
  bubbleUserText: '',
  bubbleAssistantBg: '',
  bubbleAssistantText: '',
  focusGuard: 'guard'
}
const LANGUAGES = ['system', 'zh', 'en']
const FOCUS_GUARD_MODES = ['guard', 'follow']
let storage = null
let pluginOs = null
let registerThemeEntry = () => {}

// 语言偏好变化的订阅口（设置页切换语言时重建 ⌘K / 设置页标题等注册期文案）。
const languageListeners = new Set()

function onLanguagePrefChange(listener) {
  languageListeners.add(listener)
  return () => languageListeners.delete(listener)
}

function normalizeColWidth(value) {
  const v = LEGACY_COL_WIDTH[value] || value
  return COL_WIDTHS.some(o => o.value === v) ? v : PREF_DEFAULTS.colWidth
}

function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : PREF_DEFAULTS.language
}

function normalizeDensity(value) {
  return DENSITIES.some(o => o.value === value) ? value : PREF_DEFAULTS.density
}

function normalizeFont(value, list) {
  return list.some(o => o.value === value) ? value : 'default'
}

function normalizeFocusGuard(value) {
  return FOCUS_GUARD_MODES.includes(value) ? value : PREF_DEFAULTS.focusGuard
}

function normalizePrefs(stored) {
  const p = { ...PREF_DEFAULTS, ...(stored || {}) }
  return {
    colWidth: normalizeColWidth(p.colWidth),
    density: normalizeDensity(p.density),
    language: normalizeLanguage(p.language),
    fontText: normalizeFont(p.fontText, TEXT_FONTS),
    fontCode: normalizeFont(p.fontCode, CODE_FONTS),
    bubbleUserBg: normalizeColor(p.bubbleUserBg),
    bubbleUserText: normalizeColor(p.bubbleUserText),
    bubbleAssistantBg: normalizeColor(p.bubbleAssistantBg),
    bubbleAssistantText: normalizeColor(p.bubbleAssistantText),
    focusGuard: normalizeFocusGuard(p.focusGuard)
  }
}

function getPref(key) {
  return normalizePrefs(storage ? storage.get('prefs', null) : null)[key]
}

function setPref(key, value) {
  const next = { ...PREF_DEFAULTS, ...((storage && storage.get('prefs', null)) || {}), [key]: value }
  if (storage) storage.set('prefs', next)
  applyPrefs(next)
  if (key === 'language') languageListeners.forEach(listener => listener())
}

// 阅读栏宽度 / 内容间距 / 字体档位都随主题的 customCSS 发出（只在 Codex 激活时
// 生效），设置变更时重注册同 id 的 THEMES_AREA 条目覆盖旧值；顺带清掉旧版本写进
// <html> 内联样式与 dataset 的残留。
function clearDatasetPrefs() {
  const root = document.documentElement
  root.removeAttribute('data-codex-density')
  root.removeAttribute('data-codex-text-font')
  root.removeAttribute('data-codex-code-font')
}

function applyPrefs(prefs) {
  const p = normalizePrefs(prefs || (storage ? storage.get('prefs', null) : null))
  document.documentElement.style.removeProperty('--composer-width')
  clearDatasetPrefs()
  registerThemeEntry(p)
}

function openIssues() {
  if (pluginOs && typeof pluginOs.openExternal === 'function') {
    pluginOs.openExternal(ISSUES_URL)
  } else {
    console.error('[codex-theme] ctx.os.openExternal unavailable in this build')
  }
}

// ─── 双套配色（Codex 基准 + ChatGPT 石墨纸感的灰阶） ─────────────────────────
// 取值对齐官方 token（apps-sdk-ui / Codex 桌面端内嵌 CSS）：
// 边框 = 前景 10%（浅）/ 12%（深）；用户气泡 = 前景 5%/8% 无描边；
// accent 浅 #0285FF / 深 #339CFF，焦点环浅 #0169CC / 深 #0285FF。

const dark = {
  background: '#181818',
  foreground: '#f5f5f5',
  card: '#212121',
  cardForeground: '#f5f5f5',
  muted: '#262626',
  mutedForeground: '#9b9b9b',
  popover: '#232323',
  popoverForeground: '#f5f5f5',
  primary: '#339cff',
  primaryForeground: '#ffffff',
  secondary: '#242424',
  secondaryForeground: '#e8e8e8',
  accent: '#272727',
  accentForeground: '#ededed',
  border: '#2a2a2a',
  input: '#242424',
  ring: '#0285ff',
  midground: '#339cff',
  midgroundForeground: '#ffffff',
  composerRing: '#339cff',
  destructive: '#e5484d',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#171717',
  sidebarBorder: '#2a2a2a',
  userBubble: '#202020',
  userBubbleBorder: 'transparent'
}

const light = {
  background: '#ffffff',
  foreground: '#1a1a1a',
  card: '#f7f7f7',
  cardForeground: '#1a1a1a',
  muted: '#f4f4f4',
  mutedForeground: '#6f6f6f',
  popover: '#ffffff',
  popoverForeground: '#1a1a1a',
  primary: '#0285ff',
  primaryForeground: '#ffffff',
  secondary: '#f1f1f1',
  secondaryForeground: '#2c2c2c',
  accent: '#efefef',
  accentForeground: '#2c2c2c',
  border: '#e7e7e7',
  input: '#f6f6f6',
  ring: '#0169cc',
  midground: '#0285ff',
  midgroundForeground: '#ffffff',
  composerRing: '#0285ff',
  destructive: '#c93a36',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#f9f9f9',
  sidebarBorder: '#e7e7e7',
  userBubble: '#f3f3f3',
  userBubbleBorder: 'transparent'
}

// ─── 样式基底（圆角刻度 / 发丝线 / 间距节奏 / 弹窗 / 侧栏 / 设置页面板） ────────

const customCSSBase = `
/* 字号与间距基线（阅读栏宽度 --composer-width 随偏好在 customCSS 尾部输出，
   行高走主题 typography.line-height（--dt-line-height: 1.4286），此处只管阅读栏）。 */
:root {
  --dt-user-bubble-max-width: 78%;
  --conversation-text-base-size: 0.875rem;
  --conversation-base-line-height: 1.25rem;
  --conversation-tool-base-size: 0.75rem;
  --conversation-caption-base-size: 0.75rem;
  --conversation-caption-base-line-height: 1rem;

  /* 间距档位的基准档（舒适） */
  --paragraph-gap: 0.625rem;
  --turn-block-gap: 1.25rem;
  --tool-row-gap: 0.5rem;
  --codex-bubble-pad-y: 0.625rem;
  --codex-bubble-pad-x: 0.875rem;
  --codex-li-gap: 0.3rem;

  /* 输入区内边距（ChatGPT 式密度：横向 12px / 纵向 8px；不随间距档位缩放） */
  --composer-surface-pad-x: 0.75rem;
  --composer-surface-pad-y: 0.5rem;

  /* 圆角刻度（OpenAI radius-sm/md/lg/xl/3xl） */
  --codex-radius-inline: 0.25rem;
  --codex-radius-row: 0.5rem;
  --codex-radius-control: 0.625rem;
  --codex-radius-card: 0.75rem;
  --codex-radius-composer: 1.25rem;

  /* 浮层阴影（elevation + 1px hairline 边）；输入区阴影为纯 elevation，
     发丝线由 border 承担，不叠 1px ring（避免双描边） */
  --codex-shadow-menu: 0 2px 4px -1px rgb(0 0 0 / 0.08), 0 0 0 1px var(--dt-border);
  --codex-shadow-dialog: 0 8px 16px 0 #00000012, 0 2px 6px 0 #0000000d, 0 0 0 1px var(--dt-border);
  --codex-shadow-composer: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 6px 16px -4px rgb(0 0 0 / 0.08);
  --codex-shadow-composer-focus: 0 2px 4px 0 rgb(0 0 0 / 0.06), 0 10px 24px -6px rgb(0 0 0 / 0.12);
}
/* CJK 落系统 UI 变体（.蘋方 UI Text-簡）：Chromium 在 lang=zh 文档里把
   ui-sans-serif / system-ui 的 CJK 解析成普通苹方（宽且重），lang=en 才落 UI
   变体（CDP 实测确认，-apple-system 等栈同理）。app 的 i18n 会把 <html lang>
   设成界面语言（中文界面=zh），故正文区与输入框都要用 -webkit-locale 压回 en：
   字体解析随系统字体栈自动选 UI 变体，中文正文的断行语义不受影响；拼写检查
   也不受影响——会话词典按系统 locale 走，中文本来就不参与。 */
[data-slot='aui_thread-content'],
[data-slot='aui_user-message-root'] .composer-human-message {
  -webkit-locale: "en";
}

/* 输入区字体反压：app 的 [data-slot='composer-rich-input']:lang(zh/zh-hant/ja)
   把系统 CJK 字体排在 var(--dt-font-sans) 前面（为 …—“” 全角标点），中文界面下
   输入框落普通苹方 —— !important 压过 :lang 规则（app 规则无 important，Chromium
   实测可行），输入框与消息区同源；配合上面的 -webkit-locale 落 UI 变体。 */
html [data-slot='composer-rich-input'] {
  font-family: var(--dt-font-sans) !important;
  -webkit-locale: "en";
}

html.dark {
  --codex-shadow-menu: 0 2px 4px -1px rgb(0 0 0 / 0.2), 0 0 0 1px var(--dt-border);
  --codex-shadow-dialog: 0 8px 16px 0 #00000059, 0 2px 8px 0 #0003, 0 0 0 1px var(--dt-border);
  --codex-shadow-composer: 0 1px 2px 0 rgb(0 0 0 / 0.4), 0 6px 16px -4px rgb(0 0 0 / 0.45);
  --codex-shadow-composer-focus: 0 2px 4px 0 rgb(0 0 0 / 0.5), 0 10px 24px -6px rgb(0 0 0 / 0.55);
}

/* 正文：ChatGPT 式阅读节奏 —— 字重承载层级，行距随间距档位（与 --dt-line-height
   一致，双保险：消息容器与 .aui-md 都显式声明，防止被内层 leading-* 类覆盖） */
[data-slot='aui_assistant-message-content'] {
  line-height: var(--dt-line-height);
}
[data-slot='aui_assistant-message-content'] .aui-md {
  line-height: var(--dt-line-height);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(h1, h2, h3, h4) {
  font-weight: 600;
  letter-spacing: -0.012em;
  margin-block: 1.5rem 0.5rem;
  line-height: 1.35;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(p) {
  margin-block: var(--paragraph-gap) 0;
}

/* 用户气泡：前景 5%（浅 #f3f3f3 / 深 #202020）、12px 圆角、无描边无阴影 */
.composer-human-message {
  border-radius: var(--codex-radius-card);
  padding: var(--codex-bubble-pad-y) var(--codex-bubble-pad-x);
  box-shadow: none;
  line-height: var(--dt-line-height);
}

/* 用户气泡宽度：贴合内容、右对齐（发送方），上限 --dt-user-bubble-max-width 后换行。
   作用域必须落在 [data-slot='aui_user-bubble-actions'] —— 编辑态输入框复用同一个
   .composer-human-message class（app 内 ui-prompt-input__container），不能一起收缩；
   后代选择器把特异性抬到 0,2,0，压过气泡链上的 w-full / max-w-full（不依赖注入顺序）。
   overflow-wrap: anywhere 兜底超长无空格串（内层文本自带 wrap-anywhere，此处双保险）。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  width: fit-content;
  max-width: var(--dt-user-bubble-max-width, 78%);
  margin-left: auto;
  overflow-wrap: anywhere;
}

/* 气泡本体只贴自身文本：分支线程的 checkpoint 行（restore/1/2/next）比短文本宽时，
   外层 fit-content 会被该行撑宽，短气泡跟着变宽；对气泡 button 再收缩一次并右对齐，
   hover 操作按钮（absolute right-2 bottom-2）仍贴气泡右下角。
   --human-msg-line-height 就近覆盖 app 在 message-root 上的 1.3：sticky 4 行截断的
   max-height 按 4 * --human-msg-line-height * 字号计算，须与气泡实际行高一致。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] .composer-human-message {
  border: none;
  width: fit-content;
  margin-left: auto;
  --human-msg-line-height: var(--dt-line-height);
}

/* 用户气泡底色：调研取前景 5%（浅 #f3f3f3 / 深 #202020）。两个坑：
   1) 浅色下 --theme-mix-bubble 为 0%，气泡链路（--theme-bubble-seed →
      --ui-chat-bubble-background）只吃 --theme-neutral-card #fcfcfc，主题 userBubble
      被丢弃；2) --dt-user-bubble 在 :root 定义、var() 在定义处替换，下游改
      --ui-chat-bubble-background 不传导。故直接在气泡作用域覆盖 --dt-user-bubble，
      并保留 --user-bubble-keep（气泡透明度设置）的合成。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  --dt-user-bubble: color-mix(in srgb, #f3f3f3 var(--user-bubble-keep, 100%), transparent);
}
html.dark [data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  --dt-user-bubble: color-mix(in srgb, #202020 var(--user-bubble-keep, 100%), transparent);
}

/* 代码块 / 代码卡片：卡片 12px 圆角 */
[data-slot='code-card'],
[data-slot='aui_user-fence'],
[data-slot='aui_assistant-message-content'] .aui-md [data-streamdown='code-block'] {
  border-radius: var(--codex-radius-card);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(:not(pre) > code),
[data-slot='aui_user-inline-code'] {
  border-radius: var(--codex-radius-inline);
  padding: 0.08em 0.3em;
  font-size: 0.88em;
  border: none;
  background: color-mix(in srgb, var(--theme-foreground) 5%, transparent);
}

/* 表格：发丝线，无重边框 */
[data-slot='aui_assistant-message-content'] .aui-md table {
  border-collapse: collapse;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th, td) {
  border-color: var(--dt-border);
}

/* 工具调用 / 思考等脚手架行：扁平、等宽字标签、可读性优先（不做过淡的灰） */
:root {
  --conversation-scaffold-text: color-mix(in srgb, var(--theme-foreground) 74%, transparent);
  --conversation-scaffold-meta: color-mix(in srgb, var(--theme-foreground) 52%, transparent);
}
[data-conversation-scaffold] {
  font-family: var(--dt-font-sans);
  color: color-mix(in srgb, var(--theme-foreground) 78%, transparent);
}
[data-conversation-scaffold] code,
[data-conversation-scaffold] [data-slot='aui_turn-duration'] {
  font-family: var(--dt-font-mono);
}
[data-conversation-scaffold] code {
  background: color-mix(in srgb, var(--theme-foreground) 6%, transparent);
  padding: 0.05em 0.35em;
  border-radius: var(--codex-radius-inline);
}
[data-slot='aui_turn-duration'] {
  font-size: var(--conversation-caption-font-size);
  color: var(--ui-text-tertiary);
}

/* ── 内容排版（Markdown）：ChatGPT 式节奏 6/10/16/24，层级靠字重与留白 ── */
[data-slot='aui_assistant-message-content'] .aui-md :where(ul, ol) {
  margin-block: 0.625rem;
  padding-left: 1.35em;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(li) {
  margin-block: var(--codex-li-gap);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(li > ul, li > ol) {
  margin-block: 0.125rem;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(blockquote) {
  margin-block: 0.75rem;
  padding: 0.25rem 0 0.25rem 0.9rem;
  border-left: 2px solid var(--dt-border);
  color: var(--ui-text-secondary);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(h1) { font-size: 1.375em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h2) { font-size: 1.25em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h3) { font-size: 1.125em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h4) { font-size: 1em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(strong) {
  font-weight: 600;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(hr) {
  margin-block: 1.5rem;
  border-color: var(--dt-border);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(pre) {
  font-size: 0.85em;
  line-height: 1.55;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th) {
  font-weight: 600;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th, td) {
  padding: 0.45rem 0.75rem;
}

/* 文本选区：品牌色淡染（保持对比度） */
::selection {
  background: color-mix(in srgb, var(--theme-midground) 22%, transparent);
}

/* 输入区：ChatGPT 式圆角卡片 —— 20px 圆角、发丝线（与弹窗同款 1px --dt-border）、
   柔和 elevation；hover 描边微深、聚焦描边加深 + 阴影抬升。两个坑：
   1) app styles.css 用 border-color: var(--ui-stroke-secondary) !important 压掉一切
      普通描边色，改色必须同带 !important；选择器前缀 html 把特异性抬到 0,1,1，
      压过 app 的 0,1,0，不依赖注入顺序。
   2) surface 自带 transition-opacity（拖放淡出），transition 列表必须保留 opacity。 */
html [data-slot='composer-surface'] {
  border-radius: var(--codex-radius-composer);
  border: 1px solid var(--dt-border) !important;
  box-shadow: var(--codex-shadow-composer);
  transition: border-color 150ms ease, box-shadow 150ms ease, opacity 150ms ease-out;
}
html [data-slot='composer-surface']:hover {
  border-color: color-mix(in srgb, var(--theme-foreground) 16%, var(--dt-border)) !important;
}
html [data-slot='composer-surface']:focus-within {
  border-color: color-mix(in srgb, var(--theme-foreground) 28%, var(--dt-border)) !important;
  box-shadow: var(--codex-shadow-composer-focus);
}

/* 占位符：前景 50% 中性灰（ChatGPT 式弱提示，暗色下保住可读性）。app 同选择器带
   !important 的 --ui-text-tertiary 会压掉主题色，此处以 !important + html 前缀特异性反压。 */
html [data-slot='composer-rich-input']:is(:empty, [data-empty])::before {
  color: color-mix(in srgb, var(--theme-foreground) 50%, transparent) !important;
}

/* ── 弹窗 / 浮层：统一 12px 圆角、统一边框线、elevation 阴影、Codex 遮罩 ── */
[data-slot='dialog-overlay'] {
  background: rgba(0, 0, 0, 0.3);
}
html.dark [data-slot='dialog-overlay'] {
  background: rgba(0, 0, 0, 0.5);
}
[data-slot='dialog-content'] {
  border-radius: var(--codex-radius-card);
  border: 1px solid var(--dt-border);
  box-shadow: var(--codex-shadow-dialog);
}
[data-slot='dropdown-menu-content'],
[data-slot='dropdown-menu-sub-content'],
[data-slot='context-menu-content'],
[data-slot='context-menu-sub-content'],
[data-slot='select-content'],
[data-slot='popover-content'],
[data-slot='command'] {
  border-radius: var(--codex-radius-card);
  border: 1px solid var(--dt-border);
  box-shadow: var(--codex-shadow-menu);
}
[data-slot='dropdown-menu-item'],
[data-slot='dropdown-menu-checkbox-item'],
[data-slot='dropdown-menu-radio-item'],
[data-slot='context-menu-item'],
[data-slot='context-menu-checkbox-item'],
[data-slot='select-item'],
[data-slot='command-item'] {
  border-radius: 0.375rem;
}
[data-slot='tooltip-content'] {
  border-radius: var(--codex-radius-row);
}

/* ── 左侧侧边栏（ChatGPT 式：行 8px 圆角、hover 淡灰、发丝分隔） ── */
[data-tour='sessions-sidebar'] :is(.bg-\\\\\\\\(--ui-row-active-background\\\\\\\\), .bg-\\\\\\\\(--ui-row-open-background\\\\\\\\)),
[data-tour='sessions-sidebar'] :is([class*='ui-row-active-background'], [class*='ui-row-open-background']) {
  border-radius: var(--codex-radius-row);
}
[data-tour='sessions-sidebar'] button:not([data-row-actions] button) {
  border-radius: var(--codex-radius-row);
}
[data-tour='sessions-sidebar'] [data-working='true'],
.arc-border.arc-row {
  border-radius: var(--codex-radius-row);
}
:root {
  --ui-row-active-background: color-mix(in srgb, var(--theme-foreground) 7%, transparent);
  --ui-row-open-background: color-mix(in srgb, var(--theme-foreground) 4%, transparent);
}

/* ── 插件设置页：Codex 面板卡片（标题卡 + 分组面板 + 发丝分隔行） ── */
.codex-settings {
  display: grid;
  gap: 16px;
  max-width: 640px;
}
.codex-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 2px 0;
}
.codex-settings-header-main {
  min-width: 0;
  flex: 1;
}
.codex-settings-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text-primary);
}
.codex-settings-status {
  font-size: 12px;
  color: var(--ui-text-tertiary);
  margin-top: 4px;
}
.codex-settings-panel {
  border: 1px solid var(--dt-border);
  border-radius: var(--codex-radius-card);
  background: var(--dt-card);
  overflow: hidden;
}
.codex-settings-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-tertiary);
  padding: 12px 16px 6px;
}
.codex-settings-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}
.codex-settings-row + .codex-settings-row {
  border-top: 1px solid var(--dt-border);
}
.codex-settings-row-main {
  flex: 1;
  min-width: 0;
}
.codex-settings-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text-primary);
}
.codex-settings-row-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ui-text-tertiary);
  margin-top: 3px;
}
.codex-settings-row-action {
  flex-shrink: 0;
  white-space: nowrap;
}
.codex-bubble-color {
  display: flex;
  align-items: center;
  gap: 8px;
}
.codex-bubble-color input[type='color'] {
  width: 42px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--dt-border);
  border-radius: var(--codex-radius-row);
  background: transparent;
  cursor: pointer;
}
.codex-bubble-color input[type='color'][data-unset='true'] {
  opacity: 0.45;
}
`

// 气泡颜色（配置了才发规则）：用户气泡沿用 --dt-user-bubble 合成通道（保留
// --user-bubble-keep 的气泡透明度），亮暗两条与基底同选择器、同特异性，靠同
// 样式表内注入顺序覆盖；助手气泡默认无底色，配置背景后才包出圆角气泡。
// 文字色规则带 html 前缀把特异性抬到 0,2,1+，压过 app 的同名工具类，
// 不依赖注入顺序。
function bubbleColorBlocks(p) {
  const blocks = []
  const userScope = "[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions']"
  if (p.bubbleUserBg) {
    const mix = `color-mix(in srgb, ${p.bubbleUserBg} var(--user-bubble-keep, 100%), transparent)`
    blocks.push(`${userScope} {\n  --dt-user-bubble: ${mix};\n}`)
    blocks.push(`html.dark ${userScope} {\n  --dt-user-bubble: ${mix};\n}`)
  }
  if (p.bubbleUserText) {
    blocks.push(`html ${userScope} .composer-human-message {\n  color: ${p.bubbleUserText};\n}`)
  }
  const assistantDecls = []
  if (p.bubbleAssistantBg) {
    assistantDecls.push(
      `background: ${p.bubbleAssistantBg}`,
      'border-radius: var(--codex-radius-card)',
      'padding: var(--codex-bubble-pad-y) var(--codex-bubble-pad-x)'
    )
  }
  if (p.bubbleAssistantText) assistantDecls.push(`color: ${p.bubbleAssistantText}`)
  if (assistantDecls.length) {
    blocks.push(`html [data-slot='aui_assistant-message-content'] {\n  ${assistantDecls.join(';\n  ')};\n}`)
  }
  return blocks
}

function buildCustomCSS(prefs) {
  const p = prefs || normalizePrefs(storage ? storage.get('prefs', null) : null)
  const blocks = [DENSITY_RULES[p.density], ...bubbleColorBlocks(p)].filter(Boolean)
  // 档位规则用 !important：主题每次应用都把 --dt-font-* 写在 <html> 内联样式上，
  // 普通规则压不过内联，重要声明可以（已在 Chromium 实测）；「默认」档不发规则。
  const textPreset = TEXT_FONTS.find(o => o.value === p.fontText)
  if (textPreset?.stack) {
    blocks.push(`html {\n  --dt-font-sans: ${textPreset.stack} !important;\n}`)
    // 输入区反压已并入 customCSSBase（无条件覆盖 :lang(zh) 规则），此处无需按档位重发。
    // 可读性渲染增强（如衬线档的小字号描边）随档位发出，继承到全部文本。
    if (textPreset.legibility) blocks.push(`html {\n  ${textPreset.legibility}\n}`)
  }
  const codeStack = CODE_FONTS.find(o => o.value === p.fontCode)?.stack
  if (codeStack) blocks.push(`html {\n  --dt-font-mono: ${codeStack} !important;\n}`)
  return `${customCSSBase}\n:root {\n  --composer-width: ${p.colWidth};\n}\n${blocks.join('\n')}\n`
}

const codexTheme = {
  name: 'codex',
  colors: light,
  darkColors: dark,
  typography: {
    // 栈内不放显式中文字体名：ui-sans-serif / generic sans-serif 在 -webkit-locale
    // "en" 下 CJK 落系统 UI 变体（.蘋方 UI Text-簡，ZCode 同款观感）。栈里只要在
    // generic 之前出现任何显式中文字体名（含私有变体名 '.蘋方 UI Text-簡'——它
    // 直写时 CJK 反而解析成普通苹方），UI 变体就会被截胡（CDP 逐项实测确认）。
    // CJK 兜底交给系统回退（Linux fontconfig 出 Noto Sans CJK，Windows 出雅黑）。
    fontSans:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', emoji",
    // 等宽栈同理：不列显式 CJK 名，generic monospace 在 macOS 落 Menlo，CJK 随
    // locale 走系统回退（与 ZCode 的 --font-mono 行为一致）。
    fontMono:
      "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', emoji",
    // 根行高（画到 --dt-line-height）：正文、消息内容、界面文字统一的行距基线。
    // 1.4286 对齐 ZCode 的 20px 行距（正文 0.875rem × 1.4286 ≈ 20px）；1.7 是正文
    // 还是 0.9375rem 时代的值，偏松。「内容间距」档位会按 pref 生成 :root 声明覆盖此值。
    lineHeight: '1.4286'
  }
}

// ─── 设置页（设置 → 插件 → Codex Theme）────────────────────────────────────────

// 自带文案（不改 app 的 i18n 目录）；默认跟随系统/应用语言，缺省回退英文，
// 也可在设置页固定为中文或英文（prefs.language）。
const LOCALES = {
  en: {
    title: 'Codex Theme',
    themeLabel: 'Codex',
    themeDescription: 'Codex × ChatGPT · dual palette (light/dark) · follows the system appearance',
    paletteApply: 'Theme: Use Codex theme',
    paletteSettings: 'Theme: Codex theme settings',
    status: name => `Active: ${name} · dual palette (light/dark), design language after OpenAI Codex & ChatGPT`,
    reapply: 'Reapply',
    reapplied: 'Codex theme reapplied',
    panelAppearance: 'Appearance',
    modeLabel: 'Appearance mode',
    modeHint: '“Follow system” switches light/dark with the macOS appearance. Text size stays under Settings → Appearance.',
    followSystem: 'Follow system',
    dark: 'Dark',
    light: 'Light',
    panelTypography: 'Typography & layout',
    widthLabel: 'Reading width',
    widthHint: 'Prose column width — Compact 768px · Comfortable 880px · Roomy 992px (ChatGPT uses 720–768px).',
    densityLabel: 'Content spacing',
    densityHint: 'Line height and paragraph rhythm — Compact 1.55 · Comfortable 1.7 (default) · Roomy 1.8.',
    compact: 'Compact',
    comfortable: 'Comfortable',
    roomy: 'Roomy',
    fontLabel: 'Text font',
    fontHint: 'Typeface for UI and prose. “Default” keeps the theme/app font settings; every preset carries Chinese fallbacks so mixed Chinese/English text renders well.',
    codeLabel: 'Code font',
    codeHint: 'Monospace for code blocks and inline code, with Chinese fallbacks. Fira Code / JetBrains Mono must be installed locally — otherwise the system mono kicks in.',
    fontDefault: 'Default',
    fontSerif: 'Serif',
    fontMonoText: 'Mono',
    fontFira: 'Fira Code',
    fontCourier: 'Courier',
    panelBubbles: 'Chat bubbles',
    bubbleUserBgLabel: 'User bubble background',
    bubbleUserBgHint: 'Your message bubble. “Default” keeps the theme gray (#F3F3F3 light / #202020 dark, still mixed with the bubble-transparency setting). The picked color is used in both light and dark, applies instantly and is remembered.',
    bubbleUserTextLabel: 'User bubble text',
    bubbleUserTextHint: 'Text inside your own bubbles. “Default” keeps the theme foreground.',
    bubbleAssistantBgLabel: 'Assistant bubble background',
    bubbleAssistantBgHint: 'Behind the assistant reply. “Default” keeps it transparent (no bubble); picking a color wraps the reply in a rounded bubble, same color in light and dark.',
    bubbleAssistantTextLabel: 'Assistant bubble text',
    bubbleAssistantTextHint: 'Text of assistant replies. “Default” keeps the theme foreground.',
    colorDefault: 'Default',
    panelGeneral: 'General',
    focusLabel: 'Input focus',
    focusHint: 'Whether the input box pulls focus back when the pointer moves over the chat or you click outside. “Hands off” (default) keeps focus where you put it — the input takes focus only at app start, when a new session opens, or when you click or type into it. “Follow mouse” restores the built-in behavior, where focus jumps to the input as the pointer moves.',
    focusHandsOff: 'Hands off',
    focusFollowMouse: 'Follow mouse',
    languageLabel: 'Language',
    languageHint: 'Language for this plugin’s UI (settings, palette, popups) — follows the system & app language by default, or pin it below.',
    langZh: '中文',
    langEn: 'English',
    feedbackLabel: 'Feedback',
    feedbackHint: 'Found a bug or have a suggestion? Report it on GitHub Issues.',
    feedbackAction: 'Open GitHub Issues'
  },
  zh: {
    title: 'Codex 主题',
    themeLabel: 'Codex',
    themeDescription: 'Codex × ChatGPT · 亮暗双套 · 随系统切换',
    paletteApply: 'Theme: 使用 Codex 主题',
    paletteSettings: 'Theme: Codex 主题设置',
    status: name => `当前生效：${name} · 亮暗双套，设计语言学自 OpenAI Codex 与 ChatGPT`,
    reapply: '重新应用',
    reapplied: 'Codex 主题已重新应用',
    panelAppearance: '外观',
    modeLabel: '亮暗模式',
    modeHint: '「跟随系统」自动跟随 macOS 外观。正文字号沿用「外观」设置，此处不覆盖。',
    followSystem: '跟随系统',
    dark: '深色',
    light: '浅色',
    panelTypography: '排版与布局',
    widthLabel: '阅读宽度',
    widthHint: '正文列宽 —— 紧凑 768px · 舒适 880px · 宽松 992px（ChatGPT 为 720–768px）。',
    densityLabel: '内容间距',
    densityHint: '行距与段落节奏 —— 紧凑 1.55 · 舒适 1.7（默认）· 宽松 1.8。',
    compact: '紧凑',
    comfortable: '舒适',
    roomy: '宽松',
    fontLabel: '正文字体',
    fontHint: '界面与正文的字体。「默认」沿用主题与应用的字体设置；其余档位带中文回退，中英文混排皆可读。',
    codeLabel: '代码字体',
    codeHint: '代码块与行内代码的等宽字体，中文按苹方/雅黑回退。Fira Code、JetBrains Mono 需本机已安装，否则自动回退系统等宽。',
    fontDefault: '默认',
    fontSerif: '衬线',
    fontMonoText: '等宽',
    fontFira: 'Fira Code',
    fontCourier: 'Courier',
    panelBubbles: '对话气泡',
    bubbleUserBgLabel: '用户气泡背景',
    bubbleUserBgHint: '你自己消息的气泡底色。「默认」为主题灰（浅 #F3F3F3 / 深 #202020，仍与「气泡透明度」合成）。选色亮暗两套同样生效，改完立即生效并自动记住。',
    bubbleUserTextLabel: '用户气泡文字',
    bubbleUserTextHint: '你自己气泡里的文字颜色。「默认」跟随主题正文色。',
    bubbleAssistantBgLabel: '助手气泡背景',
    bubbleAssistantBgHint: '助手回复的底色。「默认」透明（无气泡，直接落在画布上）；选色后回复会被圆角气泡包起，亮暗两套同一颜色。',
    bubbleAssistantTextLabel: '助手气泡文字',
    bubbleAssistantTextHint: '助手回复的文字颜色。「默认」跟随主题正文色。',
    colorDefault: '默认',
    panelGeneral: '通用',
    focusLabel: '输入框焦点',
    focusHint: '鼠标移过聊天区或点击外部时，输入框是否把焦点抢回去。「防抢占」（默认）让焦点停在你放的位置 —— 只在应用启动、切换新会话、或你直接点击/键入输入框时聚焦；「跟随鼠标」恢复应用自带行为：鼠标一动，焦点就跳回输入框。',
    focusHandsOff: '防抢占',
    focusFollowMouse: '跟随鼠标',
    languageLabel: '语言',
    languageHint: '本插件界面（设置页、⌘K、弹窗）的显示语言 —— 默认跟随系统与应用语言，也可固定为中文或英文。',
    langZh: '中文',
    langEn: 'English',
    feedbackLabel: '反馈问题',
    feedbackHint: '遇到问题或有功能建议？到 GitHub Issues 反馈。',
    feedbackAction: '打开 GitHub Issues'

  }
}

function lookupMessage(locale, key, args) {
  const bundle = locale === 'zh' ? LOCALES.zh : LOCALES.en
  const value = bundle[key] !== undefined ? bundle[key] : LOCALES.en[key]
  if (value === undefined) return key
  return typeof value === 'function' ? value(...args) : value
}

// prefs.language 固定为 zh/en 时绕过应用语言；'system' 交给 SDK 的翻译器
// （跟随系统/应用语言，缺省回退英文）。fallbackT：ctx.i18n.t 或 usePluginI18n(ID)。
function makeT(fallbackT) {
  return (key, ...args) => {
    const lang = getPref('language')
    return lang === 'system' ? fallbackT(key, ...args) : lookupMessage(lang, key, args)
  }
}

function buildTheme(t, prefs) {
  return {
    ...codexTheme,
    label: t('themeLabel'),
    description: t('themeDescription'),
    customCSS: buildCustomCSS(prefs)
  }
}

function SettingsRow({ title, hint, control }) {
  return jsxs('div', {
    className: 'codex-settings-row',
    children: [
      jsxs('div', {
        className: 'codex-settings-row-main',
        children: [
          jsx('div', { className: 'codex-settings-row-title', children: title }),
          jsx('div', { className: 'codex-settings-row-hint', children: hint })
        ]
      }),
      jsx('div', { className: 'codex-settings-row-action', children: control })
    ]
  })
}

function SettingsPanel({ title, rows }) {
  return jsxs('section', {
    className: 'codex-settings-panel',
    children: [
      jsx('div', { className: 'codex-settings-panel-title', children: title }),
      ...rows
    ]
  })
}

// 拾色器必须有具体值：未配置时显示主题默认色做预览（data-unset 淡显），
// 点「默认」清空偏好（不覆盖），外观回到主题原色。
const BUBBLE_SWATCH_FALLBACK = {
  bubbleUserBg: '#f3f3f3',
  bubbleUserText: '#1a1a1a',
  bubbleAssistantBg: '#ffffff',
  bubbleAssistantText: '#1a1a1a'
}

function ColorSwatch({ prefKey, value, onChange, onReset, resetLabel }) {
  return jsxs('div', {
    className: 'codex-bubble-color',
    children: [
      jsx('input', {
        type: 'color',
        'data-unset': value ? 'false' : 'true',
        value: value || BUBBLE_SWATCH_FALLBACK[prefKey],
        onChange: e => onChange(e.target.value)
      }),
      jsx(Button, { variant: 'outline', size: 'sm', onClick: onReset, children: resetLabel })
    ]
  })
}

function SettingsPage() {
  const t = makeT(usePluginI18n(ID))
  const { mode, setMode, themeName } = useTheme()
  const [colWidth, setColWidth] = useState(() => getPref('colWidth'))
  const [language, setLanguage] = useState(() => getPref('language'))
  const [density, setDensity] = useState(() => getPref('density'))
  const [fontText, setFontText] = useState(() => getPref('fontText'))
  const [fontCode, setFontCode] = useState(() => getPref('fontCode'))
  const [bubbleUserBg, setBubbleUserBg] = useState(() => getPref('bubbleUserBg'))
  const [bubbleUserText, setBubbleUserText] = useState(() => getPref('bubbleUserText'))
  const [bubbleAssistantBg, setBubbleAssistantBg] = useState(() => getPref('bubbleAssistantBg'))
  const [bubbleAssistantText, setBubbleAssistantText] = useState(() => getPref('bubbleAssistantText'))
  const [focusGuard, setFocusGuard] = useState(() => getPref('focusGuard'))

  const pickWidth = value => {
    setPref('colWidth', value)
    setColWidth(value)
  }

  const pickLanguage = value => {
    setPref('language', value)
    setLanguage(value)
  }

  const pickDensity = value => {
    setPref('density', value)
    setDensity(value)
  }

  const pickTextFont = value => {
    setPref('fontText', value)
    setFontText(value)
  }

  const pickCodeFont = value => {
    setPref('fontCode', value)
    setFontCode(value)
  }

  const pickBubbleColor = (key, setter) => value => {
    const v = normalizeColor(value)
    if (!v) return
    setPref(key, v)
    setter(v)
  }

  const resetBubbleColor = (key, setter) => () => {
    setPref(key, '')
    setter('')
  }

  const pickFocusGuard = value => {
    setPref('focusGuard', value)
    setFocusGuard(value)
  }

  return jsxs('div', {
    className: 'codex-settings',
    children: [
      jsxs('div', {
        className: 'codex-settings-header',
        children: [
          jsxs('div', {
            className: 'codex-settings-header-main',
            children: [
              jsx('div', { className: 'codex-settings-title', children: t('title') }),
              jsx('div', { className: 'codex-settings-status', children: t('status', themeName) })
            ]
          }),
          jsx('div', {
            className: 'codex-settings-row-action',
            children: jsx(Button, {
              variant: 'outline',
              size: 'sm',
              onClick: () => {
                requestTheme('codex')
                applyPrefs()
                host.notify({ kind: 'info', message: t('reapplied') })
              },
              children: t('reapply')
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelAppearance'),
        rows: [
          jsx(SettingsRow, {
            key: 'mode',
            title: t('modeLabel'),
            hint: t('modeHint'),
            control: jsx(SegmentedControl, {
              value: mode,
              onChange: v => setMode(v),
              options: [
                { id: 'system', label: t('followSystem') },
                { id: 'dark', label: t('dark') },
                { id: 'light', label: t('light') }
              ]
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelTypography'),
        rows: [
          jsx(SettingsRow, {
            key: 'width',
            title: t('widthLabel'),
            hint: t('widthHint'),
            control: jsx(SegmentedControl, {
              value: colWidth,
              onChange: pickWidth,
              options: COL_WIDTHS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'density',
            title: t('densityLabel'),
            hint: t('densityHint'),
            control: jsx(SegmentedControl, {
              value: density,
              onChange: pickDensity,
              options: DENSITIES.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'textFont',
            title: t('fontLabel'),
            hint: t('fontHint'),
            control: jsx(SegmentedControl, {
              value: fontText,
              onChange: pickTextFont,
              options: TEXT_FONTS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'codeFont',
            title: t('codeLabel'),
            hint: t('codeHint'),
            control: jsx(SegmentedControl, {
              value: fontCode,
              onChange: pickCodeFont,
              options: CODE_FONTS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelBubbles'),
        rows: [
          jsx(SettingsRow, {
            key: 'bubbleUserBg',
            title: t('bubbleUserBgLabel'),
            hint: t('bubbleUserBgHint'),
            control: jsx(ColorSwatch, {
              prefKey: 'bubbleUserBg',
              value: bubbleUserBg,
              onChange: pickBubbleColor('bubbleUserBg', setBubbleUserBg),
              onReset: resetBubbleColor('bubbleUserBg', setBubbleUserBg),
              resetLabel: t('colorDefault')
            })
          }),
          jsx(SettingsRow, {
            key: 'bubbleUserText',
            title: t('bubbleUserTextLabel'),
            hint: t('bubbleUserTextHint'),
            control: jsx(ColorSwatch, {
              prefKey: 'bubbleUserText',
              value: bubbleUserText,
              onChange: pickBubbleColor('bubbleUserText', setBubbleUserText),
              onReset: resetBubbleColor('bubbleUserText', setBubbleUserText),
              resetLabel: t('colorDefault')
            })
          }),
          jsx(SettingsRow, {
            key: 'bubbleAssistantBg',
            title: t('bubbleAssistantBgLabel'),
            hint: t('bubbleAssistantBgHint'),
            control: jsx(ColorSwatch, {
              prefKey: 'bubbleAssistantBg',
              value: bubbleAssistantBg,
              onChange: pickBubbleColor('bubbleAssistantBg', setBubbleAssistantBg),
              onReset: resetBubbleColor('bubbleAssistantBg', setBubbleAssistantBg),
              resetLabel: t('colorDefault')
            })
          }),
          jsx(SettingsRow, {
            key: 'bubbleAssistantText',
            title: t('bubbleAssistantTextLabel'),
            hint: t('bubbleAssistantTextHint'),
            control: jsx(ColorSwatch, {
              prefKey: 'bubbleAssistantText',
              value: bubbleAssistantText,
              onChange: pickBubbleColor('bubbleAssistantText', setBubbleAssistantText),
              onReset: resetBubbleColor('bubbleAssistantText', setBubbleAssistantText),
              resetLabel: t('colorDefault')
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelGeneral'),
        rows: [
          jsx(SettingsRow, {
            key: 'focusGuard',
            title: t('focusLabel'),
            hint: t('focusHint'),
            control: jsx(SegmentedControl, {
              value: focusGuard,
              onChange: pickFocusGuard,
              options: [
                { id: 'guard', label: t('focusHandsOff') },
                { id: 'follow', label: t('focusFollowMouse') }
              ]
            })
          }),
          jsx(SettingsRow, {
            key: 'language',
            title: t('languageLabel'),
            hint: t('languageHint'),
            control: jsx(SegmentedControl, {
              value: language,
              onChange: pickLanguage,
              options: [
                { id: 'system', label: t('followSystem') },
                { id: 'zh', label: t('langZh') },
                { id: 'en', label: t('langEn') }
              ]
            })
          }),
          jsx(SettingsRow, {
            key: 'feedback',
            title: t('feedbackLabel'),
            hint: t('feedbackHint'),
            control: jsx(Button, {
              variant: 'outline',
              size: 'sm',
              onClick: openIssues,
              children: t('feedbackAction')
            })
          })
        ]
      })
    ]
  })
}

// ─── 输入对话框拖拽（弹窗式移动）────────────────────────────────────────────
// 把手 = 对话框顶缘（grip 按钮 + 顶条 24px 带），按住拖动整个 composer-dock。
// 与 app 自带 pop-out 手势分区共存：app 的 5px 抓取环只暴露在左右两条边，且
// 其 pointerdown 对 button 一律让行；弹出态（data-popped-out）与 HUD 壳（自带
// 窗口级拖拽）完全不接管。定位语义与 app pop-out 同款：fixed + bottom/right
// 内缩（草稿长高向上扩，落点不漂移），双击把手回坞。
// 三条通道各司其职，全程不扫描、不监听 app DOM：
//   1) 事件委托：pointerdown 从事件目标 closest 出把手，只认领把手区的按下；
//   2) 落点写插件自有 CSS 变量 + data-codex-float，边界钳制交给规则里的
//      clamp() —— 视口实时、高度随 --composer-measured-height 走，换屏/长草稿
//      都不会溢出视口；
//   3) 位置保留按面板锚点（data-session-anchor）生成恢复规则，重挂载的
//      composer 靠 CSS 自己找回落点。落点用完即弃（双击回坞）不留状态。

const DRAG_HANDLE_ZONE_PX = 12
const DRAG_THRESHOLD_PX = 3
const DRAG_CLICK_SWALLOW_MS = 400
const DRAG_CLICK_REPLAY_MS = 250
const DRAG_SWALLOW_RADIUS_PX = 32
const DRAG_POS_KEY = 'composerDragPositions'
const DRAG_POS_CAP = 12
const DRAG_STYLE_ID = 'codex-theme-composer-drag'
const DRAG_GRIP_SELECTOR = '[data-slot="status-drawer-toggle"]'
const DRAG_INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"]), ' +
  '[data-slot="composer-rich-input"], [role="menuitem"], [data-radix-popper-content-wrapper]'

// 行为 CSS（浮动定位、把手 grab、拖动态 grabbing、:is(*,*) 瞬态）：不进主题
// customCSS，统一住在插件自有 style#codex-theme-composer-drag 里随插件生死 ——
// 非 Codex 主题下拖拽不再撕裂，主题切换/卸载零残留。外观阴影继续引用主题的
// --codex-shadow-*。
const DRAG_BEHAVIOR_CSS = `/* data-codex-float：脱坞后的 fixed 定位 —— bottom/right 内缩 + 冻结宽度，
   与 app pop-out 同一套落点语义（草稿长高向上扩，落点不漂移）。
   :not([data-popped-out]) 把 app 自己的弹出态整段让位，两套定位永不叠加。 */
[data-slot='composer-dock'][data-codex-float]:not([data-popped-out]) {
  position: fixed;
  left: auto;
  translate: none;
  right: clamp(8px, var(--codex-float-right), calc(100vw - var(--codex-float-width) - 8px));
  bottom: clamp(8px, var(--codex-float-bottom), calc(100vh - var(--composer-measured-height, 4.5rem) - 8px));
  width: var(--codex-float-width);
  max-width: calc(100vw - 1rem);
}

/* 把手：顶缘 grip 按钮即拖动把手（单击仍是状态抽屉开关，按住拖动才移动） */
[data-slot='status-drawer-toggle'] {
  cursor: grab;
}

/* 拖动中：全局 grabbing 光标 + 禁选，避免拖过输入区拉出文本选区 */
html[data-codex-composer-drag],
html[data-codex-composer-drag] :is(*, *::before, *::after) {
  cursor: grabbing;
}
html[data-codex-composer-drag] :is(*, *::before, *::after) {
  user-select: none !important;
}

/* 拖动态抬升：用纯 elevation 的 --codex-shadow-composer-focus（与聚焦态同一语言；
   --codex-shadow-dialog 尾层带 1px ring，会与 1px 实边框叠成双发丝线） */
html[data-codex-composer-drag] [data-slot='composer-surface'] {
  box-shadow: var(--codex-shadow-composer-focus) !important;
}`

// 与 DRAG_BEHAVIOR_CSS 的 [data-codex-float] 规则同一套声明（含 8px 边距的 clamp），
// 按锚点生成恢复规则时内联进规则本体，让落点找回不需要任何 JS 接触 DOM。
const DRAG_MECHANICS =
  'position:fixed;left:auto;translate:none;' +
  'right:clamp(8px,var(--codex-float-right),calc(100vw - var(--codex-float-width) - 8px));' +
  'bottom:clamp(8px,var(--codex-float-bottom),calc(100vh - var(--composer-measured-height,4.5rem) - 8px));' +
  'width:var(--codex-float-width);max-width:calc(100vw - 1rem);'

let dragSession = null
let dragSwallowClicksUntil = 0
let dragSwallowPoint = null
let dragGripClickTimer = null
let dragGripClickEl = null
let dragReplayingClick = false

const dragClamp = (value, lo, hi) => Math.min(Math.max(value, lo), Math.max(lo, hi))

// fixed 定位的包含块是布局视口：right/bottom 内缩必须对 clientWidth/Height
// 算，window.innerWidth 含滚动条宽度会整段偏移一个滚动条位。
function dragViewport() {
  return {
    height: document.documentElement.clientHeight || window.innerHeight,
    width: document.documentElement.clientWidth || window.innerWidth
  }
}

function dragAnchor(dock) {
  return dock.closest('[data-chat-surface]')?.dataset.sessionAnchor || null
}

function dragSavedPositions() {
  const raw = storage ? storage.get(DRAG_POS_KEY, null) : null
  return raw && typeof raw === 'object' ? raw : {}
}

function dragCssString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')
}

// 恢复规则集整体重渲染：锚点数量个位数，整段替换比逐条增删更不易留脏规则。
// 行为 CSS 与恢复规则同格渲染（双通道永不撕裂）；元素按需生成 —— 有落点记录
// 或开始拖动时才进 DOM，卸载即移除。
function dragCreateStyle() {
  const el = document.createElement('style')
  el.id = DRAG_STYLE_ID
  document.head.appendChild(el)
  return el
}

function dragRenderRules() {
  const rules = Object.entries(dragSavedPositions())
    .filter(([, p]) => p && [p.bottom, p.right, p.width].every(Number.isFinite))
    .map(
      ([anchor, p]) =>
        `[data-chat-surface][data-session-anchor='${dragCssString(anchor)}'] ` +
        `[data-slot='composer-dock']:not([data-popped-out]){` +
        `--codex-float-bottom:${p.bottom}px;--codex-float-right:${p.right}px;--codex-float-width:${p.width}px;` +
        DRAG_MECHANICS +
        `}`
    )
    .join('\n')
  const existing = document.getElementById(DRAG_STYLE_ID)
  if (!existing && !rules) return
  const el = existing || dragCreateStyle()
  const next = rules ? `${DRAG_BEHAVIOR_CSS}\n${rules}` : DRAG_BEHAVIOR_CSS
  if (el.textContent !== next) el.textContent = next
}

function dragEnsureStyle() {
  if (!document.getElementById(DRAG_STYLE_ID)) {
    dragCreateStyle()
    dragRenderRules()
  }
}

function dragSavePosition(anchor, placement) {
  if (!storage || !anchor) return
  const all = dragSavedPositions()
  all[anchor] = { bottom: placement.bottom, right: placement.right, t: Date.now(), width: placement.width }
  const keys = Object.keys(all)
  const stale = keys.sort((a, b) => (all[a].t || 0) - (all[b].t || 0)).slice(0, Math.max(0, keys.length - DRAG_POS_CAP))
  for (const key of stale) delete all[key]
  storage.set(DRAG_POS_KEY, all)
  dragRenderRules()
}

function dragForgetPosition(anchor) {
  if (!storage || !anchor) return
  const all = dragSavedPositions()
  if (!(anchor in all)) return
  delete all[anchor]
  storage.set(DRAG_POS_KEY, all)
  dragRenderRules()
}

// 落点整盒钳进视口（留白 8px，与 DRAG_MECHANICS 的 clamp 同界）：存的是
// 渲染态的最终落点，恢复后原样复现。
function dragClampPlacement(placement, height) {
  const vp = dragViewport()
  return {
    bottom: dragClamp(placement.bottom, 8, vp.height - height - 8),
    right: dragClamp(placement.right, 8, vp.width - placement.width - 8),
    width: placement.width
  }
}

// 脱坞中的 dock 集合：卸载时逐个回坞（宿主不提供 querySelectorAll 时的保底依据）。
const dragFloated = new Set()

function dragApply(dock, placement) {
  dock.style.setProperty('--codex-float-bottom', placement.bottom + 'px')
  dock.style.setProperty('--codex-float-right', placement.right + 'px')
  dock.style.setProperty('--codex-float-width', placement.width + 'px')
  dock.setAttribute('data-codex-float', '')
  dragFloated.add(dock)
}

function dragClear(dock) {
  dock.removeAttribute('data-codex-float')
  dock.style.removeProperty('--codex-float-bottom')
  dock.style.removeProperty('--codex-float-right')
  dock.style.removeProperty('--codex-float-width')
  dragFloated.delete(dock)
}

function dragFindTarget(event) {
  if (event.button !== 0) return null
  const el = event.target instanceof Element ? event.target : null
  if (!el) return null
  const root = el.closest('[data-slot="composer-root"]')
  if (!root || root.hasAttribute('data-popped-out')) return null
  if (root.closest('[data-hud-shell]')) return null
  const dock = root.closest('[data-slot="composer-dock"]')
  if (!dock || dock.hasAttribute('data-popped-out')) return null
  if (!el.closest(DRAG_GRIP_SELECTOR)) {
    if (el.closest(DRAG_INTERACTIVE_SELECTOR)) return null
    const rect = root.getBoundingClientRect()
    if (
      rect.width <= 0 ||
      event.clientX < rect.left - 4 ||
      event.clientX > rect.right + 4 ||
      event.clientY < rect.top - DRAG_HANDLE_ZONE_PX ||
      event.clientY > rect.top + DRAG_HANDLE_ZONE_PX
    ) {
      return null
    }
  }
  return { dock, root }
}

function dragFlush(session) {
  const pending = session.pending
  if (!pending) return
  session.pending = null
  const rect = session.rect
  const vp = dragViewport()
  // 原始位移直写：渲染钳制在规则的 clamp() 里做，回拖不带边界粘滞。
  session.placement = {
    bottom: vp.height - rect.bottom - pending.dy,
    right: vp.width - rect.right - pending.dx,
    width: rect.width
  }
  dragApply(session.dock, session.placement)
}

function dragSchedule(session) {
  if (session.raf !== null) return
  session.raf = requestAnimationFrame(() => {
    session.raf = null
    dragFlush(session)
  })
}

function dragOnPointerDown(event) {
  const target = dragFindTarget(event)
  if (!target) return
  dragEnsureStyle()
  dragCancelGripClick()
  const rect = target.dock.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  dragSession = {
    captureEl: event.target instanceof Element ? event.target : target.root,
    dock: target.dock,
    moved: false,
    pending: null,
    placement: null,
    pointerId: event.pointerId,
    raf: null,
    rect,
    startX: event.clientX,
    startY: event.clientY
  }
  // 把手区的按下整段认领：app 表单上的 pop-out 手势与草稿同步都看不到它，
  // 单击（无位移）不受影响 —— grip 的开关点击照常走 click。
  event.stopPropagation()
  dragSession.captureEl.setPointerCapture?.(event.pointerId)
}

function dragOnPointerMove(event) {
  const session = dragSession
  if (!session || event.pointerId !== session.pointerId) return
  const dx = event.clientX - session.startX
  const dy = event.clientY - session.startY
  if (!session.moved) {
    if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return
    session.moved = true
    document.documentElement.setAttribute('data-codex-composer-drag', '')
  }
  event.preventDefault()
  session.pending = { dx, dy }
  dragSchedule(session)
}

function dragEnd(event) {
  const session = dragSession
  if (!session || (event && event.pointerId !== session.pointerId)) return
  if (session.raf !== null) {
    cancelAnimationFrame(session.raf)
    session.raf = null
  }
  dragFlush(session)
  dragSession = null
  document.documentElement.removeAttribute('data-codex-composer-drag')
  if (session.moved && event && event.type === 'pointerup') {
    // 位移过的按下收尾必带一次 click（落在把手上会误触抽屉开关）——吞掉。
    // 只有真正的 pointerup 才会派发收尾 click：pointercancel / blur / capture
    // 元素卸载这三条路径不带 click，不开吞噬窗（否则误吞用户随后的真实点击）。
    // 吞噬范围另收紧到把手区/松手坐标附近，见 dragInSwallowRegion。
    dragSwallowClicksUntil = performance.now() + DRAG_CLICK_SWALLOW_MS
    dragSwallowPoint = { x: event.clientX, y: event.clientY }
  } else {
    dragSwallowClicksUntil = 0
    dragSwallowPoint = null
  }
  if (session.moved) {
    // 存渲染态的最终落点（clamp 后），恢复后与松手时逐像素一致。
    // 换算与 dragFlush 同用 dragViewport()（布局视口）：window.innerWidth 含
    // 滚动条宽，混用会把落点整体偏移一个滚动条宽并写进持久化。
    const rect = session.dock.getBoundingClientRect()
    const vp = dragViewport()
    const placement = dragClampPlacement(
      { bottom: vp.height - rect.bottom, right: vp.width - rect.right, width: rect.width },
      rect.height
    )
    dragApply(session.dock, placement)
    dragSavePosition(dragAnchor(session.dock), placement)
  }
  const el = session.captureEl
  if (el?.hasPointerCapture?.(session.pointerId)) el.releasePointerCapture(session.pointerId)
}

// 吞噬范围：把手区（收尾 click 被 pointer capture 定向到这里）或松手坐标 32px 内。
// 范围外的点击是用户真实点击，一律放行。
function dragInSwallowRegion(event) {
  const el = event.target instanceof Element ? event.target : null
  if (el && el.closest(DRAG_GRIP_SELECTOR)) return true
  const p = dragSwallowPoint
  return (
    !!p &&
    Math.abs(event.clientX - p.x) <= DRAG_SWALLOW_RADIUS_PX &&
    Math.abs(event.clientY - p.y) <= DRAG_SWALLOW_RADIUS_PX
  )
}

function dragScheduleGripClick(grip) {
  clearTimeout(dragGripClickTimer)
  dragGripClickEl = grip
  dragGripClickTimer = setTimeout(() => {
    dragGripClickTimer = null
    const el = dragGripClickEl
    dragGripClickEl = null
    if (!el || !el.isConnected) return
    dragReplayingClick = true
    try {
      el.click()
    } finally {
      dragReplayingClick = false
    }
  }, DRAG_CLICK_REPLAY_MS)
}

function dragCancelGripClick() {
  clearTimeout(dragGripClickTimer)
  dragGripClickTimer = null
  dragGripClickEl = null
}

function dragOnClickCapture(event) {
  if (performance.now() < dragSwallowClicksUntil) {
    if (!dragInSwallowRegion(event)) return
    dragSwallowClicksUntil = 0
    dragSwallowPoint = null
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (dragReplayingClick) return
  const el = event.target instanceof Element ? event.target : null
  const grip = el && typeof el.closest === 'function' ? el.closest(DRAG_GRIP_SELECTOR) : null
  if (!grip) return
  // 把手「单击开关」延迟 250ms 放行：双击回坞的第二击紧随其后，dblclick 一到
  // 就撤销（dragCancelGripClick），避免单击开关被连发两次造成开-关闪烁。
  event.preventDefault()
  event.stopPropagation()
  dragScheduleGripClick(grip)
}

function dragOnDoubleClick(event) {
  const target = dragFindTarget(event)
  if (!target) return
  dragCancelGripClick()
  dragClear(target.dock)
  dragForgetPosition(dragAnchor(target.dock))
}

function installComposerDrag(ctx) {
  ctx.addEventListener(document, 'pointerdown', dragOnPointerDown, true)
  ctx.addEventListener(window, 'pointermove', dragOnPointerMove)
  ctx.addEventListener(window, 'pointerup', dragEnd)
  ctx.addEventListener(window, 'pointercancel', dragEnd)
  ctx.addEventListener(document, 'lostpointercapture', dragEnd, true)
  ctx.addEventListener(window, 'blur', () => dragEnd(null))
  ctx.addEventListener(document, 'click', dragOnClickCapture, true)
  ctx.addEventListener(document, 'dblclick', dragOnDoubleClick, true)

  // 已保存的落点在注册时就渲染成恢复规则：composer 何时挂载都能自己找回。
  dragRenderRules()

  ctx.onDispose(() => {
    dragCancelGripClick()
    dragEnd(null)
    for (const dock of [...dragFloated]) dragClear(dock)
    // 兜底再扫一遍脱坞标记（宿主缺 querySelectorAll 时上面的自持集合已覆盖）
    document.querySelectorAll?.('[data-codex-float]')?.forEach(dragClear)
    document.getElementById(DRAG_STYLE_ID)?.remove()
  })
}

// ─── 输入框焦点守卫（防抢占）─────────────────────────────────────────────
// 抢焦源头在 app 自己的 focus-follow（hermes-agent apps/desktop/src/app/chat/
// composer/floating-target.ts）：pointermove / focusin 派发里把焦点拉回输入框，
// 焦点被抢后 focusComposerInput（focus.ts）还会排 rAF + setTimeout(0) 两次重试。
// 拦截指纹取「派发现场」而不是猜意图：window.event 类型为 pointermove / focusin
// 时对输入框的 focus() 必是抢焦；其余派发上下文（click/keydown/…）和空上下文
// （启动初始聚焦、切会话回焦）一律放行。浏览器原生点击聚焦不走 focus()，
// 完全不受影响。抢焦被拦后 app 的两次空上下文重试，在重试窗内对同一元素
// 一并压掉；任何用户手势（pointerdown/keydown）一到就提前关窗。
const FOCUS_GUARD_EDITOR_SLOT = 'composer-rich-input'
const FOCUS_GUARD_STEAL_EVENTS = new Set(['pointermove', 'focusin'])
const FOCUS_GUARD_RETRY_WINDOW_MS = 250

function installFocusGuard(ctx) {
  const proto = typeof HTMLElement === 'undefined' ? null : HTMLElement.prototype
  if (!proto || typeof proto.focus !== 'function') return
  const original = proto.focus
  const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now())
  let live = true
  let retry = null
  let wrapped = null

  wrapped = function (...args) {
    const el = this
    const isEditor = Boolean(el && el.dataset && el.dataset.slot === FOCUS_GUARD_EDITOR_SLOT)
    const eventType = typeof window === 'undefined' || !window.event ? '' : window.event.type
    if (live && isEditor && getPref('focusGuard') === 'guard') {
      if (FOCUS_GUARD_STEAL_EVENTS.has(eventType)) {
        retry = { el, until: now() + FOCUS_GUARD_RETRY_WINDOW_MS }
        return undefined
      }
      if (!eventType && retry && retry.el === el && now() <= retry.until) return undefined
    }
    return original.apply(el, args)
  }
  proto.focus = wrapped

  const clearRetry = () => {
    retry = null
  }
  ctx.addEventListener(document, 'pointerdown', clearRetry, true)
  ctx.addEventListener(document, 'keydown', clearRetry, true)

  ctx.onDispose(() => {
    live = false
    retry = null
    if (proto.focus === wrapped) proto.focus = original
    wrapped = null
  })
}

// ─── 插件入口 ─────────────────────────────────────────────────────────────────

export default {
  id: ID,
  name: 'Codex Theme',
  // 面板描述的唯一来源（desktop 契约无 version/author 字段，尾注与 plugin.yaml 的 version/author 同步）
  description: 'Codex × ChatGPT inspired theme for the Hermes Desktop chat — dual light/dark palettes that follow the system appearance, graphite-on-paper typography with a 1.7 root line height and content-spacing presets (1.55/1.7/1.8), the OpenAI radius scale (inline 4px / rows 8px / controls 10px / cards 12px / composer 20px), hairline borders, and a bilingual Settings page (appearance mode, 768/880/992px reading width, text & code font presets, user/assistant chat bubble colors, input focus guard (hands-off / follow-mouse), zh/en language, GitHub Issues feedback). (v1.1.0 · ethanz-code)',
  register(ctx) {
    storage = ctx.storage
    pluginOs = ctx.os || null
    ctx.i18n.register(LOCALES)
    const t = makeT(ctx.i18n.t)
    registerThemeEntry = prefs => {
      ctx.register({ id: 'codex', area: THEMES_AREA, data: buildTheme(t, prefs) })
    }

    // 首次安装时自动接管一次主题；之后完全尊重用户在「外观」里的手动选择
    // （避免每次启动/热重载把用户选的其它主题抢回来）。切回 Codex：
    // 设置页「重新应用」或 ⌘K。
    if (!storage.get('installed', false)) {
      storage.set('installed', true)
      requestTheme('codex')
    }
    applyPrefs()
    ctx.onDispose(clearDatasetPrefs)
    installComposerDrag(ctx)
    installFocusGuard(ctx)

    // 装载确认（热重载/启动排查的地面真值，见 desktop.log）
    console.log('[codex-theme] register ok v1.1.0')

    // 注册期文案（主题名/描述、⌘K 标签、设置页标题）随语言重建：
    // 主题本体（外观设置网格 / ⌘K / /skin 皆可见）、设置 → 插件 → Codex Theme、⌘K 入口。
    let disposeStatic = () => {}

    const registerStatic = () => {
      disposeStatic()
      const disposeThemeAndPalette = ctx.registerMany([
        { id: 'codex', area: THEMES_AREA, data: buildTheme(t) },
        {
          id: 'palette-apply',
          area: PALETTE_AREA,
          data: {
            id: 'codex-theme.apply',
            label: t('paletteApply'),
            keywords: ['codex', 'theme', '主题', 'appearance', '外观'],
            run: () => {
              requestTheme('codex')
              applyPrefs()
            }
          }
        },
        {
          id: 'palette-settings',
          area: PALETTE_AREA,
          data: {
            id: 'codex-theme.settings',
            label: t('paletteSettings'),
            keywords: ['codex', 'theme', 'settings', '设置', '深色', '浅色', '亮', '暗', 'font', '字体', '代码'],
            run: () => host.navigate(pluginSettingsHref('codex-theme'))
          }
        }
      ])
      const disposeSettingsPage =
        typeof ctx.registerSettingsPage === 'function'
          ? ctx.registerSettingsPage({
              id: 'codex-theme',
              title: t('title'),
              icon: 'paintcan',
              render: () => jsx(SettingsPage, {})
            })
          : (console.error('[codex-theme] ctx.registerSettingsPage unavailable in this build'), () => {})
      disposeStatic = () => {
        disposeThemeAndPalette()
        disposeSettingsPage()
      }
    }

    registerStatic()
    ctx.i18n.onLocaleChange(registerStatic)
    ctx.onDispose(onLanguagePrefChange(registerStatic))
  }
}
