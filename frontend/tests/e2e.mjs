import { chromium } from 'playwright'

const URL = 'http://localhost:5173/'
const errors = []
let pass = 0
let fail = 0
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('  ok  -', msg) }
  else { fail++; console.log('  FAIL-', msg) }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })

console.log('\n== Home / sample data ==')
ok(await page.getByRole('heading', { name: 'Study Companion' }).isVisible(), 'app title visible')
const cards = page.locator('main ul > li')
ok((await cards.count()) === 2, 'two sample topics seeded')
ok(await page.getByText('2 topics').isVisible(), 'subtitle shows topic count')
ok(await page.getByRole('button', { name: /Start Quiz/ }).first().isVisible(), 'start quiz button')
await page.screenshot({ path: 'shots/01-home.png', fullPage: true })

console.log('\n== Create topic (validation) ==')
await page.getByRole('button', { name: 'New Topic' }).click()
await page.waitForTimeout(400)
ok(await page.getByRole('heading', { name: 'Create a Quiz Topic' }).isVisible(), 'paste screen open')
await page.getByRole('button', { name: /Save & Start Quiz/ }).click()
await page.waitForTimeout(300)
ok((await page.getByRole('alert').count()) >= 2, 'inline errors shown for empty form')
ok(await page.getByRole('button', { name: /Save & Start Quiz/ }).isDisabled(), 'submit disabled while invalid')
await page.screenshot({ path: 'shots/02-paste-errors.png', fullPage: true })

// text preservation on invalid notes
await page.getByLabel('Topic name').fill('Test Deck')
await page.getByLabel('Your notes').fill('this has no answers at all')
await page.waitForTimeout(250)
ok((await page.getByLabel('Your notes').inputValue()) === 'this has no answers at all', 'pasted text preserved after invalid')
ok(await page.getByText('No questions yet').isVisible(), 'live counter reports no questions')

const NOTES = `1. _____ is essential for safeguarding data.
ans: Information Assurance and Security

2. _____ transforms readable data into unreadable formats.
ans: Encryption

3. A _____ blocks packets that violate a rule set.
ans: firewall`
await page.getByLabel('Your notes').fill(NOTES)
await page.waitForTimeout(300)
ok(await page.getByText('3 questions detected').isVisible(), 'live parse count = 3')
ok(!(await page.getByRole('button', { name: /Save & Start Quiz/ }).isDisabled()), 'submit enabled when valid')
await page.screenshot({ path: 'shots/03-paste-valid.png', fullPage: true })

console.log('\n== Quiz flow ==')
await page.getByRole('button', { name: /Save & Start Quiz/ }).click()
await page.waitForTimeout(600)
ok(await page.getByText('Question 1 of 3').isVisible(), 'quiz started at question 1')
ok(await page.getByText('Fill in the blank').isVisible(), 'fill-in-the-blank label')
const input = page.getByPlaceholder('Type your answer...')
ok(await input.evaluate((el) => el === document.activeElement), 'answer input autofocused')
await page.screenshot({ path: 'shots/04-quiz.png', fullPage: true })

// Deliberately wrong answer via Enter key
const missedPrompt = await page.locator('#question-heading').innerText()
await input.fill('completely wrong')
await input.press('Enter')
await page.waitForTimeout(450)
ok(await page.getByText('Wrong.').isVisible(), 'wrong feedback shown')
ok(await page.getByText(/The correct answer is:/).isVisible(), 'correct answer revealed')
ok((await page.getByPlaceholder('Type your answer...').inputValue()) === 'completely wrong', 'user answer stays visible')
ok(await page.getByRole('button', { name: /Next Question/ }).isVisible(), 'next button appears')
await page.screenshot({ path: 'shots/05-wrong.png', fullPage: true })

// duplicate submission guard: press Enter would advance, so re-check submit is gone
ok((await page.getByRole('button', { name: 'Submit' }).count()) === 0, 'submit hidden after grading (no double submit)')

await page.getByRole('button', { name: /Next Question/ }).click()
await page.waitForTimeout(450)
ok(await page.getByText('Question 2 of 3').isVisible(), 'advanced to question 2')

// Answer remaining two correctly by reading the prompt
for (let i = 0; i < 2; i++) {
  const prompt = await page.locator('#question-heading').innerText()
  let ans = 'Encryption'
  if (/blocks packets/i.test(prompt)) ans = 'firewall'
  else if (/safeguarding data/i.test(prompt)) ans = 'Information Assurance and Security'
  const inp = page.getByPlaceholder('Type your answer...')
  await inp.fill(ans)
  await inp.press('Enter')
  await page.waitForTimeout(400)
  if (i === 0) {
    ok(await page.getByText('Correct!').isVisible(), 'correct feedback shown')
    const streakOk = await page.getByText('Streak').isVisible()
    ok(streakOk, 'streak stat visible')
  }
  await page.keyboard.press('Enter') // advance via Enter
  await page.waitForTimeout(500)
}

