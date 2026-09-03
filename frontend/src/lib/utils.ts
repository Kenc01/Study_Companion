import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

/** Fisher–Yates, returns a new array (never mutates the source). */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function pct(part: number, total: number) {
  if (!total) return 0
  return clamp(Math.round((part / total) * 100), 0, 100)
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function formatRelative(ts?: number) {
  if (!ts) return 'Never studied'
  const diff = Date.now() - ts
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return 'Studied just now'
  if (diff < hour) return `Studied ${Math.floor(diff / min)}m ago`
  if (diff < day) return `Studied ${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `Studied ${Math.floor(diff / day)}d ago`
  return `Studied ${new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`
}
