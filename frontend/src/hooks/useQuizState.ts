import * as React from "react";
import {
  createRemoteTopic,
  deleteRemoteTopic,
  loadRemoteMastery,
  loadRemoteTopics,
  saveRemoteMastery,
  updateRemoteTopic,
} from "@/lib/api";
import {
  gradeAnswer,
  gradeMcqAnswer,
  gradeMultiAnswer,
} from "@/lib/matchAnswer";
import { isDue, qualityFromResult, schedule } from "@/lib/srs";
import { loadSettings, masteryKey, saveSettings } from "@/lib/storage";
import {
  DEFAULT_SETTINGS,
  MASTERY_THRESHOLD,
  type AnswerLog,
  type MasteryMap,
  type MasteryRecord,
  type Question,
  type QuizMode,
  type QuizSession,
  type Screen,
  type Settings,
  type StudyCompanionExport,
  type Topic,
} from "@/lib/types";
import { shuffle, uid } from "@/lib/utils";

const EMPTY_RECORD: MasteryRecord = {
  streak: 0,
  mastered: false,
  correctCount: 0,
  attempts: 0,
  lastSeenAt: 0,
};

const TOPIC_ACCENTS = [
  "from-sky-500/20 to-sky-400/10",
  "from-emerald-500/20 to-emerald-400/10",
  "from-amber-500/20 to-amber-400/10",
  "from-rose-500/20 to-rose-400/10",
  "from-violet-500/20 to-violet-400/10",
  "from-teal-500/20 to-teal-400/10",
];
export const ACCENT_COUNT = TOPIC_ACCENTS.length;

export interface TopicStats {
  total: number;
  mastered: number;
  due: number;
  bookmarked: number;
  masteryPct: number;
}

export interface UseQuizState {
  screen: Screen;
  topics: Topic[];
  mastery: MasteryMap;
  settings: Settings;
  session: QuizSession | null;
  editingTopic: Topic | null;
  creatingSubject: string;
  lastSession: QuizSession | null;
  sessionElapsedMs: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;

  goHome: () => void;
  openCreate: (subject?: string) => void;
  openImport: () => void;
  openSettings: () => void;
  openEdit: (topicId: string) => void;
  saveTopic: (input: {
    name: string;
    subject?: string;
    rawNotes: string;
    questions: Question[];
    tags?: string[];
    color?: number;
  }) => Topic | null;
  deleteTopic: (topicId: string) => void;
  updateQuestionBookmark: (
    topicId: string,
    questionId: string,
    bookmarked: boolean,
  ) => void;
  updateTopicTags: (topicId: string, tags: string[]) => void;

  startQuiz: (topicId: string, mode?: QuizMode, questionIds?: string[]) => void;
  startQuizForTopic: (topic: Topic, mode?: QuizMode) => void;
  startCram: (topicId: string) => void;
  startReview: (topicId?: string) => void;
  startBookmarked: (topicId: string) => void;
  retryWrong: () => void;
  retryAll: () => void;
  submitAnswer: (value: string | number[] | string[]) => {
    correct: boolean;
    answer: string;
    masteredNow: boolean;
    perBlank?: boolean[];
    isMcq?: boolean;
    isMulti?: boolean;
    isBool?: boolean;
  } | null;
  revealHint: () => void;
  nextQuestion: () => void;
  exitQuiz: () => void;

  getTopicStats: (topic: Topic) => TopicStats;
  getRecord: (topicId: string, questionId: string) => MasteryRecord;
  getTopicAccent: (topic: Topic) => string;
  getAllTags: () => string[];

