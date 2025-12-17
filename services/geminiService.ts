
import { GoogleGenAI, Type } from "@google/genai";
import { CreateProjectInput, Project, TaskType, AnalysisResult, Checkpoint, PERSIAN_DAYS } from "../types";

// Helper to calculate date offsets
const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

/**
 * Generates a study plan using the Gemini API.
 */
export const generateStudyPlan = async (
  input: CreateProjectInput, 
  modelName: string = 'gemini-3-flash-preview',
  apiKey?: string
): Promise<{ tasks: any[], checkpoints: Checkpoint[] }> => {
  const effectiveApiKey = apiKey || process.env.API_KEY;
  
  if (!effectiveApiKey) {
    throw new Error("API Key تنظیم نشده است. لطفاً در بخش تنظیمات، کلید API خود را وارد کنید.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const scheduleInfo = input.schedule.isDaily 
    ? `Daily Routine: ${input.schedule.routine?.startTime} to ${input.schedule.routine?.endTime}`
    : `Custom Weekly Schedule: ${Object.entries(input.schedule.weeklyCustom || {})
        .filter(([_, range]) => !!range)
        .map(([day, range]) => `${PERSIAN_DAYS[parseInt(day)]}: ${range?.startTime}-${range?.endTime}`)
        .join(', ')}`;

  const chapterList = input.chapters.filter(c => c.trim() !== '');
  const chapterInfo = chapterList.length > 0 
    ? `Chapters with titles: ${chapterList.map((t, i) => `${i+1}. ${t}`).join(', ')}`
    : `Number of Chapters: ${input.chapterCount}`;

  const systemInstruction = `
    You are an expert learning-science coach and study-plan architect.
    
    GOAL:
    Create a highly detailed, mastery-oriented study plan in Persian (Farsi).
    
    PLANNING RULES:
    1. Organize tasks logically based on the CHAPTER TITLES provided.
    2. Respect the user's schedule. Do not assign tasks on empty days.
    3. Include diagnostic "Checkpoints" (short questions) to track depth of understanding.
    4. Task descriptions must be actionable and specific to the chapter name.
    
    OUTPUT:
    Return valid JSON matching the provided schema.
  `;

  const prompt = `
    PROJECT DETAILS:
    - Name: ${input.name}
    - Total Pages: ${input.pageCount}
    - Structure: ${chapterInfo}
    - Difficulty: ${input.difficulty}
    - Importance: ${input.importance}
    - Schedule: ${scheduleInfo}
    - Start Date: ${new Date().toISOString().split('T')[0]}

    Generate a 14-day sample task schedule and a set of diagnostic checkpoints.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            checkpoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  day_offset: { type: Type.NUMBER },
                  when_time: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        qid: { type: Type.STRING },
                        text: { type: Type.STRING },
                        answer_type: { type: Type.STRING, enum: ["choice", "number", "text"] },
                        choices: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: { key: { type: Type.STRING }, label: { type: Type.STRING } }
                          }
                        }
                      },
                      required: ["qid", "text", "answer_type"]
                    }
                  }
                },
                required: ["id", "day_offset", "purpose", "questions"]
              }
            },
            plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day_offset: { type: Type.NUMBER },
                  task_desc: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ["KNOWLEDGE", "ABILITY", "REVIEW", "TEST", "TEACH"] }
                },
                required: ["day_offset", "task_desc", "category"]
              }
            }
          },
          required: ["checkpoints", "plan"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const today = new Date();

    const tasks = (data.plan || []).map((item: any) => ({
      dayOffset: item.day_offset,
      type: mapTagToTaskType(item.category),
      description: item.task_desc,
      date: addDays(today, item.day_offset),
      isCompleted: false
    }));

    const checkpoints = (data.checkpoints || []).map((cp: any) => ({
      ...cp,
      isCompleted: false
    }));

    return { tasks, checkpoints };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Analyzes progress using the Gemini API.
 */
export const analyzeLearningProgress = async (
  project: Project, 
  modelName: string = 'gemini-3-flash-preview',
  apiKey?: string
): Promise<AnalysisResult> => {
  const effectiveApiKey = apiKey || process.env.API_KEY;

  if (!effectiveApiKey) {
    throw new Error("API Key تنظیم نشده است. لطفاً در بخش تنظیمات، کلید API خود را وارد کنید.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const completedTasks = project.tasks.filter(t => t.isCompleted);
  const activityLogs = completedTasks.map(t => ({ type: t.type, date: t.date, desc: t.description }));

  const systemInstruction = `
    You are a cognitive science expert. Analyze the learning journey based on activity logs.
    Focus on detecting 'Illusion of Competence'. Provide actionable feedback in PERSIAN.
  `;

  const prompt = `
    Project: ${project.name}
    Chapters: ${project.chapters.join(', ')}
    Progress: ${project.progress}%
    Logs: ${JSON.stringify(activityLogs.slice(-10))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            learning_state: { type: Type.STRING, enum: ['Superficial', 'Fragile', 'Stable', 'Deep'] },
            diagnosis: { type: Type.STRING },
            illusion_of_competence: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
                corrective_action: { type: Type.STRING }
              },
              required: ["detected"]
            },
            next_action: { type: Type.STRING, enum: ["STUDY", "REVIEW", "TEST", "PRACTICE", "TEACH"] },
            scheduling_recommendation: { type: Type.STRING },
            future_projection: { type: Type.STRING },
            user_feedback: { type: Type.STRING },
            estimated_dou: { type: Type.NUMBER }
          },
          required: ["learning_state", "user_feedback", "estimated_dou", "next_action"]
        }
      }
    });

    return {
      ...JSON.parse(response.text || '{}'),
      analyzedAt: new Date().toISOString()
    };
  } catch (error: any) {
    throw error;
  }
};

const mapTagToTaskType = (tag: string): TaskType => {
  switch (tag?.toUpperCase()) {
    case 'KNOWLEDGE': return TaskType.STUDY;
    case 'ABILITY': return TaskType.PRACTICE;
    case 'REVIEW': return TaskType.REVIEW;
    case 'TEST': return TaskType.TEST;
    case 'TEACH': return TaskType.TEACH;
    default: return TaskType.STUDY;
  }
};
