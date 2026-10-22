/**
 * codex-theme — Codex × ChatGPT 风格主题（亮/暗双套，随系统切换）
 *
 * 设计语言（学自 OpenAI Codex 应用 + ChatGPT Web 的设计精髓）：
 *   - 石墨纸感（graphite-on-paper）：近白画布 / 近黑 #181818，正文主导、chrome 克制
 *   - 无彩体系：灰阶承载层级（字重 600/500/400），蓝色 #339CFF 只做交互点缀
 *   - 发丝线代替阴影：1px 边框做层次，表面保持平整
 *   - 圆角体系：控件/侧栏行/卡片 10px，用户气泡 16px，输入区 16px
 *   - 间距节奏：6 / 10 / 16 / 24 的倍数递进
 *   - 阅读栏 768 / 880 / 992px 三档（默认 880px），行高 1.7 —— ChatGPT 式阅读节奏
 *
 * 控制入口（不在输入框加东西）：
 *   设置 → 插件 → Codex Theme：亮暗模式（跟随系统/深色/浅色）、阅读栏宽度（分段控件）
 *   ⌘K：「Theme: 使用 Codex 主题」「Theme: Codex 主题设置」
 *
 * 安装：~/.hermes/desktop-plugins/codex-theme/plugin.js（目录名 == id）
 */

import { Button, host, ListRow, PALETTE_AREA, pluginSettingsHref, requestTheme, SegmentedControl, THEMES_AREA, usePluginI18n, useTheme } from '@hermes/plugin-sdk'
import { useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'codex-theme'

// ─── 偏好（阅读栏宽度），注册时与设置页共用 ──────────────────────────────────
// 只动主题级的旋钮；不碰 Hermes 自己的配置项（如 --chat-text-scale 正文缩放、
// 聊天字体 display.chat_font、界面模式、透明度等），避免与设置互相覆盖。

// 三档阅读栏：窄 768 / 标准 880（默认）/ 宽 992px。标准档是「宽一点才够读」取向。
const COL_WIDTHS = [
  { value: '48rem', labelKey: 'narrow' },
  { value: '55rem', labelKey: 'standard' },
  { value: '62rem', labelKey: 'wide' }
]

const PREF_DEFAULTS = { colWidth: '55rem' }
let storage = null

function normalizeColWidth(value) {
  return COL_WIDTHS.some(o => o.value === value) ? value : PREF_DEFAULTS.colWidth
}

function getPref(key) {
  const v = storage ? storage.get('prefs', null) : null
  const raw = (v && v[key]) || PREF_DEFAULTS[key]
  return key === 'colWidth' ? normalizeColWidth(raw) : raw
}

function setPref(key, value) {
  const next = { ...PREF_DEFAULTS, ...((storage && storage.get('prefs', null)) || {}), [key]: value }
  if (storage) storage.set('prefs', next)
  applyPrefs(next)
}

function applyPrefs(prefs) {
  const stored = prefs || (storage ? storage.get('prefs', null) : null) || {}
  const p = { ...PREF_DEFAULTS, ...stored }
  document.documentElement.style.setProperty('--composer-width', normalizeColWidth(p.colWidth))
}

// ─── 双套配色（Codex 基准 + ChatGPT 石墨纸感的灰阶） ─────────────────────────

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
  border: '#2e2e2e',
  input: '#242424',
  ring: '#339cff',
  midground: '#339cff',
  midgroundForeground: '#ffffff',
  composerRing: '#339cff',
  destructive: '#e5484d',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#171717',
  sidebarBorder: '#2a2a2a',
  userBubble: '#262626',
  userBubbleBorder: '#2e2e2e'
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
  primary: '#0b72d9',
  primaryForeground: '#ffffff',
  secondary: '#f1f1f1',
  secondaryForeground: '#2c2c2c',
  accent: '#efefef',
  accentForeground: '#2c2c2c',
  border: '#e7e7e7',
  input: '#f6f6f6',
  ring: '#0b72d9',
  midground: '#0b72d9',
  midgroundForeground: '#ffffff',
  composerRing: '#0b72d9',
  destructive: '#c93a36',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#f9f9f9',
  sidebarBorder: '#ececec',
  userBubble: '#f4f4f4',
  userBubbleBorder: '#e7e7e7'
}

// ─── 样式基底（圆角体系 / 发丝线 / 间距节奏 / 侧栏） ─────────────────────────

