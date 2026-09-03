/**
 * Simulates the cram-mode queue logic from useQuizState.nextQuestion to prove
 * the invariant: a session cannot end until every question is answered
 * correctly, and no question is ever dropped.
 */
const shuffle = (a) => { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[o[i], o[j]] = [o[j], o[i]] } return o }

let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m) } }

function advance(s) {
  const justAnswered = s.logs[s.logs.length - 1]
  const current = s.questions[s.index]
  const pending = s.pendingIds
  let nextPending = pending
  if (justAnswered && current && justAnswered.questionId === current.id) {
    nextPending = justAnswered.correct
      ? pending.filter((id) => id !== current.id)
      : [...pending.filter((id) => id !== current.id), current.id]
  }
  const total = s.totalCount
  const cleared = total - nextPending.length
  if (!nextPending.length) return { ...s, pendingIds: [], clearedCount: cleared, done: true }

  const remaining = s.questions.slice(s.index + 1).filter((q) => nextPending.includes(q.id))
  if (remaining.length) {
    let ni = s.index + 1
    while (ni < s.questions.length && !nextPending.includes(s.questions[ni].id)) ni++
    return { ...s, index: ni, pendingIds: nextPending, clearedCount: cleared }
  }
  const requeued = shuffle(s.questions.filter((q) => nextPending.includes(q.id)))
  return { ...s, questions: requeued, index: 0, pendingIds: nextPending, clearedCount: cleared, round: s.round + 1 }
}

function runCram(n, correctFn, maxSteps = 100000) {
  const questions = Array.from({ length: n }, (_, i) => ({ id: 'q' + i }))
  let s = { questions: shuffle(questions), index: 0, logs: [], pendingIds: questions.map(q => q.id), clearedCount: 0, totalCount: n, round: 1, done: false }
  const attempts = {}
  let steps = 0
  while (!s.done && steps < maxSteps) {
    steps++
    const cur = s.questions[s.index]
    if (!cur) { console.log('BUG: no current question'); break }
    attempts[cur.id] = (attempts[cur.id] || 0) + 1
    const correct = correctFn(cur.id, attempts[cur.id])
    s = { ...s, logs: [...s.logs, { questionId: cur.id, correct }] }
    s = advance(s)
  }
  return { session: s, attempts, steps }
}

// 1. All correct first try -> ends in exactly n steps, one round
const r1 = runCram(10, () => true)
ok(r1.session.done, 'perfect run completes')
ok(r1.steps === 10, 'perfect run takes exactly 10 steps: ' + r1.steps)
ok(r1.session.clearedCount === 10, 'all 10 cleared')
ok(r1.session.round === 1, 'single round: ' + r1.session.round)

// 2. Always wrong until 3rd attempt -> every question attempted >= 3 times, still terminates
const r2 = runCram(8, (_id, att) => att >= 3)
ok(r2.session.done, 'stubborn run still completes')
ok(Object.values(r2.attempts).every((a) => a === 3), 'each question attempted exactly 3x: ' + JSON.stringify(r2.attempts))
ok(r2.session.clearedCount === 8, 'all 8 cleared eventually')

// 3. One specific question always wrong until attempt 10
const r3 = runCram(5, (id, att) => id === 'q3' ? att >= 10 : true)
ok(r3.session.done, 'single hard question completes')
ok(r3.attempts.q3 === 10, 'hard question repeated until correct: ' + r3.attempts.q3)
ok(Object.keys(r3.attempts).length === 5, 'no question dropped')

// 4. Random correctness — the critical invariant, run many times
let allOk = true, everDropped = false
for (let t = 0; t < 300; t++) {
  const n = 3 + Math.floor(Math.random() * 12)
  const r = runCram(n, () => Math.random() > 0.55)
  if (!r.session.done) allOk = false
  if (Object.keys(r.attempts).length !== n) everDropped = true
  if (r.session.clearedCount !== n) allOk = false
}
ok(allOk, 'all 300 random cram runs terminate with every question cleared')
ok(!everDropped, 'no question ever dropped across 300 random runs')

// 5. Single question deck
const r5 = runCram(1, (_i, att) => att >= 4)
ok(r5.session.done && r5.attempts.q0 === 4, 'single-question deck loops correctly')

// 6. Large deck performance
const r6 = runCram(200, (_i, att) => att >= 2)
ok(r6.session.done, '200-question deck completes')
ok(r6.steps === 400, '200 deck with 2 attempts each = 400 steps: ' + r6.steps)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
