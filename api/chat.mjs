// Vercel serverless function: the same chat handler the dev and production servers use.
// Set ANTHROPIC_API_KEY in the Vercel project's Environment Variables.
import { handleChat } from '../server/chat.mjs'

export const config = { maxDuration: 60 }

export default handleChat