  exportData: () => StudyCompanionExport;
  importData: (
    data: StudyCompanionExport,
    merge?: boolean,
  ) => { ok: boolean; message: string };
  resetAllData: () => void;

  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

export function useQuizState(): UseQuizState {
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [mastery, setMastery] = React.useState<MasteryMap>({});
  const [settings, setSettings] = React.useState<Settings>(() =>
    loadSettings(),
  );
  const [screen, setScreen] = React.useState<Screen>("home");
  const [session, setSession] = React.useState<QuizSession | null>(null);
  const [lastSession, setLastSession] = React.useState<QuizSession | null>(
    null,
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [creatingSubject, setCreatingSubject] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);
  const questionStartTimeRef = React.useRef<number>(Date.now());
  const [sessionElapsedMs, setSessionElapsedMs] = React.useState<number>(0);

  /* ---------------------------- persistence ---------------------------- */
  React.useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  React.useEffect(() => {
    let active = true;
    void Promise.all([loadRemoteTopics(), loadRemoteMastery()]).then(
      ([remoteTopics, remoteMastery]) => {
        if (!active) return;
        if (remoteTopics?.length) setTopics(remoteTopics);
        if (remoteMastery) setMastery(remoteMastery);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  /* ------------------------- session timer ---------------------------- */
  React.useEffect(() => {
    if (!session || !settings.showTimer) {
      setSessionElapsedMs(0);
      return;
    }
    const start = session.startedAt;
    const tick = () => setSessionElapsedMs(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session, settings.showTimer]);

  /* ---------------- question presentation timer ----------------------- */
  React.useEffect(() => {
    if (!session) return;
    questionStartTimeRef.current = Date.now();
  }, [session?.step, session?.index]);

  /* ------------------------------ helpers ------------------------------ */
  const getRecord = React.useCallback(
    (topicId: string, questionId: string): MasteryRecord =>
      mastery[masteryKey(topicId, questionId)] ?? EMPTY_RECORD,
    [mastery],
  );

  const getAllTags = React.useCallback((): string[] => {
    const s = new Set<string>();
    for (const t of topics) {
      (t.tags ?? []).forEach((tg) => s.add(tg));
    }
    return [...s].sort();
  }, [topics]);

  const getTopicAccent = React.useCallback((topic: Topic) => {
    const idx = typeof topic.color === "number" ? topic.color : 0;
    return TOPIC_ACCENTS[idx % TOPIC_ACCENTS.length];
  }, []);

  const getTopicStats = React.useCallback(
    (topic: Topic): TopicStats => {
      const total = topic.questions.length;
      let mastered = 0;
      let due = 0;
      let bookmarked = 0;
      for (const q of topic.questions) {
        const rec = mastery[masteryKey(topic.id, q.id)];
        if (rec?.mastered) mastered += 1;
        if (isDue(rec)) due += 1;
        if (rec?.bookmarked) bookmarked += 1;
      }
      return {
        total,
        mastered,
        due: Math.min(due, total),
        bookmarked,
        masteryPct: total ? Math.round((mastered / total) * 100) : 0,
      };
    },
    [mastery],
  );

  /* --------------------------- navigation ------------------------------ */
  const goHome = React.useCallback(() => {
    setEditingId(null);
    setSession(null);
    setScreen("home");
    setSearchQuery("");
    setTagFilter(null);
  }, []);

  const openCreate = React.useCallback((subject = "") => {
    setEditingId(null);
    setCreatingSubject(subject);
    setScreen("paste");
  }, []);

  const openImport = React.useCallback(() => {
    setEditingId(null);
    setScreen("import");
  }, []);

  const openSettings = React.useCallback(() => {
    setScreen("settings");
  }, []);

  const openEdit = React.useCallback((topicId: string) => {
    setEditingId(topicId);
    setScreen("paste");
  }, []);

  /* ---------------------------- topic CRUD ----------------------------- */
  const saveTopic = React.useCallback<UseQuizState["saveTopic"]>(
    ({ name, subject, rawNotes, questions, tags, color }) => {
      if (!questions.length) return null;
      const now = Date.now();

      if (editingId) {
        const existing = topics.find((t) => t.id === editingId);
        if (existing) {
          const byPrompt = new Map(
            existing.questions.map((q) => [q.prompt.toLowerCase(), q.id]),
          );
          const merged = questions.map((q) => {
            const reused = byPrompt.get(q.prompt.toLowerCase());
            if (reused) byPrompt.delete(q.prompt.toLowerCase());
            return reused ? { ...q, id: reused } : q;
          });
          const updated: Topic = {
            ...existing,
            name: name.trim(),
            subject: subject?.trim() || existing.subject || name.trim(),
            tags: tags ?? existing.tags ?? [],
            color: color ?? existing.color ?? 0,
            rawNotes,
            questions: merged,
            updatedAt: now,
          };
          setTopics((prev) =>
            prev.map((t) => (t.id === editingId ? updated : t)),
          );
          void updateRemoteTopic(updated);
          setEditingId(null);
          setCreatingSubject("");
          return updated;
        }
      }

      const created: Topic = {
        id: uid("topic"),
        name: name.trim(),
        subject: subject?.trim() || name.trim(),
        tags: tags ?? [],
        color: color ?? Math.floor(Math.random() * ACCENT_COUNT),
        rawNotes,
        questions,
        createdAt: now,
        updatedAt: now,
      };
      setTopics((prev) => [created, ...prev]);
      void createRemoteTopic(created);
      setEditingId(null);
      setCreatingSubject("");
      return created;
    },
    [editingId, topics],
  );

  const deleteTopic = React.useCallback((topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    void deleteRemoteTopic(topicId);
    setMastery((prev) => {
      const next: MasteryMap = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(`${topicId}:`)) next[key] = value;
      }
      return next;
    });
  }, []);

  const updateQuestionBookmark = React.useCallback(
    (topicId: string, questionId: string, bookmarked: boolean) => {
      const k = masteryKey(topicId, questionId);
      setMastery((m) => ({
        ...m,
        [k]: { ...(m[k] ?? EMPTY_RECORD), bookmarked },
      }));
      void saveRemoteMastery(topicId, questionId, {
        ...(mastery[k] ?? EMPTY_RECORD),
        bookmarked,
      });
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? {
                ...t,
                questions: t.questions.map((q) =>
                  q.id === questionId ? { ...q, bookmarked } : q,
                ),
              }
            : t,
        ),
      );
    },
    [mastery],
  );

  const updateTopicTags = React.useCallback(
    (topicId: string, tags: string[]) => {
      setTopics((prev) => {
        const existing = prev.find((t) => t.id === topicId);
        if (existing)
          void updateRemoteTopic({ ...existing, tags, updatedAt: Date.now() });
        return prev.map((t) =>
          t.id === topicId ? { ...t, tags, updatedAt: Date.now() } : t,
        );
      });
    },
    [],
  );

  /* ------------------------------- quiz -------------------------------- */
  const beginSession = React.useCallback(
    (topic: Topic, questions: Question[], mode: QuizMode) => {
      if (!questions.length) return;
      const ordered = shuffle(questions);
      const isTest = mode === "test";
      questionStartTimeRef.current = Date.now();
      setSession({
        topicId: topic.id,
        topicName: topic.name,
        questions: ordered,
        index: 0,
        logs: [],
        correct: 0,
        wrong: 0,
        streak: 0,
        bestStreak: 0,
        startedAt: Date.now(),
        mode,
        awaitingNext: false,
        step: 0,
        hintLevel: 0,
        activeBlank: 0,
        timeLimitMs: isTest ? ordered.length * 60_000 : undefined, // ~1 min per card
        ...(mode === "cram"
          ? {
              pendingIds: ordered.map((q) => q.id),
              clearedCount: 0,
              totalCount: ordered.length,
              round: 1,
            }
          : {}),
      });
      setLastSession(null);
      setScreen("quiz");
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topic.id ? { ...t, lastStudiedAt: Date.now() } : t,
        ),
      );
    },
    [],
  );

