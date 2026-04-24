const Groq = require("groq-sdk");
require('dotenv').config();

let groq = null;

async function rephraseAnswer(chunks, question) {
  if (chunks.length === 0) {
    return {
      answer: "I could not find this information in the provided documentation.",
      sources: []
    };
  }

  const context = chunks.join("\n\n---\n\n");

  const prompt = `You are a helpful AI assistant. Answer the user's question based strictly on the provided context below.

Return your response in pure JSON format with the following structure:
{
  "answer": "Your natural language answer here",
  "quotes": ["Exact sentence or paragraph from context used to derive the answer", "Another exact quote..."]
}

Rules:
1. If the context contains the answer, provide it clearly in the "answer" field.
2. support your answer by extracting *verbatim* quotes from the context into the "quotes" array.
3. If the context contains related information that might help answer (even if partial), use it.
4. If the context is completely irrelevant, set "answer" to "I don't know based on this context" and "quotes" to empty array [].
5. Do NOT use markdown code blocks for the JSON. Just return the raw JSON string.

Context:
${context}

Question:
${question}`;

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY environment variable");
    }

    if (!groq) {
      groq = new Groq({ apiKey });
    }

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1, // Lower temperature for more consistent JSON
        response_format: { type: "json_object" } // Enforce JSON mode if supported, otherwise prompt does it
    });

    const content = completion.choices[0]?.message?.content || "{}";
    
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        console.error("Failed to parse LLM JSON:", content);
        // Fallback if JSON parsing fails
        return {
            answer: content,
            sources: chunks
        };
    }

    return {
      answer: parsed.answer || "No answer generated.",
      sources: parsed.quotes && parsed.quotes.length > 0 ? parsed.quotes : chunks // Fallback to chunks if no quotes
    };

  } catch (error) {
    console.log("LLM Generation Failed:", error.message);
    
    let userMessage = "LLM Unavailable";
    if (error.message.includes("429")) {
      userMessage = "Rate limit exceeded (Too Many Requests)";
    } else if (error.message.includes("404")) {
      userMessage = "Model not found";
    } else if (error.message.includes("Missing GROQ_API_KEY")) {
      userMessage = "Configuration Error: Missing API Key";
    }

    const mainChunk = chunks[0];
    return {
      answer: `⚠️ *${userMessage}* - Showing raw documentation search result:\n\n${mainChunk}...`,
      sources: chunks
    };
  }
}

module.exports = { rephraseAnswer };
