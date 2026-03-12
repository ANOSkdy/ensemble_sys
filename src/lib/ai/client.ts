import "server-only"
import { GoogleGenAI } from "@google/genai"

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set.")
}

export const genai = new GoogleGenAI({ apiKey })