  const selectQuestionsForMode = React.useCallback(
    (topic: Topic, mode: QuizMode): Question[] => {
      switch (mode) {
        case "bookmarked":
          return topic.questions.filter((q) => {
            const rec = mastery[masteryKey(topic.id, q.id)];
            return rec?.bookmarked || q.bookmarked;
          });
        case "review": {
          const due = topic.questions.filter((q) =>
            isDue(mastery[masteryKey(topic.id, q.id)]),
          );
          return due.length ? due : topic.questions;
        }
        default:
          return topic.questions;
      }
    },
    [mastery],
  );

  const startQuiz = React.useCallback<UseQuizState["startQuiz"]>(
    (topicId, mode = "all", questionIds) => {
      const topic = topics.find((t) => t.id === topicId);
      if (!topic) return;
      const pool = questionIds?.length
        ? topic.questions.filter((q) => questionIds.includes(q.id))
        : selectQuestionsForMode(topic, mode);
      beginSession(topic, pool.length ? pool : topic.questions, mode);
    },
    [topics, beginSession, selectQuestionsForMode],
  );

  const startQuizForTopic = React.useCallback(
    (topic: Topic, mode: QuizMode = "all") =>
      beginSession(topic, topic.questions, mode),
    [beginSession],
  );

  const startCram = React.useCallback(
    (topicId: string) => {
      const topic = topics.find((t) => t.id === topicId);
      if (!topic) return;
      beginSession(topic, topic.questions, "cram");
    },
    [topics, beginSession],
  );

