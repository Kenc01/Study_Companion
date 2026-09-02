import * as React from 'react'
import { cn } from '@/lib/utils'

interface BlankTextProps {
  text: string
  /** Highlights the blank while the learner is still answering. */
  active?: boolean
  className?: string
  /** When answered correctly, replace blank(s) with the matching answer(s). */
  filledAnswers?: string[]
  /** For multi-blank questions: which index is currently being answered. */
  activeBlankIndex?: number
  /** Show small 1/2/3 superscripts on each blank. */
  indexed?: boolean
}

/**
 * Renders question text, turning every `_____` run into a visible,
 * screen-reader-friendly blank. When `filledAnswers` is provided each blank
 * is replaced by the matching answer text.
 */
export function BlankText({
  text,
  active = true,
  className,
  filledAnswers,
  activeBlankIndex,
  indexed,
}: BlankTextProps) {
  const parts = React.useMemo(() => text.split(/(_{2,})/g), [text])
  let blankIdx = -1

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!/^_{2,}$/.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>
        blankIdx += 1
        const filled = filledAnswers?.[blankIdx]
        const isActive = activeBlankIndex === undefined ? active : activeBlankIndex === blankIdx
        return (
          <React.Fragment key={i}>
            {indexed && (
              <span className="blank-index" aria-hidden="true">
                {blankIdx + 1}
              </span>
            )}
            {filled ? (
              <span
                aria-label={`blank ${blankIdx + 1}: ${filled}`}
                className={cn('blank-token', 'blank-token--filled')}
              >
                {filled}
              </span>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className={cn('blank-token', isActive && 'blank-token--active')}
                >
                  {part}
                </span>
                <span className="sr-only"> blank {blankIdx + 1} </span>
              </>
            )}
          </React.Fragment>
        )
      })}
    </span>
  )
}