const customCSS = `
/* 阅读栏与字号基线（默认阅读栏 880px；具体值由设置页 --composer-width 覆盖。
   行高走主题 typography.lineHeight（--dt-line-height: 1.7），此处只管阅读栏。 */
:root {
  --composer-width: 55rem;
  --conversation-text-base-size: 0.9375rem;
  --conversation-base-line-height: 1.5rem;
  --conversation-tool-base-size: 0.75rem;
  --conversation-caption-base-size: 0.75rem;
  --conversation-caption-base-line-height: 1rem;
  --paragraph-gap: 0.625rem;
  --turn-block-gap: 1.25rem;
  --tool-row-gap: 0.5rem;
}

/* 正文：ChatGPT 式阅读节奏 —— 字重承载层级，行距 1.7（与 --dt-line-height 一致，
   双保险：消息容器与 .aui-md 都显式声明，防止被内层 leading-* 类覆盖） */
[data-slot='aui_assistant-message-content'] {
  line-height: 1.7;
}
[data-slot='aui_assistant-message-content'] .aui-md {
  line-height: 1.7;
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

/* 用户气泡：ChatGPT 式信息块 —— 12px 圆角、发丝线、无阴影 */
.composer-human-message {
  border-radius: 0.75rem;
  padding: 0.625rem 0.875rem;
  box-shadow: none;
  border: 1px solid var(--dt-user-bubble-border);
  line-height: 1.7;
}

/* 代码块 / 代码卡片：10px 圆角 */
[data-slot='code-card'],
[data-slot='aui_user-fence'],
[data-slot='aui_assistant-message-content'] .aui-md [data-streamdown='code-block'] {
  border-radius: 0.625rem;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(:not(pre) > code),
[data-slot='aui_user-inline-code'] {
  border-radius: 0.1875rem;
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
  border-radius: 0.25rem;
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
  margin-block: 0.3rem;
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

/* 输入区：16px 圆角卡片、发丝线、弱阴影 */
[data-slot='composer-surface'] {
  border-radius: 1rem;
  box-shadow: none;
  border: 1px solid var(--dt-border);
}

/* ── 左侧侧边栏（ChatGPT 式：行 8px 圆角、hover 淡灰、发丝分隔） ── */
[data-tour='sessions-sidebar'] :is(.bg-\\\\(--ui-row-active-background\\\\), .bg-\\\\(--ui-row-open-background\\\\)),
[data-tour='sessions-sidebar'] :is([class*='ui-row-active-background'], [class*='ui-row-open-background']) {
  border-radius: 0.5rem;
}
[data-tour='sessions-sidebar'] button:not([data-row-actions] button) {
  border-radius: 0.5rem;
}
[data-tour='sessions-sidebar'] [data-working='true'],
.arc-border.arc-row {
  border-radius: 0.5rem;
}
:root {
  --ui-row-active-background: color-mix(in srgb, var(--theme-foreground) 7%, transparent);
  --ui-row-open-background: color-mix(in srgb, var(--theme-foreground) 4%, transparent);
}
`

const codexTheme = {
  name: 'codex',
  label: 'Codex',
  description: 'Codex × ChatGPT · 亮暗双套 · 随系统切换',
  colors: light,
  darkColors: dark,
  typography: {
    fontSans:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontMono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    // 根行高（画到 --dt-line-height）：正文、消息内容、界面文字统一的行距基线。
    // 这是主题唯一的行高旋钮——之前没设，正文一直在吃 app 默认 1.5。
    lineHeight: '1.7'
  },
  customCSS
}

// ─── 设置页（设置 → 插件 → Codex Theme）────────────────────────────────────────

// 自带文案（不改 app 的 i18n 目录）；跟随应用语言，缺省回退英文。
const LOCALES = {
  en: {
    title: 'Codex Theme',
    status: name => `Active: ${name} · dual palette (light/dark), design language after OpenAI Codex & ChatGPT`,
    reapply: 'Reapply',
    reapplied: 'Codex theme reapplied',
    modeLabel: 'Appearance',
    modeHint: '“Follow system” switches light/dark with the macOS appearance. Text size stays under Settings → Appearance.',
    followSystem: 'Follow system',
    dark: 'Dark',
    light: 'Light',
    widthLabel: 'Reading column',
    widthHint: 'Prose column width — Narrow 768px · Standard 880px · Wide 992px (ChatGPT uses 720–768px).',
    narrow: 'Narrow',
    standard: 'Standard',
    wide: 'Wide'
  },
  zh: {
    title: 'Codex 主题',
    status: name => `当前生效：${name} · 亮暗双套，设计语言学自 OpenAI Codex 与 ChatGPT`,
    reapply: '重新应用',
    reapplied: 'Codex 主题已重新应用',
    modeLabel: '亮暗模式',
    modeHint: '「跟随系统」自动跟随 macOS 外观。正文字号沿用「外观」设置，此处不覆盖。',
    followSystem: '跟随系统',
    dark: '深色',
    light: '浅色',
    widthLabel: '阅读栏宽度',
    widthHint: '正文列宽 —— 窄 768px · 标准 880px · 宽 992px（ChatGPT 为 720–768px）。',
    narrow: '窄',
    standard: '标准',
    wide: '宽'
  }
}

