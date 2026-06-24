/**
 * One-time import script: historical Excel discharge feedback → Supabase DB
 * Run: node --experimental-strip-types scripts/import-excel-data.ts
 *
 * Sheet layout (Discharge Feedback ):
 *   Row 1  (index 0) — section group headers        [skip]
 *   Row 2  (index 1) — full Q-text labels            [skip]
 *   Row 3  (index 2) — column names (S.No, MRN …)   [used to confirm structure]
 *   Row 4+ (index 3+) — data rows
 *
 * Column positions:
 *   0  S.No          1  MRN No       2  Patient Name   3  Father Name
 *   4  Guardian Name 5  Guardian Rel 6  Date of Proc   7  Date of Disch
 *   8  Contact No    9–65  Q1–Q57
 */

// ── Bootstrap env + deps ──────────────────────────────────────────────────────
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const path = require('path')

// ── Prisma client (mirrors src/lib/prisma.ts) ─────────────────────────────────
function createPrisma(): typeof PrismaClient.prototype {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  return new PrismaClient({ adapter })
}

// ── Answer normalisation ──────────────────────────────────────────────────────
// Maps lowercase source text → canonical stored value.
const NORM: Record<string, string> = {
  // Yes / No / Not Applicable
  'yes':            'Yes',
  'no':             'No',
  'not applicable': 'Not Applicable',
  'n/a':            'Not Applicable',
  // Frequency scale
  'never':          'Never',
  'sometimes':      'Sometimes',
  'usually':        'Usually',
  'always':         'Always',
  // Yes Definitely / Somewhat variants (both comma and no-comma)
  'yes definitely':  'Yes, Definitely',
  'yes, definitely': 'Yes, Definitely',
  'yes somewhat':    'Yes, Somewhat',
  'yes, somewhat':   'Yes, Somewhat',
  // Typo found in Q47 (Overall Care)
  'exellent':       'Excellent',
}

function normaliseAnswer(raw: unknown, qNum: number): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'number') return String(raw)   // Q45 rating arrives as a bare number
  const s = String(raw).trim()
  if (!s) return ''
  if (qNum === 55) return s                          // free text — preserve exactly

  // Q45: "10 Best Hospital Possible" / "0 Worst Hospital Possible" → extract leading digit(s)
  if (qNum === 45) {
    const m = s.match(/^(\d+)\s/)
    if (m) return m[1]
  }

  return NORM[s.toLowerCase()] ?? s
}

// ── Excel date helpers ────────────────────────────────────────────────────────
// Excel serial → JS Date (accounts for Excel's 1900 leap-year bug)
function excelSerialToDate(serial: number): Date {
  const msPerDay = 86_400_000
  // Excel epoch = Dec 30 1899 in UTC
  const epochMs = Date.UTC(1899, 11, 30)
  return new Date(epochMs + serial * msPerDay)
}

interface ParsedDate {
  date:       Date | null
  rawText:    string        // original cell string, if it was text
  isDeceased: boolean
  couldParse: boolean
}

const MONTH_IDX: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
}

