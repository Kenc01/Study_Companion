import { parseNotes } from './src/lib/parseNotes.ts'
import { gradeAnswer } from './src/lib/matchAnswer.ts'

let pass=0, fail=0
const ok=(cond,msg)=>{ if(cond){pass++} else {fail++; console.log('FAIL:',msg)} }

// --- parsing ---
const notes = `1. _____ is essential for safeguarding data, systems, and networks.
ans: Information Assurance and Security

2. _____ transforms readable data into unreadable formats...
ANS:  Encryption

3. The _____ triad is confidentiality, integrity and availability.
ans: CIA / C.I.A.

this line has no answer

4. A _____ blocks packets.
ans: firewall or packet filter
`
const r = parseNotes(notes)
ok(r.questions.length===4, 'expected 4 questions, got '+r.questions.length)
ok(r.questions[0].prompt.startsWith('_____ is essential'), 'number stripped: '+r.questions[0].prompt)
ok(r.questions[1].answer==='Encryption', 'uppercase ANS: '+r.questions[1].answer)
ok(r.questions[2].alternatives.length===2, 'slash alternatives: '+JSON.stringify(r.questions[2].alternatives))
ok(r.questions[3].alternatives.join('|')==='firewall|packet filter', '"or" alternatives: '+JSON.stringify(r.questions[3].alternatives))
ok(r.skipped===1, 'orphan skipped, got '+r.skipped)
ok(parseNotes('').questions.length===0, 'empty input')
ok(parseNotes('garbage text with no answers').questions.length===0, 'garbage input')
ok(parseNotes('ans: lonely').questions.length===0, 'answer with no prompt')
// blanks normalised
ok(parseNotes('1. __ short blank\nans: x').questions[0].prompt.includes('_____'), 'blank normalised')
// no numbering still works
ok(parseNotes('_____ is water\nans: H2O').questions.length===1, 'unnumbered question')

// --- matching ---
const alts = ['Information Assurance and Security','IAS']
ok(gradeAnswer('information assurance and security', alts).correct, 'case-insensitive')
ok(gradeAnswer('  Information   Assurance and Security  ', alts).correct, 'whitespace collapse')
ok(gradeAnswer('IAS', alts).correct, 'alternative')
ok(gradeAnswer('ias', alts).correct, 'alt lowercase')
ok(gradeAnswer('information assurance', alts).correct, 'meaningful partial')
ok(!gradeAnswer('in', alts).correct, 'tiny fragment rejected')
ok(!gradeAnswer('data', alts).correct, 'unrelated word rejected')
ok(!gradeAnswer('', alts).correct, 'empty rejected')
ok(gradeAnswer('Encryption', ['Encryption']).correct, 'exact single')
ok(gradeAnswer('encription', ['Encryption']).correct, 'single typo tolerated')
ok(!gradeAnswer('cat', ['Encryption']).correct, 'wrong word')
ok(gradeAnswer('photosynth', ['Photosynthesis']).correct, 'long prefix')
ok(!gradeAnswer('pho', ['Photosynthesis']).correct, 'short prefix rejected')
ok(gradeAnswer('the cell membrane', ['cell membrane','plasma membrane']).correct, 'stop words ignored')
ok(gradeAnswer('mitochondria', ['The mitochondrion','mitochondria']).correct, 'plural alt')
ok(gradeAnswer('DNA', ['DNA','Deoxyribonucleic acid']).correct, 'acronym alt')
ok(!gradeAnswer('firewall', ['Encryption']).correct, 'clearly wrong')
ok(gradeAnswer('CIA', ['CIA']).correct, 'punctuation-free acronym')
ok(gradeAnswer('c.i.a.', ['CIA']).correct, 'punctuation stripped')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
