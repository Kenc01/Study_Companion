import { parseNotes } from './parseNotes'
import type { Topic } from './types'
import { uid } from './utils'

interface Seed {
  name: string
  notes: string
}

const SEEDS: Seed[] = [
  {
    name: 'Information Assurance & Security',
    notes: `1. _____ is essential for safeguarding data, systems, and networks against unauthorized access.
ans: Information Assurance and Security / IAS

2. _____ transforms readable data into unreadable formats so that only authorized parties can interpret it.
ans: Encryption

3. The _____ triad describes confidentiality, integrity, and availability as the core goals of security.
ans: CIA

4. A _____ monitors network traffic and blocks packets that violate a configured rule set.
ans: firewall

5. _____ is the process of verifying that a user really is who they claim to be.
ans: Authentication

6. _____ determines what an authenticated user is permitted to do within a system.
ans: Authorization / Access control

7. Malicious software that encrypts a victim's files and demands payment is called _____.
ans: ransomware

8. _____ is a social engineering attack that uses deceptive email to steal credentials.
ans: Phishing

9. A _____ is a weakness in a system that an attacker can exploit.
ans: vulnerability

10. _____ ensures that a party cannot deny having performed an action, usually via digital signatures.
ans: Non-repudiation`,
  },
  {
    name: 'Cell Biology Basics',
    notes: `1. _____ is the powerhouse organelle where cellular respiration produces ATP.
ans: The mitochondrion / mitochondria

2. _____ is the process by which plants convert light energy into chemical energy.
ans: Photosynthesis

3. The _____ controls what enters and leaves the cell through selective permeability.
ans: cell membrane / plasma membrane

4. _____ carries the genetic instructions used in growth, development, and reproduction.
ans: DNA / Deoxyribonucleic acid

5. Protein synthesis takes place on small structures called _____.
ans: ribosomes

6. _____ is the division of a cell into two genetically identical daughter cells.
ans: Mitosis

7. The jelly-like fluid that fills the cell and suspends its organelles is the _____.
ans: cytoplasm

8. _____ is the movement of water across a semi-permeable membrane.
ans: Osmosis`,
  },
]

export function buildSampleTopics(): Topic[] {
  const now = Date.now()
  return SEEDS.map((seed, i) => {
    const { questions } = parseNotes(seed.notes)
    return {
      id: uid('topic'),
      name: seed.name,
      tags: i === 0 ? ['Security', 'Sample'] : ['Biology', 'Sample'],
      color: i % 6,
      rawNotes: seed.notes,
      questions,
      createdAt: now - i * 86_400_000,
      updatedAt: now - i * 86_400_000,
    }
  })
}
