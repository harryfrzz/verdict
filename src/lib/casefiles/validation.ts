import { getLevelConfig } from '../../../config/levels.js'
import type {
  CaseFile,
  CasePreview,
  DifficultyTier,
  EvidenceItem,
  PriorRuling,
  WitnessRecord,
} from '../agents/types.js'

type RawCaseFile = Omit<CaseFile, 'difficulty'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStringField(record: Record<string, unknown>, field: string): string {
  const value = record[field]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Case file field "${field}" must be a non-empty string.`)
  }

  return value.trim()
}

function readStringArrayField(record: Record<string, unknown>, field: string): string[] {
  const value = record[field]
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error(`Case file field "${field}" must be a non-empty array of strings.`)
  }

  return value.map((item) => item.trim())
}

function validatePreview(value: unknown): CasePreview {
  if (!isRecord(value)) {
    throw new Error('Case file field "preview" must be an object.')
  }

  return {
    summary: readStringField(value, 'summary'),
    charge: readStringField(value, 'charge'),
    evidence: readStringField(value, 'evidence'),
    complication: readStringField(value, 'complication'),
  }
}

function readLevel(value: unknown): DifficultyTier {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value
  }

  throw new Error('Case file field "level" must be an integer from 1 to 5.')
}

function validateWitnesses(value: unknown): WitnessRecord[] {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error('Case file field "witnesses" must contain at least two witness records.')
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Witness at index ${index} must be an object.`)
    }

    const witness: WitnessRecord = {
      id: readStringField(entry, 'id'),
      name: readStringField(entry, 'name'),
      relationToCase: readStringField(entry, 'relationToCase'),
      statement: readStringField(entry, 'statement'),
    }

    const reliabilityNotes = entry.reliabilityNotes
    if (reliabilityNotes !== undefined) {
      if (typeof reliabilityNotes !== 'string' || reliabilityNotes.trim().length === 0) {
        throw new Error(`Witness "${witness.id}" has invalid reliabilityNotes.`)
      }

      witness.reliabilityNotes = reliabilityNotes.trim()
    }

    return witness
  })
}

function validateEvidence(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Case file field "evidence" must contain at least one evidence item.')
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Evidence at index ${index} must be an object.`)
    }

    return {
      id: readStringField(entry, 'id'),
      item: readStringField(entry, 'item'),
      description: readStringField(entry, 'description'),
      whereFound: readStringField(entry, 'whereFound'),
      relevance: readStringField(entry, 'relevance'),
    }
  })
}

function validatePriorRulings(value: unknown): PriorRuling[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error('Case file field "priorRulings" must be an array when provided.')
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Prior ruling at index ${index} must be an object.`)
    }

    const ruling: PriorRuling = {
      title: readStringField(entry, 'title'),
      relevance: readStringField(entry, 'relevance'),
    }

    const citation = entry.citation
    if (citation !== undefined) {
      if (typeof citation !== 'string' || citation.trim().length === 0) {
        throw new Error(`Prior ruling "${ruling.title}" has invalid citation.`)
      }

      ruling.citation = citation.trim()
    }

    return ruling
  })
}

export function validateRawCaseFile(input: unknown): RawCaseFile {
  if (!isRecord(input)) {
    throw new Error('Case file must be an object.')
  }

  return {
    id: readStringField(input, 'id'),
    title: readStringField(input, 'title'),
    level: readLevel(input.level),
    category: readStringField(input, 'category'),
    summary: readStringField(input, 'summary'),
    preview: validatePreview(input.preview),
    date: readStringField(input, 'date'),
    location: readStringField(input, 'location'),
    charges: readStringArrayField(input, 'charges'),
    policeReport: readStringField(input, 'policeReport'),
    witnesses: validateWitnesses(input.witnesses),
    evidence: validateEvidence(input.evidence),
    prosecutionObjective: readStringField(input, 'prosecutionObjective'),
    defenseObjective: readStringField(input, 'defenseObjective'),
    priorRulings: validatePriorRulings(input.priorRulings),
  }
}

export function hydrateCaseFile(input: unknown): CaseFile {
  const rawCaseFile = validateRawCaseFile(input)

  return {
    ...rawCaseFile,
    difficulty: getLevelConfig(rawCaseFile.level),
  }
}
