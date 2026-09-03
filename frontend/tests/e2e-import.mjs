import { chromium } from 'playwright'

const URL = 'http://localhost:5173/'
const errors = []
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  -', m) } else { fail++; console.log('  FAIL-', m) } }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)

console.log('\n== Import screen ==')
await page.getByRole('button', { name: /Import File/ }).click()
await page.waitForTimeout(500)
ok(await page.getByRole('heading', { name: 'Import a Reviewer' }).isVisible(), 'import screen open')
ok(await page.getByText('Drop your reviewer here').isVisible(), 'dropzone visible')

console.log('\n== Paste mixed reviewer text ==')
const MIXED = `INFORMATION SECURITY MIDTERM REVIEWER
Chapter 1: Core Concepts

1. _____ is essential for safeguarding data and systems.
ans: Information Assurance and Security

Q: What does the CIA triad stand for?
A: Confidentiality, Integrity, and Availability

Encryption - the process of converting readable data into an unreadable format
Firewall — a device that monitors and filters incoming network traffic

Authentication is the process of verifying the identity of a user before granting access.

2. Which attack uses deceptive email to steal credentials?
3. What malware encrypts files and demands payment?

Answer Key
2. Phishing
3. Ransomware`
await page.getByLabel('Paste reviewer text').fill(MIXED)
await page.getByRole('button', { name: /Find questions/ }).click()
await page.waitForTimeout(700)

ok(await page.getByRole('heading', { name: /Review extracted questions/ }).isVisible(), 'review stage reached')
const rows = page.locator('ul > li').filter({ hasText: 'Answer:' })
const rowCount = await rows.count()
ok(rowCount >= 6, `extracted >= 6 questions (got ${rowCount})`)

const bodyText = await page.locator('body').innerText()
ok(/Information Assurance and Security/.test(bodyText), 'ans: format extracted')
ok(/Confidentiality, Integrity/.test(bodyText), 'Q&A pair extracted')
ok(/Phishing/.test(bodyText), 'answer key matched')
ok(/Encryption/.test(bodyText), 'definition extracted')
ok(!/INFORMATION SECURITY MIDTERM REVIEWER/.test(await page.locator('ul').first().innerText()), 'heading not a question')
await page.screenshot({ path: 'shots/20-import-review.png', fullPage: true })

console.log('\n== Review interactions ==')
ok(await page.getByText(/of \d+ questions selected/).isVisible(), 'selection counter visible')
await page.getByRole('button', { name: 'Clear all' }).click()
await page.waitForTimeout(300)
ok(await page.getByRole('button', { name: /Save & Cram to 100%/ }).isDisabled(), 'save disabled with 0 selected')
await page.getByRole('button', { name: 'Select all' }).click()
await page.getByLabel('Topic name').fill('Midterm Reviewer')
await page.waitForTimeout(300)
ok(!(await page.getByRole('button', { name: /Save & Cram to 100%/ }).isDisabled()), 're-enabled after select all + name')

// search filter
await page.getByLabel('Search extracted questions').fill('phishing')
await page.waitForTimeout(300)
const filtered = await page.locator('ul > li').filter({ hasText: 'Answer:' }).count()
ok(filtered >= 1 && filtered < rowCount, `search filters list (${filtered} of ${rowCount})`)
await page.getByLabel('Search extracted questions').fill('')
await page.waitForTimeout(300)

console.log('\n== Cram mode ==')
await page.getByLabel('Topic name').fill('Midterm Reviewer')
await page.getByRole('button', { name: /Save & Cram to 100%/ }).click()
await page.waitForTimeout(800)
ok(await page.getByText('CRAM').isVisible(), 'cram badge shown')
ok(await page.getByText(/0 of \d+ cleared/).isVisible(), 'cram progress counter')

// Answer everything WRONG for a full pass, then verify nothing was cleared.
const totalQ = Number((await page.getByText(/of (\d+) cleared/).innerText()).match(/of (\d+)/)[1])
ok(totalQ >= 6, 'cram deck has all questions: ' + totalQ)

for (let i = 0; i < totalQ; i++) {
  await page.getByPlaceholder('Type your answer...').fill('definitely wrong answer')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  ok(i > 0 || await page.getByText(/try again later/).isVisible(), 'cram shows re-queue label on miss')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(350)
}
const stillZero = await page.getByText(/0 of \d+ cleared/).isVisible()
ok(stillZero, 'after a full wrong pass, 0 cleared — nothing skipped')
ok(await page.getByText(/round 2/).isVisible(), 'advanced to round 2')
await page.screenshot({ path: 'shots/21-cram-round2.png', fullPage: true })

console.log('\n== Cram completion requires every answer correct ==')
// Learn each question's correct answer from the feedback panel, then answer
// correctly. The session must not end until every question is cleared.
const known = new Map()
let steps = 0
let completed = false
while (steps++ < 400) {
  if (await page.getByRole('heading', { name: 'Quiz Complete' }).isVisible().catch(() => false)) {
    completed = true
    break
  }
  const input = page.getByPlaceholder('Type your answer...')
  if (!(await input.isVisible().catch(() => false))) break

  // Read prompt and submit within the same settled frame, then wait for the
  // feedback panel before reading the revealed answer.
  await page.waitForTimeout(120)
  const heading = page.locator('#question-heading').first()
  if (!(await heading.isVisible().catch(() => false))) continue
  const prompt = (await heading.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
  if (!prompt) continue
  const guess = known.get(prompt)
  await input.fill(guess ?? 'unknown placeholder answer')
  await page.getByRole('button', { name: /^Submit$/ }).click()
  await page.getByRole('status').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(120)

  if (!guess) {
    const txt = await page.locator('body').innerText()
    const m = txt.match(/The correct answer is:\s*(.+)/)
    if (m) known.set(prompt, m[1].trim())
  }
  const nextBtn = page.getByRole('button', { name: /Next Question|try again later|See Results/ })
  if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click()
  await page.waitForTimeout(220)
}

ok(completed, `cram session completed after ${steps} steps`)
ok(await page.getByText('Quiz Complete').isVisible(), 'reached results only after clearing all')
const resultText = await page.locator('body').innerText()
ok(/Midterm Reviewer/.test(resultText), 'results show the topic name')
await page.screenshot({ path: 'shots/22-cram-complete.png', fullPage: true })

console.log('\n== Persistence of imported topic ==')
await page.getByRole('button', { name: /Back to Topics/ }).click()
await page.waitForTimeout(500)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const card = page.locator('main ul > li').filter({ hasText: 'Midterm Reviewer' })
ok((await card.count()) === 1, 'imported topic persisted after reload')
ok(/7 cards/.test(await card.innerText()), 'all 7 imported cards saved: ' + (await card.innerText()).replace(/\n/g, ' | '))
ok(await card.getByRole('button', { name: /Cram/ }).isVisible(), 'cram button on topic card')
await page.screenshot({ path: 'shots/23-home-imported.png', fullPage: true })

console.log(`\n${pass} passed, ${fail} failed`)
if (errors.length) { console.log('\nConsole errors:'); errors.slice(0, 10).forEach(e => console.log(' -', e)) }
else console.log('No console errors.')
await browser.close()
process.exit(fail || errors.length ? 1 : 0)
