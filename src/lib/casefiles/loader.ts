import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { CaseFile, DifficultyTier } from '../agents/types.js'
import { hydrateCaseFile } from './validation.js'

export interface CaseFileSummary {
  id: string
  title: string
  level: DifficultyTier
  category: string
  summary: string
}

const CASEFILES_ROOT = path.resolve(process.cwd(), 'casefiles')

async function collectJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry: Dirent) => {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return collectJsonFiles(fullPath)
    }

    return entry.name.endsWith('.json') ? [fullPath] : []
  }))

  return nested.flat()
}

async function readCaseFile(filePath: string): Promise<CaseFile> {
  const rawContent = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(rawContent) as unknown
  const caseFile = hydrateCaseFile(parsed)

  if (!filePath.includes(`${path.sep}level-${caseFile.level}${path.sep}`)) {
    throw new Error(`Case file "${caseFile.id}" is stored in the wrong level directory.`)
  }

  return caseFile
}

export async function loadAllCaseFiles(): Promise<CaseFile[]> {
  const filePaths = await collectJsonFiles(CASEFILES_ROOT)
  const caseFiles = await Promise.all(filePaths.map(readCaseFile))

  return caseFiles.sort((left, right) => {
    if (left.level !== right.level) {
      return left.level - right.level
    }

    return left.title.localeCompare(right.title)
  })
}

export async function listCaseFileSummaries(): Promise<CaseFileSummary[]> {
  const caseFiles = await loadAllCaseFiles()

  return caseFiles.map(({ id, title, level, category, summary }) => ({
    id,
    title,
    level,
    category,
    summary,
  }))
}

export async function loadCaseFileById(caseId: string): Promise<CaseFile> {
  const caseFiles = await loadAllCaseFiles()
  const caseFile = caseFiles.find((entry) => entry.id === caseId)

  if (!caseFile) {
    throw new Error(`No case file found for caseId "${caseId}".`)
  }

  return caseFile
}
