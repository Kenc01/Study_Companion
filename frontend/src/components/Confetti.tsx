import { motion, useReducedMotion } from 'framer-motion'
import * as React from 'react'

const COLORS = [
  'hsl(var(--gold))',
  'hsl(var(--success))',
  'hsl(var(--primary))',
  'hsl(200 80% 55%)',
  'hsl(340 70% 60%)',
]

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  drift: number
  rotate: number
  size: number
  color: string
  round: boolean
}

function buildPieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2.4 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 140,
    rotate: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    round: Math.random() > 0.6,
  }))
}

/** Lightweight, dependency-free celebration. Skipped for reduced motion. */
export function Confetti({ count = 34 }: { count?: number }) {
  const reduce = useReducedMotion()

  // Randomised once via a lazy initializer so the pieces stay stable
  // across re-renders without randomising during render.
  const [pieces] = React.useState<Piece[]>(() => buildPieces(count))

  if (reduce) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
          }}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: 300, x: p.drift, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}
