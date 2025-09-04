import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const response = await client.responses.create({
    model: "gpt-5",
    input: "Write a one-sentence bedtime story about a unicorn."
  });
  console.log(response.output_text);
}

main().catch(err => {
  console.error("OpenAI API error:", err);
});
