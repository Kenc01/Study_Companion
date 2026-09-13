import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Loader } from "@/components/Loader";
import { applyTheme } from "@/hooks/useSettings";
import { useQuizState } from "@/hooks/useQuizState";
import { HomeScreen } from "@/screens/HomeScreen";
import { ImportScreen } from "@/screens/ImportScreen";
import { PasteScreen } from "@/screens/PasteScreen";
import { QuizScreen } from "@/screens/QuizScreen";
import { ResultsScreen } from "@/screens/ResultsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SubjectScreen } from "@/screens/SubjectScreen";
import type { StudyCompanionExport } from "@/lib/types";

export default function App() {
  const app = useQuizState();
  const reduce = useReducedMotion();
  const backupFileRef = React.useRef<HTMLInputElement>(null);

  // Apply theme on first mount.
  React.useEffect(() => {
    applyTheme(app.settings.theme);
  }, [app.settings.theme]);

  // Example: Fetch status from our new backend API
  React.useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl) {
      fetch(`${apiUrl}/status`)
        .then((res) => res.json())
        .then((data) => console.log("Backend API Status:", data))
        .catch((err) => console.error("Error connecting to backend API:", err));
    }
  }, []);

  const transition = reduce
    ? { duration: 0.001 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  const variants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [app.screen, reduce]);

  const width =
    app.screen === "quiz" || app.screen === "results"
      ? "quiz"
      : app.screen === "paste" ||
          app.screen === "subject" ||
          app.screen === "import" ||
          app.screen === "settings"
        ? "form"
        : "home";

  const lastTopic = app.lastSession
    ? (app.topics.find((t) => t.id === app.lastSession?.topicId) ?? null)
    : null;

  /* ---------------- Export / Import ---------------- */
  const handleExport = () => {
    const data = app.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `study-companion-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFileClick = () => backupFileRef.current?.click();

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as StudyCompanionExport;
        const result = app.importData(data, false); // replace
        if (!result.ok) {
          alert(result.message);
        }
      } catch {
        alert("That file does not look like a Study Companion backup.");
      }
    };
    reader.readAsText(file);
  };

  /* ---------------- Bookmark / Theme --------------- */
  const toggleBookmarkInSession = React.useCallback(
    (questionId: string, bookmarked: boolean) => {
      if (!app.session) return;
      app.updateQuestionBookmark(app.session.topicId, questionId, bookmarked);
    },
    [app.session, app.updateQuestionBookmark],
  );

  const changeTheme = React.useCallback(
    (t: "light" | "dark" | "system") =>
      app.setSettings((s) => ({ ...s, theme: t })),
    [app.setSettings],
  );

  const startTest = React.useCallback(
    (topicId: string) => app.startQuiz(topicId, "test"),
    [app.startQuiz],
  );

  return (
    <AppShell width={width}>
      <a
        href="#main-view"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-ink"
      >
        Skip to content
      </a>

      <input
        ref={backupFileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          e.target.value = "";
        }}
      />

      <div id="main-view">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={app.screen}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={transition}
          >
            {app.isLoading ? (
              <Loader />
            ) : (
              app.screen === "home" && (
                <HomeScreen
                  topics={app.topics}
                  subjects={app.subjects}
                  getTopicStats={app.getTopicStats}
                  onCreate={app.openCreate}
                  onCreateSubject={app.openCreateSubject}
                  onImport={app.openImport}
                  onSettings={app.openSettings}
                  onEdit={app.openEdit}
                  onDelete={app.deleteTopic}
                  onStart={(id) => app.startQuiz(id)}
                  onCram={app.startCram}
                  onReview={app.startReview}
                  onBookmarked={app.startBookmarked}
                  onTest={startTest}
                  searchQuery={app.searchQuery}
                  setSearchQuery={app.setSearchQuery}
                  tagFilter={app.tagFilter}
                  setTagFilter={app.setTagFilter}
                  allTags={app.getAllTags()}
                  settings={app.settings}
                  onChangeTheme={changeTheme}
                  onExport={handleExport}
                  onImportFile={handleImportFileClick}
                />
              )
            )}

            {app.screen === "paste" && (
              <PasteScreen
                key={app.editingTopic?.id ?? "new"}
                editingTopic={app.editingTopic}
                initialSubject={app.creatingSubject}
                onBack={app.goHome}
                onSave={(input) => {
                  const topic = app.saveTopic(input);
                  if (topic) app.startQuizForTopic(topic);
                }}
              />
            )}

            {app.screen === "subject" && (
              <SubjectScreen
                onBack={app.goHome}
                onCreate={(name) => {
                  if (app.createSubject(name)) app.goHome();
                }}
              />
            )}

            {app.screen === "import" && (
              <ImportScreen
                onBack={app.goHome}
                onSave={({ name, rawNotes, questions, startCram }) => {
                  const topic = app.saveTopic({ name, rawNotes, questions });
                  if (topic)
                    app.startQuizForTopic(topic, startCram ? "cram" : "all");
                }}
              />
            )}

            {app.screen === "quiz" && app.session && (
              <QuizScreen
                session={app.session}
                getRecord={app.getRecord}
                onSubmit={app.submitAnswer}
                onNext={app.nextQuestion}
                onExit={app.exitQuiz}
                onRevealHint={app.revealHint}
                onToggleBookmark={toggleBookmarkInSession}
                settings={app.settings}
                sessionElapsedMs={app.sessionElapsedMs}
              />
            )}

            {app.screen === "results" && app.lastSession && (
              <ResultsScreen
                session={app.lastSession}
                topic={lastTopic}
                getRecord={app.getRecord}
                onRetryWrong={app.retryWrong}
                onRetryAll={app.retryAll}
                onNewNotes={app.openImport}
                onCram={() =>
                  app.lastSession && app.startCram(app.lastSession.topicId)
                }
                onReview={() =>
                  app.lastSession && app.startReview(app.lastSession.topicId)
                }
                onTest={() =>
                  app.lastSession && startTest(app.lastSession.topicId)
                }
                onHome={app.goHome}
                elapsedMs={
                  app.lastSession && Date.now() - app.lastSession.startedAt
                }
              />
            )}

            {app.screen === "settings" && (
              <SettingsScreen
                settings={app.settings}
                onChange={(patch) =>
                  app.setSettings((s) => ({ ...s, ...patch }))
                }
                onReset={() => {
                  // Reset all settings except theme (don't surprise the user).
                  app.setSettings((s) => ({
                    theme: s.theme,
                    strictness: "normal",
                    soundEffects: false,
                    showTimer: true,
                    autoAdvanceMs: 0,
                    enterSubmits: true,
                  }));
                }}
                onBack={app.goHome}
                onExport={handleExport}
                onImport={handleImportFile}
                onResetAllData={() => {
                  if (
                    confirm(
                      "Erase all topics and progress? This cannot be undone.",
                    )
                  ) {
                    app.resetAllData();
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