console.log('\n== Results ==')
ok(await page.getByRole('heading', { name: 'Quiz Complete' }).isVisible(), 'results screen reached automatically')
ok(await page.getByText('2 / 3').isVisible(), 'score 2/3 shown')
ok(await page.getByText('67%').isVisible(), 'percentage shown')
ok(await page.getByRole('heading', { name: 'Review Your Answers' }).isVisible(), 'review section')
ok(await page.getByText('Your answer', { exact: true }).isVisible(), 'wrong answer card shows user answer')
ok(await page.getByRole('heading', { name: 'Mastery progress' }).isVisible(), 'mastery section')
ok(!(await page.getByRole('button', { name: /Retry Wrong Answers/ }).isDisabled()), 'retry wrong enabled with 1 wrong')
await page.screenshot({ path: 'shots/06-results.png', fullPage: true })

console.log('\n== Retry wrong only ==')
await page.getByRole('button', { name: /Retry Wrong Answers/ }).click()
await page.waitForTimeout(600)
ok(await page.getByText('Question 1 of 1').isVisible(), 'retry-wrong uses only the 1 missed question')
ok(await page.getByText(/missed answers/).isVisible(), 'mode label shown')
const p2 = await page.locator('#question-heading').innerText()
ok(p2 === missedPrompt, 'the retried question is the one missed')
// partial / alternative match acceptance
const partialFor = (prompt) =>
  /blocks packets/i.test(prompt) ? 'firewall'
  : /safeguarding data/i.test(prompt) ? 'information assurance'  // partial of the full phrase
  : 'encryption'
await page.getByPlaceholder('Type your answer...').fill(partialFor(p2))
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
ok(await page.getByText('Correct!').isVisible(), 'partial answer accepted as correct')
await page.keyboard.press('Enter')
await page.waitForTimeout(600)
ok(await page.getByText(/Perfect score/).isVisible(), 'perfect score banner + confetti')
await page.screenshot({ path: 'shots/07-perfect.png', fullPage: true })
ok(await page.getByRole('button', { name: /Retry Wrong Answers/ }).isDisabled(), 'retry wrong disabled at 0 wrong')
ok(await page.getByText('Nothing to review').isVisible(), 'positive empty review state')

console.log('\n== Retry all shuffled ==')
await page.getByRole('button', { name: /Retry All/ }).click()
await page.waitForTimeout(600)
ok(await page.getByText('Question 1 of 3').isVisible(), 'retry all uses full deck')
await page.getByRole('button', { name: /Exit quiz/ }).click()
await page.waitForTimeout(500)
ok((await page.locator('main ul > li').count()) === 3, 'back home with 3 topics')

console.log('\n== Mastery persistence across sessions ==')
// Answer "Encryption" correctly 3x in a row over separate sessions to master it.
const masterOnce = async () => {
  await page.locator('main ul > li').filter({ hasText: 'Test Deck' }).getByRole('button', { name: /Start Quiz/ }).click()
  await page.waitForTimeout(500)
  for (let i = 0; i < 3; i++) {
    const prompt = await page.locator('#question-heading').innerText()
    let ans = 'Encryption'
    if (/blocks packets/i.test(prompt)) ans = 'firewall'
    else if (/safeguarding data/i.test(prompt)) ans = 'Information Assurance and Security'
    await page.getByPlaceholder('Type your answer...').fill(ans)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(350)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(450)
  }
  await page.getByRole('button', { name: /Back to Topics/ }).click()
  await page.waitForTimeout(500)
}
await masterOnce()
await masterOnce()
const testCard = page.locator('main ul > li').filter({ hasText: 'Test Deck' })
ok((await testCard.innerText()).includes('100%'), 'deck reaches 100% mastery after 3 clean runs: ' + (await testCard.innerText()).replace(/\n/g, ' | '))
await page.screenshot({ path: 'shots/08-mastered.png', fullPage: true })

console.log('\n== Reload persistence ==')
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
ok((await page.locator('main ul > li').count()) === 3, 'topics persisted after reload')
const afterReload = await page.locator('main ul > li').filter({ hasText: 'Test Deck' }).innerText()
ok(afterReload.includes('100%'), 'mastery persisted after reload')

