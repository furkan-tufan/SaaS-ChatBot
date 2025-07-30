import * as z from 'zod';
import { HttpError } from 'wasp/server';
import OpenAI from 'openai'; // ✅ eklendi
/* ---------- OpenAI Kurulumu ---------- */
const openAi = setUpOpenAi();
function setUpOpenAi() {
    if (process.env.OPENAI_API_KEY) {
        return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    else {
        throw new Error('OpenAI API key is not set');
    }
}
/* ---------- Chatbot Action ---------- */
const generateChatbotResponseInputSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
    })),
});
export const generateChatbotResponse = async (rawArgs, context) => {
    if (!context.user)
        throw new HttpError(401, 'Giriş yapmalısınız.');
    const { messages } = generateChatbotResponseInputSchema.parse(rawArgs);
    const completion = await openAi.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.8,
    });
    return completion.choices[0].message?.content ?? '';
};
/* ---------- /Chatbot Action ---------- */ 
//# sourceMappingURL=operations.js.map