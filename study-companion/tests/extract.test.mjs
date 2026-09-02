import { autoExtractQuestions } from '../src/lib/autoExtract.ts'
import { cleanDocumentText } from '../src/lib/extractText.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++ } else { fail++; console.log('FAIL:', m) } }

// 1. Original ans: format
const r1 = autoExtractQuestions(`1. _____ is essential for safeguarding data.
ans: Information Assurance and Security

2. _____ transforms readable data.
ans: Encryption`)
ok(r1.drafts.length === 2, 'ans-format count: ' + r1.drafts.length)
ok(r1.counts['ans-format'] === 2, 'ans-format method tagged')

// 2. Q&A pairs
const r2 = autoExtractQuestions(`Q: What is the CIA triad?
A: Confidentiality, Integrity, Availability

Question 2: What does a firewall do?
Answer: Filters network traffic

3. What is phishing? Answer: A social engineering attack via email`)
ok(r2.drafts.length === 3, 'qa pairs found: ' + r2.drafts.length + ' ' + JSON.stringify(r2.drafts.map(d=>d.prompt)))
ok(r2.drafts.some(d => /CIA triad/.test(d.prompt)), 'Q: prefix stripped')
ok(r2.drafts.some(d => d.answer === 'Filters network traffic'), 'multi-word answer kept')

// 3. Numbered questions + answer key at the end
const r3 = autoExtractQuestions(`1. What protocol secures web traffic?
2. What converts plaintext to ciphertext?
3. What blocks unauthorized packets?

Answer Key
1. HTTPS
2. Encryption
3. Firewall`)
ok(r3.drafts.length === 3, 'answer-key pairs: ' + r3.drafts.length)
ok(r3.counts['answer-key'] === 3, 'answer-key method: ' + JSON.stringify(r3.counts))
const q1 = r3.drafts.find(d => /protocol secures/.test(d.prompt))
ok(q1 && q1.answer === 'HTTPS', 'key matched to right number: ' + (q1 && q1.answer))
ok(!r3.drafts.some(d => /Answer Key/i.test(d.prompt)), 'key block not turned into a question')

// 4. Term - definition lists
const r4 = autoExtractQuestions(`Encryption - the process of converting readable data into unreadable format
Firewall — a device that monitors and filters network traffic
Malware: software designed to damage or gain unauthorized access`)
ok(r4.drafts.length === 3, 'definitions found: ' + r4.drafts.length)
ok(r4.drafts.every(d => d.prompt.includes('_____')), 'definition prompts blanked')
ok(r4.drafts.some(d => d.answer === 'Encryption'), 'term became the answer')

// 5. Cloze from prose
const r5 = autoExtractQuestions(`Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.
Osmosis refers to the movement of water across a semi permeable membrane from low to high concentration.
The weather today is quite nice and I went for a walk in the park.`)
ok(r5.counts.cloze >= 2, 'cloze generated: ' + r5.counts.cloze)
ok(r5.drafts.every(d => d.prompt.startsWith('_____')), 'cloze blanks the subject')
ok(r5.drafts.some(d => d.answer.toLowerCase() === 'photosynthesis'), 'cloze answer correct')

// 6. Mixed document — the realistic case
const mixed = `INFORMATION ASSURANCE REVIEWER
Chapter 1: Fundamentals

1. _____ is essential for safeguarding data.
ans: Information Assurance and Security

Q: What does the acronym CIA stand for in security?
A: Confidentiality, Integrity, and Availability

Encryption - the process of encoding information so only authorized parties can read it

Authentication is the process of verifying the identity of a user or system.

2. Which device filters network traffic?
3. What attack uses deceptive email?

Answer Key
2. Firewall
3. Phishing`
const r6 = autoExtractQuestions(mixed)
ok(r6.drafts.length >= 6, 'mixed doc extracted >=6: ' + r6.drafts.length)
const methods = new Set(r6.drafts.map(d => d.method))
ok(methods.size >= 4, 'multiple strategies used: ' + [...methods].join(','))
ok(!r6.drafts.some(d => /^INFORMATION ASSURANCE REVIEWER/i.test(d.prompt)), 'title heading skipped')
ok(!r6.drafts.some(d => /^Chapter 1/i.test(d.prompt)), 'chapter heading skipped')

// 7. Robustness
ok(autoExtractQuestions('').drafts.length === 0, 'empty input safe')
ok(autoExtractQuestions('   \n\n  \n').drafts.length === 0, 'whitespace only safe')
ok(autoExtractQuestions('a').drafts.length === 0, 'single char safe')
const junk = autoExtractQuestions('!!! ??? ... ;;; ###\n\n@@@@@')
ok(junk.drafts.length === 0, 'junk produces nothing, no crash')

// 8. No duplicates
const dup = autoExtractQuestions(`1. _____ is a firewall.
ans: Firewall

1. _____ is a firewall.
ans: Firewall`)
ok(dup.drafts.length === 1, 'duplicate prompts collapsed: ' + dup.drafts.length)

// 9. cleanDocumentText
ok(cleanDocumentText('encryp-\ntion is good') === 'encryption is good', 'hyphen rejoin: ' + cleanDocumentText('encryp-\ntion is good'))
const withPageNums = cleanDocumentText('Real content here\n1\nMore content\n2')
ok(!/^\d+$/m.test(withPageNums), 'bare page numbers stripped')
ok(cleanDocumentText('a\n\n\n\n\nb') === 'a\n\nb', 'blank lines collapsed')
// repeated header removal
const hdr = ['Study Reviewer 2024','Content one','Study Reviewer 2024','Content two','Study Reviewer 2024','Content three','Study Reviewer 2024'].join('\n')
ok(!cleanDocumentText(hdr).includes('Study Reviewer 2024'), 'repeated header removed')

// 10. Alternatives
const alt = autoExtractQuestions(`1. _____ carries genetic instructions.
ans: DNA / Deoxyribonucleic acid`)
ok(alt.drafts[0].alternatives.length === 2, 'slash alternatives parsed')

// 11. Blank line between question and answer (very common in PDFs)
const spaced = autoExtractQuestions(`1. _____ is essential for safeguarding data.

ans: Information Assurance and Security

2. _____ transforms readable data.

ans: Encryption

Q: What does the CIA triad stand for?

A: Confidentiality, Integrity, and Availability`)
ok(spaced.drafts.length === 3, 'blank-line separated Q/A parsed: ' + spaced.drafts.length)
ok(spaced.drafts.some(d => d.answer === 'Encryption'), 'spaced ans: matched')
ok(spaced.drafts.some(d => /CIA triad/.test(d.prompt) && /Confidentiality/.test(d.answer)), 'bare A: matched to Q:')

// 12. Bare "A:" must NOT hijack unrelated lines
const noHijack = autoExtractQuestions(`Chapter 1: Intro

A: this is just a lettered list item that is fairly long text here`)
ok(noHijack.drafts.length === 0, 'stray A: line ignored without a question: ' + noHijack.drafts.length)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
