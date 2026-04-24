const Groq = require("groq-sdk");
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function main() {
    try {
        console.log("Testing Groq API connection...");
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: "Hello! confirm you are working."
                }
            ],
            model: "llama-3.3-70b-versatile",
        });

        console.log("Success! Response from Groq:");
        console.log(completion.choices[0]?.message?.content);
    } catch (error) {
        console.error("Error connecting to Groq:", error);
    }
}

main();
