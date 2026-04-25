import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import agentRouter from './routes/agent.js'
import sessionRouter from './routes/session.js'

const app = express()
const PORT = process.env.PORT ?? 8787

app.use(cors({
  origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
}))
app.use(express.json({ limit: '2mb' }))

app.use('/api/agent',   agentRouter)
app.use('/api/session', sessionRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(Number(PORT), () => {
  console.log(`Verdict API running on http://localhost:${PORT}`)
})
