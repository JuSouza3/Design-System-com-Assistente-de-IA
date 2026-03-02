import "dotenv/config";
import fetch from "node-fetch";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type LLMResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

export async function callLLM(prompt: string): Promise<string> {
  const provider = OPENROUTER_API_KEY ? "openrouter" : OPENAI_API_KEY ? "openai" : null;

  if (!provider) {
    throw new Error(
      "Defina OPENROUTER_API_KEY ou OPENAI_API_KEY no arquivo .env."
    );
  }

  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider === "openrouter" ? OPENROUTER_API_KEY : OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "http://localhost";
    headers["X-Title"] = "Design System IA - PDI";
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider === "openrouter" ? OPENROUTER_MODEL : OPENAI_MODEL,
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
  return data.choices?.[0]?.message?.content ?? "";
}