console.log('\n== Edit topic ==')
await page.locator('main ul > li').filter({ hasText: 'Test Deck' }).getByRole('button', { name: /Edit topic/ }).click()
await page.waitForTimeout(500)
ok(await page.getByRole('heading', { name: 'Edit Quiz Topic' }).isVisible(), 'edit screen open')
ok((await page.getByLabel('Topic name').inputValue()) === 'Test Deck', 'existing name prefilled')
ok((await page.getByLabel('Your notes').inputValue()).includes('ans: Encryption'), 'existing notes prefilled')
await page.getByLabel('Topic name').fill('Renamed Deck')
await page.getByRole('button', { name: /Save & Start Quiz/ }).click()
await page.waitForTimeout(600)
ok(await page.getByText('Renamed Deck').first().isVisible(), 'edited name used in quiz')
await page.getByRole('button', { name: /Exit quiz/ }).click()
await page.waitForTimeout(500)
const renamed = page.locator('main ul > li').filter({ hasText: 'Renamed Deck' })
ok((await renamed.count()) === 1, 'renamed topic in library')
ok((await renamed.innerText()).includes('100%'), 'mastery preserved through edit')

console.log('\n== Delete topic ==')
await renamed.getByRole('button', { name: /Delete topic/ }).click()
await page.waitForTimeout(400)
ok(await page.getByRole('dialog').isVisible(), 'confirm dialog open')
await page.screenshot({ path: 'shots/09-delete.png', fullPage: true })
await page.getByRole('button', { name: 'Cancel' }).click()
await page.waitForTimeout(350)
ok((await page.locator('main ul > li').count()) === 3, 'cancel keeps the topic')
await renamed.getByRole('button', { name: /Delete topic/ }).click()
await page.waitForTimeout(350)
await page.getByRole('button', { name: /Delete topic$/ }).click()
await page.waitForTimeout(600)
ok((await page.locator('main ul > li').count()) === 2, 'topic deleted')

console.log('\n== Empty state ==')
await page.evaluate(() => { localStorage.setItem('study-companion:topics:v1', '[]') })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
ok(await page.getByRole('heading', { name: 'No quiz topics yet' }).isVisible(), 'empty state shown')
ok(await page.getByText('Create your first quiz topic').isVisible(), 'empty subtitle')
ok(await page.getByRole('button', { name: /Create First Topic/ }).isVisible(), 'create first topic CTA')
await page.screenshot({ path: 'shots/10-empty.png', fullPage: true })

console.log('\n== Corrupted localStorage ==')
await page.evaluate(() => {
  localStorage.setItem('study-companion:topics:v1', '{{{not json')
  localStorage.setItem('study-companion:mastery:v1', 'oops')
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
ok(await page.getByRole('heading', { name: 'Study Companion' }).isVisible(), 'app recovers from corrupted storage')

console.log('\n== Responsive ==')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
for (const [w, h, name] of [[375, 812, 'mobile'], [768, 1024, 'tablet'], [1280, 900, 'desktop']]) {
  await page.setViewportSize({ width: w, height: h })
  await page.waitForTimeout(400)
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
  ok(scrollW <= w + 1, `no horizontal scroll at ${w}px (scrollWidth=${scrollW})`)
  await page.screenshot({ path: `shots/11-${name}-home.png`, fullPage: true })
}
// mobile quiz + button heights
await page.setViewportSize({ width: 375, height: 812 })
await page.getByRole('button', { name: /Start Quiz/ }).first().click()
await page.waitForTimeout(700)
const sw2 = await page.evaluate(() => document.documentElement.scrollWidth)
ok(sw2 <= 376, `no horizontal scroll in mobile quiz (${sw2})`)
const btnH = await page.getByRole('button', { name: 'Submit' }).evaluate((el) => el.getBoundingClientRect().height)
ok(btnH >= 44, `submit button >= 44px tall (${btnH})`)
const inpH = await page.getByPlaceholder('Type your answer...').evaluate((el) => el.getBoundingClientRect().height)
ok(inpH >= 44, `answer input >= 44px tall (${inpH})`)
await page.screenshot({ path: 'shots/12-mobile-quiz.png', fullPage: true })

console.log('\n== Accessibility spot checks ==')
const unlabeled = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  return btns.filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length
})
ok(unlabeled === 0, `all icon-only buttons labelled (${unlabeled} unlabeled)`)
const unlabeledInputs = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('input, textarea'))
  return els.filter((el) => !el.getAttribute('aria-label') && !el.id ? true : el.id ? !document.querySelector(`label[for="${el.id}"]`) && !el.getAttribute('aria-label') : true).length
})
ok(unlabeledInputs === 0, `all inputs labelled (${unlabeledInputs} unlabeled)`)

console.log(`\n${pass} passed, ${fail} failed`)
if (errors.length) { console.log('\nConsole errors:'); errors.slice(0, 12).forEach((e) => console.log(' -', e)) }
else console.log('No console errors.')

await browser.close()
process.exit(fail || errors.length ? 1 : 0)
