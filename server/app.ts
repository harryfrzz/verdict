import express from 'express'
import cors from 'cors'
import agentRouter from './routes/agent.js'
import sessionRouter from './routes/session.js'

export function createApp() {
  const app = express()

  app.use(cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
  }))
  app.use(express.json({ limit: '2mb' }))

  app.use('/api/agent', agentRouter)
  app.use('/api/session', sessionRouter)

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  return app
}
