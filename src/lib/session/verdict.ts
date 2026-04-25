export interface VerdictView {
  outcome: string | null
  summary: string | null
  reasoning: string | null
  playerStrengths: string[]
  playerGaps: string[]
  opponentAdvantages: string[]
}

function readSection(text: string, label: string): string | null {
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`)
  const match = text.match(pattern)
  if (!match) {
    return null
  }

  const value = match[1]?.trim() ?? ''
  return value.length > 0 ? value : null
}

function splitBulletLikeText(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/\n+/)
    .map((entry) => entry.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

export function parseVerdictContent(content: string): VerdictView {
  return {
    outcome: readSection(content, 'OUTCOME'),
    summary: readSection(content, 'SUMMARY'),
    reasoning: readSection(content, 'REASONING'),
    playerStrengths: splitBulletLikeText(readSection(content, 'PLAYER_STRENGTHS')),
    playerGaps: splitBulletLikeText(readSection(content, 'PLAYER_GAPS')),
    opponentAdvantages: splitBulletLikeText(readSection(content, 'OPPONENT_ADVANTAGES')),
  }
}
