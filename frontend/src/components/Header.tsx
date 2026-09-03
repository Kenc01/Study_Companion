import { Download, Moon, Settings as SettingsIcon, Sun, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { applyTheme } from '@/hooks/useSettings'
import type { Settings } from '@/lib/types'

interface HeaderProps {
  settings: Settings
  onChangeTheme: (t: 'light' | 'dark' | 'system') => void
  onOpenSettings: () => void
  onExport: () => void
  onImport: () => void
}

export function Header({ settings, onChangeTheme, onOpenSettings, onExport, onImport }: HeaderProps) {
  const current = settings.theme
  const IconFor = current === 'dark' ? Moon : Sun
  const labelFor = (t: 'light' | 'dark' | 'system') =>
    t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  const toggleTheme = () => {
    const next = current === 'dark' ? 'light' : 'dark'
    onChangeTheme(next)
    applyTheme(next)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip label={labelFor(current)}>
        <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          <IconFor className="size-[18px]" aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip label="Import backup file">
        <Button variant="secondary" size="icon" onClick={onImport} aria-label="Import backup">
          <Upload className="size-[18px]" aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip label="Export backup">
        <Button variant="secondary" size="icon" onClick={onExport} aria-label="Export backup">
          <Download className="size-[18px]" aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip label="Settings">
        <Button variant="secondary" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <SettingsIcon className="size-[18px]" aria-hidden="true" />
        </Button>
      </Tooltip>
      <input id="backup-file" type="file" accept="application/json,.json" className="hidden" />
    </div>
  )
}
