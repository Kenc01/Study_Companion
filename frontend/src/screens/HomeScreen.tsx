import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenCheck,
  FileUp,
  Filter,
  GraduationCap,
  Layers,
  Plus,
  Search,
  Star,
  Target,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { EmptyTopicsState } from '@/components/EmptyTopicsState'
import { Header } from '@/components/Header'
import { TopicCard } from '@/components/TopicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TopicStats } from '@/hooks/useQuizState'
import type { Question, Settings, Topic } from '@/lib/types'
import { plural } from '@/lib/utils'

interface HomeScreenProps {
  topics: Topic[]
  getTopicStats: (topic: Topic) => TopicStats
  onCreate: () => void
  onImport: () => void
  onSettings: () => void
  onEdit: (topicId: string) => void
  onDelete: (topicId: string) => void
  onStart: (topicId: string) => void
  onCram: (topicId: string) => void
  onReview: (topicId?: string) => void
  onBookmarked: (topicId: string) => void
  onTest: (topicId: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  tagFilter: string | null
  setTagFilter: (t: string | null) => void
  allTags: string[]
  settings: Settings
  onChangeTheme: (t: 'light' | 'dark' | 'system') => void
  onExport: () => void
  onImportFile: () => void
}

function SummaryTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode
  value: string
  label: string
  tint: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-line bg-card px-4 py-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tint}`}>{icon}</span>
      <div className="min-w-0">
        <p className="tabular text-[17px] leading-tight font-semibold">{value}</p>
        <p className="truncate text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  )
}

export function HomeScreen({
  topics,
  getTopicStats,
  onCreate,
  onImport,
  onSettings,
  onEdit,
  onDelete,
  onStart,
  onCram,
  onReview,
  onBookmarked,
  onTest,
  searchQuery,
  setSearchQuery,
  tagFilter,
  setTagFilter,
  allTags,
  settings,
  onChangeTheme,
  onExport,
  onImportFile,
}: HomeScreenProps) {
  const [pendingDelete, setPendingDelete] = React.useState<Topic | null>(null)

  const totals = React.useMemo(() => {
    let cards = 0
    let mastered = 0
    let due = 0
    let bookmarked = 0
    for (const t of topics) {
      const s = getTopicStats(t)
      cards += s.total
      mastered += s.mastered
      due += s.due
      bookmarked += s.bookmarked
    }
    return {
      cards,
      mastered,
      due,
      bookmarked,
      pct: cards ? Math.round((mastered / cards) * 100) : 0,
    }
  }, [topics, getTopicStats])

  const filteredTopics = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return topics.filter((t) => {
      if (tagFilter && !(t.tags ?? []).includes(tagFilter)) return false
      if (!q) return true
      if (t.name.toLowerCase().includes(q)) return true
      if ((t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))) return true
      if (
        t.questions.some(
          (qq: Question) =>
            qq.prompt.toLowerCase().includes(q) || qq.answer.toLowerCase().includes(q),
        )
      )
        return true
      return false
    })
  }, [topics, searchQuery, tagFilter])

  const hasTopics = topics.length > 0
  const hasDue = totals.due > 0

  return (
    <>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary text-primary-ink shadow-[var(--shadow-focus)]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
              Study Companion
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {hasTopics ? plural(topics.length, 'topic') : 'Create your first quiz topic'}
            </p>
          </div>
        </div>

        <Header
          settings={settings}
          onChangeTheme={onChangeTheme}
          onOpenSettings={onSettings}
          onExport={onExport}
          onImport={onImportFile}
        />
      </header>

      {hasTopics && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mt-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              icon={<Layers className="size-[18px] text-primary" aria-hidden="true" />}
              value={String(topics.length)}
              label="Topics"
              tint="bg-primary-soft"
            />
            <SummaryTile
              icon={<Target className="size-[18px] text-primary" aria-hidden="true" />}
              value={String(totals.cards)}
              label="Total cards"
              tint="bg-primary-soft"
            />
            <SummaryTile
              icon={<Star className="size-[18px] text-gold" fill="currentColor" aria-hidden="true" />}
              value={`${totals.mastered} · ${totals.pct}%`}
              label="Mastered"
              tint="bg-gold-soft"
            />
            <SummaryTile
              icon={<BookOpenCheck className="size-[18px] text-success" aria-hidden="true" />}
              value={String(totals.due)}
              label="Due today"
              tint="bg-success-soft"
            />
          </div>

          {hasDue && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-success/25 bg-gradient-to-r from-success-soft to-transparent p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-success text-white">
                  <Zap className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    {totals.due} card{totals.due === 1 ? '' : 's'} due for review today
                  </p>
                  <p className="text-[13px] text-ink-soft">
                    Spaced repetition is scheduling them to keep memory fresh.
                  </p>
                </div>
              </div>
              <Button onClick={() => onReview()}>
                <Zap aria-hidden="true" /> Start review
              </Button>
            </motion.div>
          )}

          {totals.bookmarked > 0 && (
            <button
              type="button"
              onClick={() => {
                // Start bookmarked session for first topic with bookmarks (or across all?) — we pick
                // the first topic that has bookmarks for simplicity.
                const t = topics.find((tt) => getTopicStats(tt).bookmarked > 0)
                if (t) onBookmarked(t.id)
              }}
              className="flex w-full items-center justify-between rounded-[var(--radius)] border border-gold/30 bg-gold-soft px-4 py-3 text-left text-sm transition-colors hover:border-gold/50"
            >
              <span className="flex items-center gap-2">
                <Star className="size-4 text-[hsl(36_82%_32%)]" fill="currentColor" aria-hidden="true" />
                <span className="font-semibold text-[hsl(36_82%_28%)]">
                  {totals.bookmarked} bookmarked card{totals.bookmarked === 1 ? '' : 's'} flagged as tricky
                </span>
              </span>
              <span className="text-[12px] font-medium text-[hsl(36_82%_32%)]">Study them →</span>
            </button>
          )}
        </motion.div>
      )}

      {hasTopics && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, questions, or tags..."
              className="h-11 pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onImport} className="sm:w-auto">
              <FileUp aria-hidden="true" />
              Import File
            </Button>
            <Button variant="secondary" onClick={onCreate}>
              <Plus aria-hidden="true" /> New Topic
            </Button>
          </div>
        </div>
      )}

      {hasTopics && allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 size-3.5 text-ink-faint" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
              tagFilter === null
                ? 'bg-primary text-primary-ink'
                : 'border border-line bg-card text-ink-soft hover:border-line-strong'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                tagFilter === tag
                  ? 'bg-primary text-primary-ink'
                  : 'border border-line bg-card text-ink-soft hover:border-line-strong'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <main className="mt-6">
        <h2 className="sr-only">Topic library</h2>
        {filteredTopics.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredTopics.map((topic, i) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  index={i}
                  stats={getTopicStats(topic)}
                  onStart={() => onStart(topic.id)}
                  onCram={() => onCram(topic.id)}
                  onReview={() => onReview(topic.id)}
                  onBookmarked={() => onBookmarked(topic.id)}
                  onTest={() => onTest(topic.id)}
                  onEdit={() => onEdit(topic.id)}
                  onDelete={() => setPendingDelete(topic)}
                />
              ))}
            </AnimatePresence>
          </ul>
        ) : hasTopics ? (
          <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-card p-10 text-center">
            <p className="text-sm text-ink-soft">
              {searchQuery || tagFilter
                ? 'No topics match your search. Try different keywords or clear filters.'
                : 'No topics yet.'}
            </p>
          </div>
        ) : (
          <EmptyTopicsState onCreate={onCreate} onImport={onImport} />
        )}
      </main>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        topicName={pendingDelete?.name ?? ''}
        questionCount={pendingDelete?.questions.length ?? 0}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}