  const startReview = React.useCallback(
    (topicId?: string) => {
      const target = topicId
        ? topics.find((t) => t.id === topicId)
        : (topics[0] ?? null);
      if (!target) return;
      beginSession(target, selectQuestionsForMode(target, "review"), "review");
    },
    [topics, beginSession, selectQuestionsForMode],
  );

  const startBookmarked = React.useCallback(
    (topicId: string) => {
      const topic = topics.find((t) => t.id === topicId);
      if (!topic) return;
      const pool = selectQuestionsForMode(topic, "bookmarked");
      if (!pool.length) return;
      beginSession(topic, pool, "bookmarked");
    },
    [topics, beginSession, selectQuestionsForMode],
  );

  const retryWrong = React.useCallback(() => {
    if (!lastSession) return;
    const ids = lastSession.logs
      .filter((l) => !l.correct)
      .map((l) => l.questionId);
    if (!ids.length) return;
    const topic = topics.find((t) => t.id === lastSession.topicId);
    if (!topic) return;
    beginSession(
      topic,
      topic.questions.filter((q) => ids.includes(q.id)),
      "wrong",
    );
  }, [lastSession, topics, beginSession]);

  const retryAll = React.useCallback(() => {
    if (!lastSession) return;
    const topic = topics.find((t) => t.id === lastSession.topicId);
    if (!topic) return;
    beginSession(topic, topic.questions, "all");
  }, [lastSession, topics, beginSession]);

  /* ---------------------------- grading ------------------------------- */
  const revealHint = React.useCallback(() => {
    setSession((s) => {
      if (!s || s.awaitingNext) return s;
      const level = s.hintLevel ?? 0;
      if (level >= 3) return s;
      return { ...s, hintLevel: (level + 1) as 0 | 1 | 2 | 3 };
    });
  }, []);

