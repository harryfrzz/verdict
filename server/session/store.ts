import type { SessionState, SessionStore } from '../../src/lib/agents/types.js'

class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionState>()

  get(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId)
  }

  set(session: SessionState): void {
    this.sessions.set(session.sessionId, session)
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
}

export const sessionStore = new InMemorySessionStore()
