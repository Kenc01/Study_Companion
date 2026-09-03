/**
 * Pulls raw text out of an uploaded file. PDF and DOCX parsers are loaded
 * lazily so they never touch the initial bundle.
 */

export interface ExtractedDoc {
  text: string
  /** Page count for PDFs, otherwise undefined. */
  pages?: number
  fileName: string
}

export class ExtractError extends Error {}

const MAX_BYTES = 25 * 1024 * 1024

export const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.text', '.docx'] as const

export function isSupportedFile(file: File) {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/**
 * PDFs often break a word across lines with a hyphen, hard-wrap sentences,
 * and repeat page furniture. Clean that up so sentence logic works.
 */
export function cleanDocumentText(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')

  // Drop control chars but keep newlines/tabs.
  // oxlint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')

  // Re-join words hyphenated across a line break: "encryp-\ntion" -> "encryption"
  text = text.replace(/([A-Za-z])-\n([a-z])/g, '$1$2')

  const lines = text.split('\n')

  // Remove page furniture repeated on many pages (headers/footers).
  const freq = new Map<string, number>()
  for (const line of lines) {
    const key = line.trim()
    if (key.length > 3 && key.length < 80) freq.set(key, (freq.get(key) ?? 0) + 1)
  }
  const pageBreaks = (text.match(/\f/g) ?? []).length + 1
  const repeated = new Set(
    [...freq.entries()]
      .filter(([, n]) => n >= Math.max(3, Math.floor(pageBreaks * 0.6)))
      .map(([k]) => k),
  )

  const kept = lines.filter((line) => {
    const t = line.trim()
    if (!t) return true
    if (/^\f?\s*(page\s*)?\d{1,4}\s*(\/\s*\d{1,4})?$/i.test(t)) return false // bare page numbers
    if (repeated.has(t)) return false
    return true
  })

  return kept
    .join('\n')
    .replace(/\f/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractPdf(file: File): Promise<ExtractedDoc> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
  }).promise

  const chunks: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()

    // Rebuild lines using the y-coordinate of each text item.
    let line = ''
    let lastY: number | null = null
    const pageLines: string[] = []

    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageLines.push(line.trim())
        line = ''
      }
      line += item.str
      if ('hasEOL' in item && item.hasEOL) {
        pageLines.push(line.trim())
        line = ''
      }
      lastY = y
    }
    if (line.trim()) pageLines.push(line.trim())
    chunks.push(pageLines.join('\n'))
    page.cleanup()
  }

  const text = cleanDocumentText(chunks.join('\n\n'))
  if (!text.trim()) {
    throw new ExtractError(
      'No selectable text found in this PDF. It may be a scanned image — try a text-based PDF or paste the text directly.',
    )
  }
  return { text, pages: doc.numPages, fileName: file.name }
}

async function extractDocx(file: File): Promise<ExtractedDoc> {
  const mammoth = await import('mammoth/mammoth.browser.js')
  const buffer = await file.arrayBuffer()
  const result = await (
    mammoth as unknown as {
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
    }
  ).extractRawText({ arrayBuffer: buffer })
  const text = cleanDocumentText(result.value ?? '')
  if (!text.trim()) throw new ExtractError('This Word document appears to be empty.')
  return { text, fileName: file.name }
}

async function extractPlain(file: File): Promise<ExtractedDoc> {
  const text = cleanDocumentText(await file.text())
  if (!text.trim()) throw new ExtractError('This file appears to be empty.')
  return { text, fileName: file.name }
}

export async function extractTextFromFile(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_BYTES) {
    throw new ExtractError('That file is larger than 25 MB. Try splitting it into sections.')
  }
  const name = file.name.toLowerCase()
  try {
    if (name.endsWith('.pdf')) return await extractPdf(file)
    if (name.endsWith('.docx')) return await extractDocx(file)
    if (name.endsWith('.doc')) {
      throw new ExtractError(
        'Legacy .doc files aren’t supported. Save it as .docx or PDF and try again.',
      )
    }
    return await extractPlain(file)
  } catch (error) {
    if (error instanceof ExtractError) throw error
    throw new ExtractError(
      `Couldn’t read “${file.name}”. It may be corrupted, password-protected, or an unsupported format.`,
    )
  }
}