  const submitAnswer = React.useCallback<UseQuizState["submitAnswer"]>(
    (value) => {
      if (!session) return null;
      const question = session.questions[session.index];
      if (!question) return null;
      if (session.awaitingNext) return null;

      const timeMs = Date.now() - questionStartTimeRef.current;
      let correct = false;
      let displayAnswer = question.answer;
      let perBlank: boolean[] | undefined;

      if (
        question.type === "mcq" &&
        question.answerIndices &&
        question.options
      ) {
        const selected = Array.isArray(value) ? (value as number[]) : [];
        correct = gradeMcqAnswer(selected, question.answerIndices);
        displayAnswer = question.answerIndices
          .map((i) => question.options![i])
          .join("; ");
      } else if (question.type === "boolean") {
        const typed =
          typeof value === "string" ? value.trim().toLowerCase() : "";
        const correctBool = question.boolAnswer === true;
        correct =
          (correctBool && /^(true|t|yes|y)$/.test(typed)) ||
          (!correctBool && /^(false|f|no|n)$/.test(typed));
      } else if (question.type === "multi") {
        const answers = Array.isArray(value)
          ? (value as string[])
          : typeof value === "string"
            ? [value]
            : [""];
        const expected = (question.alternatives as string[][]) ?? [];
        const g = gradeMultiAnswer(answers, expected, settings.strictness);
        correct = g.correct;
        perBlank = g.perBlank;
        displayAnswer = g.matched.join("; ");
      } else {
        // typed
        const typed = typeof value === "string" ? value : "";
        const alts: string[] = [];
        if (Array.isArray(question.alternatives)) {
          for (const a of question.alternatives as unknown[]) {
            if (typeof a === "string") alts.push(a);
          }
        }
        if (!alts.length) alts.push(question.answer);
        const g = gradeAnswer(typed, alts, settings.strictness);
        correct = g.correct;
        displayAnswer = g.matched ?? question.answer;
      }

      const hintsUsed = session.hintLevel ?? 0;
      const fastAnswer = timeMs < 6000;
      const quality = qualityFromResult({
        correct,
        hintsUsed,
        firstTry: true,
        fastAnswer,
      });

      const key = masteryKey(session.topicId, question.id);
      const prev = mastery[key] ?? EMPTY_RECORD;
      const streak = correct ? prev.streak + 1 : 0;
      const mastered = correct
        ? prev.mastered || streak >= MASTERY_THRESHOLD
        : prev.mastered;
      const masteredNow = mastered && !prev.mastered;
      const srs = schedule(prev.srs, quality);

      const record: MasteryRecord = {
        streak,
        mastered,
        correctCount: prev.correctCount + (correct ? 1 : 0),
        attempts: prev.attempts + 1,
        lastSeenAt: Date.now(),
        bookmarked: prev.bookmarked,
        srs,
      };
      setMastery((m) => ({ ...m, [key]: record }));
      void saveRemoteMastery(session.topicId, question.id, record);

      const log: AnswerLog = {
        questionId: question.id,
        prompt: question.prompt,
        answer: displayAnswer,
        userAnswer: Array.isArray(value)
          ? question.type === "mcq" && question.options
            ? (value as number[]).map((i) => question.options![i]).join("; ")
            : (value as string[]).join("; ")
          : String(value).trim(),
        correct,
        streakAfter: streak,
        masteredNow,
        timeMs,
      };

      setSession((s) => {
        if (!s || s.awaitingNext) return s;
        const nextStreak = correct ? s.streak + 1 : 0;
        // In test mode, don't mark awaitingNext — advance through without feedback
        if (s.mode === "test") {
          return {
            ...s,
            logs: [...s.logs, log],
            correct: s.correct + (correct ? 1 : 0),
            wrong: s.wrong + (correct ? 0 : 1),
            streak: nextStreak,
            bestStreak: Math.max(s.bestStreak, nextStreak),
            awaitingNext: false,
            step: s.step + 1,
            index: Math.min(s.index + 1, s.questions.length - 1),
          };
        }
        return {
          ...s,
          logs: [...s.logs, log],
          correct: s.correct + (correct ? 1 : 0),
          wrong: s.wrong + (correct ? 0 : 1),
          streak: nextStreak,
          bestStreak: Math.max(s.bestStreak, nextStreak),
          awaitingNext: true,
        };
      });

      return {
        correct,
        answer: displayAnswer,
        masteredNow,
        perBlank,
        isMcq: question.type === "mcq",
        isMulti: question.type === "multi",
        isBool: question.type === "boolean",
      };
    },
    [session, mastery, settings.strictness],
  );

  const nextQuestion = React.useCallback(() => {
    setSession((s) => {
      if (!s) return s;

      // Auto-advance in test mode after logging; normal path handles next.
      if (s.mode === "test") {
        if (s.index >= s.questions.length - 1) {
          setLastSession(s);
          setScreen("results");
          return s;
        }
        return s;
      }

      /* -------------------- Cram mode -------------------- */
      if (s.mode === "cram") {
        const justAnswered = s.logs[s.logs.length - 1];
        const current = s.questions[s.index];
        const pending = s.pendingIds ?? s.questions.map((q) => q.id);

        let nextPending = pending;
        if (justAnswered && current && justAnswered.questionId === current.id) {
          nextPending = justAnswered.correct
            ? pending.filter((id) => id !== current.id)
            : [...pending.filter((id) => id !== current.id), current.id];
        }

        const total = s.totalCount ?? s.questions.length;
        const cleared = total - nextPending.length;

        if (!nextPending.length) {
          const finished = {
            ...s,
            pendingIds: [],
            clearedCount: cleared,
            awaitingNext: false,
          };
          setLastSession(finished);
          setScreen("results");
          return finished;
        }

        const remainingThisPass = s.questions
          .slice(s.index + 1)
          .filter((q) => nextPending.includes(q.id));

        if (remainingThisPass.length) {
          let nextIndex = s.index + 1;
          while (
            nextIndex < s.questions.length &&
            !nextPending.includes(s.questions[nextIndex].id)
          ) {
            nextIndex += 1;
          }
          return {
            ...s,
            index: nextIndex,
            pendingIds: nextPending,
            clearedCount: cleared,
            awaitingNext: false,
            step: s.step + 1,
            hintLevel: 0,
          };
        }

        const requeued = shuffle(
          s.questions.filter((q) => nextPending.includes(q.id)),
        );
        return {
          ...s,
          questions: requeued,
          index: 0,
          pendingIds: nextPending,
          clearedCount: cleared,
          round: (s.round ?? 1) + 1,
          awaitingNext: false,
          step: s.step + 1,
          hintLevel: 0,
        };
      }

      /* ------------------ Standard modes ----------------- */
      if (s.index >= s.questions.length - 1) {
        setLastSession(s);
        setScreen("results");
        return s;
      }
      return {
        ...s,
        index: s.index + 1,
        awaitingNext: false,
        step: s.step + 1,
        hintLevel: 0,
      };
    });
  }, []);