function parseCellDate(val: unknown): ParsedDate {
  if (val === null || val === undefined || val === '') {
    return { date: null, rawText: '', isDeceased: false, couldParse: false }
  }
  if (typeof val === 'number') {
    return { date: excelSerialToDate(val), rawText: '', isDeceased: false, couldParse: true }
  }

  const raw = String(val).trim()
  if (!raw) return { date: null, rawText: '', isDeceased: false, couldParse: false }

  const isDeceased = /died/i.test(raw)
  // Strip "(died)" / "(…)" annotation to get the bare date string
  const bare = raw.replace(/\s*\([^)]*\)\s*/g, '').trim()

  // Try "DD-Mon-YY" or "DD-Mon-YYYY"
  const m = bare.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mon = MONTH_IDX[m[2].toLowerCase()] ?? 0
    let yr  = parseInt(m[3], 10)
    if (yr < 100) yr += 2000
    return { date: new Date(Date.UTC(yr, mon, day)), rawText: raw, isDeceased, couldParse: true }
  }

  // Fallback: let JS try
  const attempt = new Date(bare)
  if (!isNaN(attempt.getTime())) {
    return { date: attempt, rawText: raw, isDeceased, couldParse: true }
  }

  return { date: null, rawText: raw, isDeceased, couldParse: false }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const SHEET = 'Discharge Feedback '
  const FILE  = path.join(__dirname, '..', 'src', 'data', 'Discharge_Feedback_Sheet.xlsx')

  console.log('Reading:', FILE)
  const wb  = XLSX.readFile(FILE)
  const ws  = wb.Sheets[SHEET]
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in workbook`)

  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const dataRows = allRows.slice(3)   // skip section headers, Q-text row, column-name row

  const prisma = createPrisma()

  let imported  = 0
  let skipped   = 0
  const flagged: string[] = []

  for (const row of dataRows) {
    // ── Skip blank rows (S.No present but no MRN) ────────────────────────────
    const mrn = String(row[1] ?? '').trim()
    if (!mrn) continue

    const patientName  = String(row[2] ?? '').trim()
    const fatherName   = String(row[3] ?? '').trim()
    const contactNumber = String(row[8] ?? '').trim()

    const dopParsed = parseCellDate(row[6])
    const dodParsed = parseCellDate(row[7])

    // ── Build answers JSON (q1 … q57, q55 stored as q55_text) ────────────────
    const answers: Record<string, unknown> = {}

    for (let qi = 0; qi < 57; qi++) {
      const qNum = qi + 1
      const val  = normaliseAnswer(row[9 + qi], qNum)
      if (!val) continue

      if (qNum === 55) {
        answers['q55_text'] = val   // key consumed by comments page
      } else {
        answers[`q${qNum}`] = val
      }
    }

    // Store discharge date metadata (the only schema field missing for this data)
    if (dodParsed.rawText) {
      answers['dischargeDate'] = dodParsed.rawText           // raw text preserved
    } else if (dodParsed.date) {
      answers['dischargeDate'] = dodParsed.date.toISOString().slice(0, 10)
    }

    // Store deceased flag when either date field contained "(died)"
    if (dopParsed.isDeceased || dodParsed.isDeceased) {
      answers['patientDeceased'] = true
    }

    // ── Resolve procedure date ───────────────────────────────────────────────
    let procedureDate: Date
    if (dopParsed.date) {
      procedureDate = dopParsed.date
    } else {
      // Last-resort: use today — flag it so the user can review
      procedureDate = new Date()
      const note = `${mrn} (${patientName}) — procedure date could not be parsed: "${row[6]}"`
      flagged.push(note)
      console.warn(`  [WARN] ${note}`)
    }

    // ── Flag deceased patients ────────────────────────────────────────────────
    if (dopParsed.isDeceased || dodParsed.isDeceased) {
      const rawDop = dopParsed.rawText || String(row[6])
      const rawDod = dodParsed.rawText || String(row[7])
      const note   = `${mrn} (${patientName}) — deceased; dop="${rawDop}" dod="${rawDod}"`
      flagged.push(note)
      console.warn(`  [FLAG] ${note}`)
    }

    // ── Deduplication: mrnNo + same calendar day for dateOfProcedure ─────────
    const dayStart = new Date(procedureDate.toISOString().slice(0, 10) + 'T00:00:00.000Z')
    const dayEnd   = new Date(procedureDate.toISOString().slice(0, 10) + 'T23:59:59.999Z')

    const existing = await prisma.surveyResponse.findFirst({
      where: {
        mrnNo: mrn,
        dateOfProcedure: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true },
    })

    if (existing) {
      console.log(`  [SKIP] MRN ${mrn} (${patientName}) — already exists (id: ${existing.id})`)
      skipped++
      continue
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    await prisma.surveyResponse.create({
      data: {
        patientName,
        fatherName,
        mrnNo: mrn,
        dateOfProcedure: procedureDate,
        contactNumber,
        language: 'en',
        staffAssisted: false,
        answers,
        // Use procedure date as submittedAt so history sorts correctly
        submittedAt: procedureDate,
      },
    })
    console.log(`  [OK]   MRN ${mrn} — ${patientName}`)
    imported++
  }

  await prisma.$disconnect()

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(64))
  console.log('Import summary')
  console.log(`  Imported : ${imported}`)
  console.log(`  Skipped  : ${skipped}  (already in database)`)
  console.log(`  Flagged  : ${flagged.length}`)
  if (flagged.length > 0) {
    console.log('\nFlagged rows — review these manually:')
    flagged.forEach(f => console.log('  •', f))
  }
  console.log('='.repeat(64))
}

main().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
