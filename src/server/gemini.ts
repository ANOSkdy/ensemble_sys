import "server-only";

const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";

export type GeminiGenerateResult = {
  text: string;
  model: string;
};

export async function generateGeminiContent(
  prompt: string,
  options?: {
    model?: string;
    thinkingLevel?: string | null;
  }
): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = options?.model ?? "gemini-3-flash-preview";
  const endpoint = `${GEMINI_API_HOST}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, number | string> = {
    temperature: 0.4,
    topP: 0.9,
    topK: 40
  };
  if (options?.thinkingLevel) {
    generationConfig.thinkingLevel = options.thinkingLevel;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";

  return { text, model };
}