function SettingsPage() {
  const t = usePluginI18n(ID)
  const { mode, setMode, themeName } = useTheme()
  const [colWidth, setColWidth] = useState(() => getPref('colWidth'))

  const pickWidth = value => {
    setPref('colWidth', value)
    setColWidth(value)
  }

  return jsxs('div', {
    style: { display: 'grid', gap: 2, maxWidth: 560 },
    children: [
      jsxs('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '4px 0 10px'
        },
        children: [
          jsxs('div', {
            style: { minWidth: 0, flex: 1 },
            children: [
              jsx('div', {
                style: { fontSize: 14, fontWeight: 500, color: 'var(--ui-text-primary)' },
                children: t('title')
              }),
              jsx('div', {
                style: { fontSize: 12, color: 'var(--ui-text-tertiary)', marginTop: 4 },
                children: t('status', themeName)
              })
            ]
          }),
          jsx(Button, {
            variant: 'outline',
            size: 'sm',
            onClick: () => {
              requestTheme('codex')
              applyPrefs()
              host.notify({ kind: 'info', message: t('reapplied') })
            },
            children: t('reapply')
          })
        ]
      }),

      jsx(ListRow, {
        title: t('modeLabel'),
        description: t('modeHint'),
        action: jsx(SegmentedControl, {
          value: mode,
          onChange: v => setMode(v),
          options: [
            { id: 'system', label: t('followSystem') },
            { id: 'dark', label: t('dark') },
            { id: 'light', label: t('light') }
          ]
        })
      }),

      jsx(ListRow, {
        title: t('widthLabel'),
        description: t('widthHint'),
        action: jsx(SegmentedControl, {
          value: colWidth,
          onChange: pickWidth,
          options: COL_WIDTHS.map(o => ({ id: o.value, label: t(o.labelKey) }))
        })
      })
    ]
  })
}

// ─── 插件入口 ─────────────────────────────────────────────────────────────────

export default {
  id: ID,
  name: 'Codex Theme',
  // 面板描述的唯一来源（desktop 契约无 version/author 字段，尾注与 plugin.yaml 的 version/author 同步）
  description: 'Codex × ChatGPT inspired theme for the Hermes Desktop chat — dual light/dark palettes that follow the system appearance, graphite-on-paper typography with a 1.7 root line height, 10px radius system, hairline borders, and a Settings page (appearance mode + 768/880/992px reading column presets via segmented controls). (v1.0.0 · ethanz-code)',
  register(ctx) {
    storage = ctx.storage
    ctx.i18n.register(LOCALES)

    // 主题本体：外观设置网格 / ⌘K / /skin 皆可见
    ctx.register({ id: 'codex', area: THEMES_AREA, data: codexTheme })

    // 首次安装时自动接管一次主题；之后完全尊重用户在「外观」里的手动选择
    // （避免每次启动/热重载把用户选的其它主题抢回来）。切回 Codex：
    // 设置页「重新应用」或 ⌘K。
    if (!storage.get('installed', false)) {
      storage.set('installed', true)
      requestTheme('codex')
    }
    applyPrefs()

    // 装载确认（热重载/启动排查的地面真值，见 desktop.log）
    console.log('[codex-theme] register ok v1.0.0')

    // 设置 → 插件 → Codex Theme（亮暗 / 阅读栏）
    if (typeof ctx.registerSettingsPage === 'function') {
      ctx.registerSettingsPage({
        id: 'codex-theme',
        title: 'Codex Theme',
        icon: 'paintcan',
        render: () => jsx(SettingsPage, {})
      })
    } else {
      console.error('[codex-theme] ctx.registerSettingsPage unavailable in this build')
    }

    // ⌘K 入口（低调、可选）
    ctx.register({
      id: 'palette-apply',
      area: PALETTE_AREA,
      data: {
        id: 'codex-theme.apply',
        label: 'Theme: 使用 Codex 主题',
        keywords: ['codex', 'theme', '主题', 'appearance', '外观'],
        run: () => {
          requestTheme('codex')
          applyPrefs()
        }
      }
    })

    ctx.register({
      id: 'palette-settings',
      area: PALETTE_AREA,
      data: {
        id: 'codex-theme.settings',
        label: 'Theme: Codex 主题设置',
        keywords: ['codex', 'theme', 'settings', '设置', '深色', '浅色', '亮', '暗'],
        run: () => host.navigate(pluginSettingsHref('codex-theme'))
      }
    })
  }
}