  const exitQuiz = React.useCallback(() => {
    setSession(null);
    setScreen("home");
  }, []);

  /* ---------------------- import / export ----------------------------- */
  const exportData = React.useCallback((): StudyCompanionExport => {
    return {
      version: 2,
      exportedAt: Date.now(),
      topics,
      mastery,
      settings,
    };
  }, [topics, mastery, settings]);

  const importData = React.useCallback(
    (
      data: StudyCompanionExport,
      merge = false,
    ): { ok: boolean; message: string } => {
      if (!data || typeof data !== "object")
        return { ok: false, message: "Invalid file." };
      if (data.version !== 2 && data.version !== 1) {
        return { ok: false, message: `Unsupported version: ${data.version}.` };
      }
      const incomingTopics = Array.isArray(data.topics)
        ? (data.topics as Topic[])
        : [];
      const incomingMastery =
        data.mastery && typeof data.mastery === "object"
          ? (data.mastery as MasteryMap)
          : {};
      const incomingSettings = (data.settings ?? DEFAULT_SETTINGS) as Settings;

      if (!incomingTopics.length) {
        return { ok: false, message: "No topics found in file." };
      }

      if (merge) {
        // Avoid id collisions by remapping incoming topic ids.
        const idMap = new Map<string, string>();
        const remapped: Topic[] = incomingTopics.map((t) => {
          const newId = uid("topic");
          idMap.set(t.id, newId);
          return {
            ...t,
            id: newId,
            questions: t.questions.map((q) => ({ ...q, id: uid("q") })),
          };
        });
        setTopics((prev) => [...remapped, ...prev]);
        // Mastery references old ids; simplest is to drop imported mastery on merge
        // to avoid key collisions. Users who want mastery should use replace.
        setSettings(incomingSettings);
        return { ok: true, message: `Merged ${remapped.length} topic(s).` };
      }

      setTopics(incomingTopics);
      setMastery(incomingMastery);
      setSettings(incomingSettings);
      return {
        ok: true,
        message: `Replaced library with ${incomingTopics.length} topic(s).`,
      };
    },
    [],
  );

  const resetAllData = React.useCallback(() => {
    setTopics([]);
    setMastery({});
    setSession(null);
    setLastSession(null);
    setScreen("home");
  }, []);

  const editingTopic = React.useMemo(
    () => topics.find((t) => t.id === editingId) ?? null,
    [topics, editingId],
  );

  return {
    screen,
    topics,
    mastery,
    settings,
    session,
    editingTopic,
    creatingSubject,
    lastSession,
    sessionElapsedMs,
    searchQuery,
    setSearchQuery,
    tagFilter,
    setTagFilter,
    goHome,
    openCreate,
    openImport,
    openSettings,
    openEdit,
    saveTopic,
    deleteTopic,
    updateQuestionBookmark,
    updateTopicTags,
    startQuiz,
    startQuizForTopic,
    startCram,
    startReview,
    startBookmarked,
    retryWrong,
    retryAll,
    submitAnswer,
    revealHint,
    nextQuestion,
    exitQuiz,
    getTopicStats,
    getRecord,
    getTopicAccent,
    getAllTags,
    exportData,
    importData,
    resetAllData,
    setSettings,
  };
}
