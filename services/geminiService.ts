
import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent } from "../types";

// Always initialize with named parameter and direct process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseEventFromText = async (
    text: string, 
    currentDateISO: string, 
    existingEvents: CalendarEvent[] = [],
    chatHistory: {role: string, text: string}[] = []
) => {
  // OPTIMIZATION: Only send upcoming events (next 30 days) to save tokens
  const now = new Date();
  const futureLimit = new Date();
  futureLimit.setDate(now.getDate() + 30);

  const relevantEvents = existingEvents.filter(e => {
      const eStart = new Date(e.start);
      return eStart >= now && eStart <= futureLimit;
  });

  const simpleEvents = relevantEvents.map(e => ({
    title: e.title,
    start: e.start,
    end: e.end
  }));

  // Format history for the prompt
  const historyContext = chatHistory.length > 0 
    ? `PREVIOUS CONVERSATION:\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}\n`
    : '';

  try {
    // Correctly using gemini-3-flash-preview for extraction as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current Date: ${currentDateISO}. 
                 Existing Events (next 30 days): ${JSON.stringify(simpleEvents)}. 
                 ${historyContext}
                 CURRENT USER INPUT: "${text}"`,
      config: {
        systemInstruction: `
          You are a smart calendar assistant. 
          1. Extract event details from the User Input (Portuguese).
          2. USE CONTEXT: If the input refers to previous messages (e.g., "change IT to 2pm", "make THAT tomorrow"), use the "PREVIOUS CONVERSATION" to understand what "it" or "that" refers to.
          3. Check for conflicts with "Existing Events".
          4. Detect recurrence intent.
          
          Return a JSON object.
          - 'start' and 'end': ISO 8601 strings.
          - 'recurrence': 'none', 'daily', 'weekly', 'monthly'.
          - 'conflict': boolean.
          - 'conflictMessage': string (optional).
          - 'color': assign based on context.
          - 'title': inferred title.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            start: { type: Type.STRING },
            end: { type: Type.STRING },
            description: { type: Type.STRING },
            location: { type: Type.STRING },
            recurrence: { type: Type.STRING, enum: ['none', 'daily', 'weekly', 'monthly'] },
            color: { type: Type.STRING, enum: ['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'pink', 'indigo', 'cyan', 'orange', 'teal', 'lime'] },
            conflict: { type: Type.BOOLEAN },
            conflictMessage: { type: Type.STRING }
          },
          required: ['title', 'start', 'end', 'color']
        }
      }
    });

    // Access .text property directly as per guidelines (not .text()).
    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};

export const generateDailyBriefing = async (events: any[], currentDate: string) => {
   try {
    const eventsList = events.map(e => `${e.title} às ${e.start}`).join(', ');
    // Correctly using gemini-3-flash-preview for summarization as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Date: ${currentDate}. Events: ${eventsList || "Nenhum evento agendado."}`,
      config: {
        systemInstruction: "You are a helpful personal assistant. Write a very brief (max 2 sentences), warm, and motivating daily summary in Portuguese based on the user's schedule. If empty, suggest taking time for themselves.",
      }
    });
    return response.text;
   } catch (error) {
     console.error("Briefing Error:", error);
     return "Não foi possível carregar o resumo.";
   }
}

export const improveSessionNote = async (text: string) => {
  try {
    // Correctly using gemini-3-flash-preview for text improvement as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: `
          Você é um assistente especialista em psicologia clínica.
          Sua tarefa é reescrever o texto fornecido pelo psicólogo para o formato de um Prontuário Clínico (Evolução).
          
          Diretrizes:
          1. Mantenha a objetividade técnica e a ética profissional.
          2. Organize o texto se possível (Queixa, Intervenção, Observação), mas mantenha como um parágrafo fluido ou tópicos claros se o original for muito curto.
          3. Corrija erros gramaticais e de digitação.
          4. NÃO invente informações. Apenas melhore a redação do que foi fornecido.
          5. Mantenha o idioma em Português do Brasil formal.
        `
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error improving note:", error);
    return text;
  }
};
