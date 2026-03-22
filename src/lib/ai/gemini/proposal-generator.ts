import "server-only"
import { GoogleGenAI } from "@google/genai"
import type { ProposalOutput } from "@/lib/ai/gemini/types"

const apiKey = process.env.GEMINI_API_KEY

function extractJson(text: string): string {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.")
  }
  return text.slice(start, end + 1)
}

export async function generateProposalFromMeeting(params: {
  meetingMemo: string
  jobTitle: string
  model?: string
}): Promise<ProposalOutput> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.")
  }

  const ai = new GoogleGenAI({ apiKey })
  const model = params.model ?? "gemini-2.5-flash"

  const prompt = [
    "You are helping update an existing hiring post from a client meeting memo.",
    "Return JSON only. No markdown. No prose outside JSON.",
    "Use this exact schema:",
    JSON.stringify(
      {
        summary: "string",
        proposedFields: {
          headline: "string",
          jobDescription: "string",
          requirements: "string",
          benefits: "string",
          workingHours: "string",
          salary: "string"
        },
        diff: [
          {
            field: "string",
            before: "string",
            after: "string",
            reason: "string"
          }
        ],
        riskFlags: ["string"]
      },
      null,
      2
    ),
    "",
    `Job title: ${params.jobTitle}`,
    `Meeting memo: ${params.meetingMemo}`,
    "",
    "Requirements:",
    "- Write in Japanese.",
    "- Be practical and business-appropriate.",
    "- Reflect the meeting memo faithfully.",
    "- If something is unclear, mention it in riskFlags.",
    "- Keep before as empty string when current value is unavailable."
  ].join("\n")

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  })

  const text = response.text ?? ""
  const jsonText = extractJson(text)
  return JSON.parse(jsonText) as ProposalOutput
}