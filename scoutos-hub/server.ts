import { Hono } from 'hono'
import { logger } from 'hono/logger'

type Variables = {
  scrubbedBody: any
}

const app = new Hono<{ Variables: Variables }>()

app.use('*', logger())

// --- Armor Layer Middleware ---
// Scrubs PII, AWS Keys, GH Tokens
const ARMOR_REGEXES = [
  /akia[0-9a-z]{16}/ig, // AWS Access Key
  /gh[pousr]_[a-zA-Z0-9]{36}/ig, // GitHub Token
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
]

app.use('*', async (c, next) => {
  if (c.req.method === 'POST') {
      try {
          const bodyText = await c.req.text();
          if (bodyText) {
              let scrubbedText = bodyText;
              let redactedCount = 0;
              for (const regex of ARMOR_REGEXES) {
                  const matches = scrubbedText.match(regex);
                  if (matches) {
                      redactedCount += matches.length;
                      scrubbedText = scrubbedText.replace(regex, '[REDACTED_BY_ARMOR]');
                  }
              }
              if (redactedCount > 0) {
                 console.log(`[ARMOR_REDACTION] Scrubbed ${redactedCount} sensitive patterns from payload.`);
                 // Re-inject scrubbed body for next handlers.
                 // In Hono we can't easily mutate the req body stream, so we attach the scrubbed data to the context
                 c.set('scrubbedBody', JSON.parse(scrubbedText));
              } else {
                 c.set('scrubbedBody', JSON.parse(bodyText));
              }
          }
      } catch (e) {
          console.warn("Armor Layer: Failed to parse or scrub request body.", e)
      }
  }
  await next()
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', engine: 'ScoutOS Node' })
})

// Mocks for Skills
app.get('/api/skills/vanguard/stream', (c) => {
  // Mock Genesys signal
  return c.json([
      { id: '1', type: 'CHAT', priority: 'HIGH', message: 'Urgent SOC request regarding recent login spikes.' }
  ])
})

app.get('/api/skills/argus/decisions', (c) => {
  // Mock GRC Intel
  return c.json([
      { id: '1', title: 'Architecture Review - Dec 12', decision: 'Gate deployment on OPA agent logs.', impact: 'High' }
  ])
})

export default app
