import 'dotenv/config'
import { createApp } from './app.js'
const PORT = process.env.PORT ?? 8787

const app = createApp()

app.listen(Number(PORT), () => {
  console.log(`Verdict API running on http://localhost:${PORT}`)
})
