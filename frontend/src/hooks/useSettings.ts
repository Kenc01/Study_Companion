import * as React from 'react'
import { loadSettings, saveSettings } from '@/lib/storage'
import { DEFAULT_SETTINGS, type Settings, type Theme } from '@/lib/types'

export function useSettings() {
  // Note: loadSettings is re-exported with its full types from storage module.
  const [settings, setSettings] = React.useState<Settings>(() => loadSettings())

  React.useEffect(() => {
    saveSettings(settings)
    applyTheme(settings.theme)
  }, [settings])

  // Watch for system theme changes when theme === 'system'.
  React.useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  const update = React.useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  const reset = React.useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  return { settings, setSettings, update, reset }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  // Update theme-color meta for mobile browsers.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  const color = isDark ? '#0f172a' : '#f5f7fa'
  metas.forEach((m) => {
    const media = m.getAttribute('media') || ''
    if ((isDark && media.includes('dark')) || (!isDark && media.includes('light')) || !media) {
      m.setAttribute('content', color)
    }
  })
}

// Re-export DEFAULT_SETTINGS for convenience.
export { DEFAULT_SETTINGS } from '@/lib/types'
