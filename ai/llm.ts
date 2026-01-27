import "dotenv/config";
import fetch from "node-fetch";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY não definida no .env");
}

type LLMResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

export async function callLLM(prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost",
      "X-Title": "Design System IA - PDI",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente técnico especialista em Design Systems e Frontend.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro no LLM: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as LLMResponse;

  return data.choices[0].message.content;
}
