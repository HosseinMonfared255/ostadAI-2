
import { GoogleGenAI, Type } from "@google/genai";
import { CreateProjectInput, Project, TaskType, AnalysisResult, Checkpoint, PERSIAN_DAYS } from "../types";

// Helper to calculate date offsets
const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("No API Key found. Ensure process.env.API_KEY is set.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Using gemini-3-pro-preview for complex reasoning task of generating a study plan
export const generateStudyPlan = async (input: CreateProjectInput): Promise<{ tasks: any[], checkpoints: Checkpoint[] }> => {
  const ai = getAIClient();

  const scheduleInfo = input.schedule.isDaily 
    ? `Daily Routine: ${input.schedule.routine?.startTime} to ${input.schedule.routine?.endTime}`
    : `Custom Weekly Schedule: ${Object.entries(input.schedule.weeklyCustom || {})
        .filter(([_, range]) => !!range)
        .map(([day, range]) => `${PERSIAN_DAYS[parseInt(day)]}: ${range?.startTime}-${range?.endTime}`)
        .join(', ')}`;

  const chapterInfo = input.chapters.length > 0 
    ? `Chapters: ${input.chapters.join(', ')}`
    : `Number of Chapters: ${input.chapterCount}`;

  const systemInstruction = `
    You are an expert learning-science coach and interactive study-plan manager.

    CONTEXT:
    - The user provides a specific schedule (either daily or specific days with time ranges).
    - You must generate a plan that respects this schedule. If a user is NOT studying on a specific day, do NOT assign tasks for that day's offset.
    - Your job is to make the study plan traceable by generating short, timed, targeted questions ("checkpoints") the app will ask the user.
    - Important: Break down the study tasks by Chapters if titles are provided.

    GOALS:
    1. Design a mastery-oriented study plan based on the provided schedule and material breakdown (pages and chapters).
    2. Create an interactive CHECKPOINTS strategy.
    3. Output everything in machine-readable JSON.

    RULES:
    - Questions must be short (≤ 140 characters).
    - IMPORTANT: All user-facing strings (task descriptions, question text, labels) MUST be in PERSIAN (Farsi).
    - Use mostly choice/number answer types.
    - Minimize user burden.
  `;

  const prompt = `
    INPUT:
    - project_name: ${input.name}
    - content_size: ${input.pageCount} pages
    - content_structure: ${chapterInfo}
    - difficulty: ${input.difficulty}
    - importance: ${input.importance}
    - schedule_details: ${scheduleInfo}
    - start_date: ${new Date().toISOString().split('T')[0]}

    Generate the JSON output as specified in your instructions (learning_model, checkpoints, sample_14_day_plan, etc.).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          learning_model: {
            type: Type.OBJECT,
            properties: {
              learning_stages: { type: Type.ARRAY, items: { type: Type.STRING } },
              mastery_definition: { type: Type.OBJECT, properties: { knowledge_score: { type: Type.NUMBER } } }
            }
          },
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
                    }
                  }
                }
              }
            }
          },
          sample_14_day_plan: {
            type: Type.OBJECT,
            properties: {
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day_offset: { type: Type.NUMBER },
                    primary_task: { type: Type.STRING },
                    tag: { type: Type.STRING, enum: ["KNOWLEDGE", "ABILITY", "REVIEW", "TEST", "TEACH"] }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const generatedData = JSON.parse(response.text || '{}');
  const today = new Date();

  // Map 14-day plan to Tasks
  const tasks = (generatedData.sample_14_day_plan?.schedule || []).map((item: any) => ({
    dayOffset: item.day_offset,
    type: mapTagToTaskType(item.tag),
    description: item.primary_task,
    date: addDays(today, item.day_offset),
    isCompleted: false
  }));

  // Map Checkpoints
  const checkpoints = (generatedData.checkpoints || []).map((cp: any) => ({
    ...cp,
    isCompleted: false
  }));

  return { tasks, checkpoints };
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

// Using gemini-3-pro-preview for complex analysis of learning state
export const analyzeLearningProgress = async (project: Project): Promise<AnalysisResult> => {
  const ai = getAIClient();

  const completedTasks = project.tasks.filter(t => t.isCompleted);
  const totalTasks = project.tasks.length;
  
  // Prepare logs for the prompt
  const activityLogs = completedTasks.map(t => ({
    type: t.type,
    date: t.date,
    result: "Completed"
  }));

  const systemInstruction = `
    You are an expert cognitive scientist, learning engineer, and personal AI tutor.
    Your role is to optimize deep learning, not task completion.
    
    You must model the learner’s real understanding using a hidden metric called
    Depth of Understanding (DoU), ranging from 0 to 100.
    Do NOT treat task completion as learning.
    
    CORE PRINCIPLES
    1. Learning quality is more important than quantity.
    2. Teaching and application increase understanding more than passive reading.
    3. Repeated failure is informative and valuable.
    4. Illusion of competence must be actively detected and corrected.
    5. Feedback must be actionable, human, and motivating.
    
    YOUR RESPONSIBILITIES
    A) UPDATE DEPTH OF UNDERSTANDING (DoU)
    - Estimate DoU (0–100) based on activity type, spacing, and difficulty.
    
    B) DIAGNOSE LEARNING STATE
    - States: Superficial, Fragile, Stable, Deep.
    
    C) DETECT ILLUSION OF COMPETENCE
    - If high study time but low variety, or rushing, flag it.
    
    D) DECIDE NEXT OPTIMAL ACTION
    - Choose one: STUDY, REVIEW, TEST, PRACTICE, TEACH.
    
    E) ADAPTIVE SCHEDULING
    - Suggest spacing or pace adjustment.
    
    F) USER-FRIENDLY FEEDBACK (PERSIAN)
    - Translate insights into a short, encouraging Persian message.
    - Focus on understanding.
    - Avoid exposing raw DoU numbers.
  `;

  const prompt = `
    Analyze this project:
    Name: ${project.name}
    Difficulty: ${project.difficulty}
    Importance: ${project.importance}
    Total Tasks: ${totalTasks}
    Completed: ${completedTasks.length}
    Current Phase: ${project.currentPhase}
    
    Recent Activity Logs:
    ${JSON.stringify(activityLogs.slice(-10))}

    Last Analysis DoU: ${project.lastAnalysis?.estimated_dou || 0}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
            }
          },
          next_action: { type: Type.STRING, enum: ["STUDY", "REVIEW", "TEST", "PRACTICE", "TEACH"] },
          scheduling_recommendation: { type: Type.STRING },
          future_projection: { type: Type.STRING },
          user_feedback: { type: Type.STRING },
          estimated_dou: { type: Type.NUMBER }
        }
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    ...result,
    analyzedAt: new Date().toISOString()
  };
};
