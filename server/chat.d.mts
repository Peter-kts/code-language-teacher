// Types for chat.mjs, for the TypeScript tests that drive it.
import type { IncomingMessage, ServerResponse } from 'node:http'

export const EDIT_MARK: string
export function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void>
