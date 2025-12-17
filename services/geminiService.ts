import { GoogleGenAI, Type } from "@google/genai";
import { CreateProjectInput, TaskType } from "../types";

// Helper to calculate date offsets
const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

export const generateStudyPlan = async (input: CreateProjectInput): Promise<{ tasks: any[] }> => {
  // Simulate API call if no key provided (fallback for demo purposes or safety)
  if (!process.env.API_KEY) {
    console.error("No API Key found. Ensure process.env.API_KEY is set.");
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert learning coach specializing in Deep Learning and Spaced Repetition (Forgetting Curve).
    Create a study schedule for a project with the following details:
    - Name: ${input.name}
    - Pages: ${input.pageCount}
    - Difficulty: ${input.difficulty}
    - Importance: ${input.importance}

    The plan must cover 4 phases: Education, Practice, Consolidation, Mastery.
    It should generate a list of tasks. Each task has a relative day offset (0 = today, 1 = tomorrow, etc.).
    
    Task Types allowed: STUDY, REVIEW, TEST, PRACTICE, TEACH.
    
    Logic:
    1. Early days: Focus on STUDY and PRACTICE.
    2. Middle days: Focus on REVIEW and TEST (spaced repetition: e.g., day 1, 3, 7, 14, 30).
    3. Late days: Focus on TEACH and deep PRACTICE for mastery.
    
    Scale the duration based on page count and difficulty (more pages/harder = longer schedule).
    Return JSON only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayOffset: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ["STUDY", "REVIEW", "TEST", "PRACTICE", "TEACH"] },
                description: { type: Type.STRING, description: "Short Persian description of the task" }
              }
            }
          }
        }
      }
    }
  });

  const generatedData = JSON.parse(response.text || '{"tasks": []}');
  
  // Transform relative days to real dates
  const today = new Date();
  const finalTasks = generatedData.tasks.map((t: any) => ({
    ...t,
    date: addDays(today, t.dayOffset),
    isCompleted: false
  }));

  return { tasks: finalTasks };
};