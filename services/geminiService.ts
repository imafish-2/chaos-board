import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

// Safe access to process.env
const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

// Initialize strictly with process.env.API_KEY
if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

export const generateChaosEvent = async (currentRound: number): Promise<{ title: string; description: string; effectType: string }> => {
  if (!aiClient) {
    return {
      title: "Connection Lost",
      description: "The AI is sleeping. Default chaos ensues: Everyone loses 3 coins!",
      effectType: "LOSE_COINS"
    };
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a wacky, chaotic, Mario-Party style "Chaos Event" for a board game. 
      It is round ${currentRound}. 
      Return ONLY a JSON object with this schema:
      {
        "title": "Short catchy name (e.g. Gravity Flip)",
        "description": "Short explanation of what happens (e.g. Everyone swaps coin counts!)",
        "effectType": "one of: [SWAP_COINS, LOSE_COINS, GAIN_COINS, REVERSE_TURN, NOTHING]"
      }
      Make it funny and slightly unfair.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Gemini Chaos Error:", error);
    return {
      title: "Static Noise",
      description: "A mysterious interference disrupts the board. Nothing happens.",
      effectType: "NOTHING"
    };
  }
};

export const generateAnnouncerCommentary = async (playerName: string, event: string): Promise<string> => {
  if (!aiClient) return `${playerName} did ${event}!`;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Write a very short, high-energy esports announcer sentence about ${playerName} who just ${event}. Max 15 words.`
    });
    return response.text || "What a move!";
  } catch (e) {
    return "Unbelievable!";
  }
};