
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  BrainCircuit, 
  LayoutDashboard,
  CalendarDays,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  Loader2,
  Settings,
  Moon,
  Sun,
  Palette,
  Sparkles,
  AlertTriangle,
  Zap,
  Microscope,
  HelpCircle,
  Clock,
  Calendar,
  ListOrdered,
  Key,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Lock,
  Check,
  Info
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Project, 
  Task, 
  Difficulty, 
  Importance, 
  CreateProjectInput, 
  TaskType, 
  Phase, 
  TASK_TYPE_LABELS,
  PHASE_LABELS,
  STATE_LABELS,
  PERSIAN_DAYS,
  TimeRange
} from './types';
import { generateStudyPlan, analyzeLearningProgress } from './services/geminiService';
import { formatPersianDate, isSameDay } from './utils/dateUtils';
import { PersianCalendar } from './components/PersianCalendar';

const loadProjects = (): Project[] => {
  const saved = localStorage.getItem('ostad_projects');
  return saved ? JSON.parse(saved) : [];
};

const THEME_COLORS = [
  { name: 'indigo', label: 'نیلی', class: 'bg-indigo-600' },
  { name: 'emerald', label: 'زمردی', class: 'bg-emerald-600' },
  { name: 'rose', label: 'رز', class: 'bg-rose-600' },
  { name: 'amber', label: 'کهربایی', class: 'bg-amber-600' },
  { name: 'sky', label: 'آسمانی', class: 'bg-sky-600' },
  { name: 'violet', label: 'بنفش', class: 'bg-violet-600' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'create' | string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('themeMode') === 'dark');
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('themeColor') || 'indigo');
  
  // Model State
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem('activeModel') || 'gemini-3-flash-preview');

  // API Key State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');

  // Create Project Form State
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    pageCount: 100,
    chapterCount: 5,
    chapters: Array(5).fill(''),
    difficulty: Difficulty.MEDIUM,
    importance: Importance.MEDIUM,
    schedule: {
      isDaily: true,
      routine: { startTime: '09:00', endTime: '10:00' },
      weeklyCustom: {}
    }
  });

  useEffect(() => {
    localStorage.setItem('ostad_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('activeModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('themeMode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('themeMode', 'light');
    }
  }, [darkMode]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const plan = await generateStudyPlan(newProject, selectedModel, apiKey);
      
      const newProj: Project = {
        id: uuidv4(),
        name: newProject.name,
        pageCount: newProject.pageCount,
        chapterCount: newProject.chapterCount,
        chapters: newProject.chapters.filter(c => c.trim() !== ''),
        difficulty: newProject.difficulty,
        importance: newProject.importance,
        schedule: newProject.schedule,
        color: themeColor,
        createdAt: new Date().toISOString(),
        currentPhase: Phase.EDUCATION,
        progress: 0,
        tasks: plan.tasks.map(t => ({ ...t, id: uuidv4(), projectId: '' })),
        checkpoints: plan.checkpoints || []
      };
      
      newProj.tasks = newProj.tasks.map(t => ({ ...t, projectId: newProj.id }));
      setProjects([...projects, newProj]);
      setActiveTab('dashboard');
      resetForm();
    } catch (error: any) {
      console.error("Create Project Error:", error);
      alert(`خطا در ایجاد برنامه:\n${error.message || JSON.stringify(error)}\n\nنکته: لطفاً مطمئن شوید API Key را در تنظیمات وارد کرده‌اید.`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewProject({ 
      name: '', 
      pageCount: 100,
      chapterCount: 5,
      chapters: Array(5).fill(''),
      difficulty: Difficulty.MEDIUM, 
      importance: Importance.MEDIUM, 
      schedule: { 
        isDaily: true, 
        routine: { startTime: '09:00', endTime: '10:00' },
        weeklyCustom: {}
      } 
    });
  };

  const handleChapterCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(count, 50));
    const newChapters = [...newProject.chapters];
    if (safeCount > newChapters.length) {
      for (let i = newChapters.length; i < safeCount; i++) newChapters.push('');
    } else {
      newChapters.splice(safeCount);
    }
    setNewProject({ ...newProject, chapterCount: safeCount, chapters: newChapters });
  };

  const handleChapterTitleChange = (idx: number, title: string) => {
    const newChapters = [...newProject.chapters];
    newChapters[idx] = title;
    setNewProject({ ...newProject, chapters: newChapters });
  };

  const handleUpdateProjectTasks = (projectId: string, updatedTasks: Task[]) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const completed = updatedTasks.filter(t => t.isCompleted).length;
      const progress = updatedTasks.length > 0 ? Math.round((completed / updatedTasks.length) * 100) : 0;
      let phase = Phase.EDUCATION;
      if (progress > 25) phase = Phase.PRACTICE;
      if (progress > 50) phase = Phase.CONSOLIDATION;
      if (progress > 80) phase = Phase.MASTERY;
      return { ...p, tasks: updatedTasks, progress, currentPhase: phase };
    }));
  };

  const toggleTask = (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
    handleUpdateProjectTasks(projectId, updatedTasks);
  };
  
  const handleAnalyzeProject = async (project: Project) => {
    setAnalyzing(true);
    try {
      const result = await analyzeLearningProgress(project, selectedModel, apiKey);
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, lastAnalysis: result } : p));
    } catch (error: any) {
      console.error("Analysis failed", error);
      alert(`خطا در تحلیل وضعیت: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">پروژه‌های مطالعاتی</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1">مدیریت هوشمند یادگیری با هوش‌مصنوعی</p>
        </div>
        <button onClick={() => setActiveTab('create')} className={`bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-${themeColor}-100 dark:shadow-none text-sm md:text-base`}>
          <Plus size={18} />
          <span className="hidden sm:inline">پروژه جدید</span>
          <span className="sm:hidden">جدید</span>
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <BrainCircuit className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
          <p className="text-gray-500">پروژه‌ای برای نمایش وجود ندارد.</p>
          <button onClick={() => setActiveTab('create')} className={`text-${themeColor}-600 font-bold mt-2 hover:underline`}>ایجاد اولین پروژه</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div key={p.id} onClick={() => setActiveTab(p.id)} className="group bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-1.5 h-full bg-${p.color}-500`} />
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-lg truncate max-w-[70%]">{p.name}</h3>
                <span className={`px-2 py-0.5 bg-${p.color}-50 dark:bg-${p.color}-900/30 text-${p.color}-600 text-[10px] rounded-lg font-bold whitespace-nowrap`}>{p.difficulty}</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>وضعیت یادگیری:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200">
                    {p.lastAnalysis ? STATE_LABELS[p.lastAnalysis.learning_state] : PHASE_LABELS[p.currentPhase]}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={`bg-${p.color}-500 h-2 rounded-full transition-all duration-700`} style={{ width: `${p.progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{p.chapterCount} فصل</span>
                  <span>{p.progress}% پیشرفت</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateProject = () => (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border p-6 md:p-8 animate-fade-in mb-24 md:mb-0">
      <div className="mb-10 text-center">
        <div className={`w-16 h-16 bg-${themeColor}-50 dark:bg-${themeColor}-900/30 text-${themeColor}-600 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <Sparkles size={32} />
        </div>
        <h2 className="text-xl md:text-2xl font-black dark:text-white">تعریف پروژه مطالعاتی جدید</h2>
        <p className="text-gray-500 text-xs md:text-sm mt-2">مدل‌های هوش مصنوعی بر اساس سرفصل‌های شما برنامه‌ریزی می‌کنند.</p>
      </div>

      <form onSubmit={handleCreateProject} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان کتاب یا دوره</label>
            <input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border focus:border-${themeColor}-500 outline-none transition-all dark:text-white`} placeholder="مثال: یادگیری React پیشرفته" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تعداد کل صفحات</label>
            <input required type="number" min="1" value={newProject.pageCount} onChange={e => setNewProject({...newProject, pageCount: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border outline-none transition-all dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">سطح دشواری</label>
            <select value={newProject.difficulty} onChange={e => setNewProject({...newProject, difficulty: e.target.value as Difficulty})} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border outline-none transition-all dark:text-white">
              {Object.values(Difficulty).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className={`bg-${themeColor}-50/50 dark:bg-${themeColor}-900/10 p-6 rounded-3xl border border-${themeColor}-100 dark:border-${themeColor}-900/30`}>
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
                <ListOrdered className={`text-${themeColor}-600`} size={20} />
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">تعیین سرفصل‌ها</label>
             </div>
             <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-600">
                <button type="button" onClick={() => handleChapterCountChange(newProject.chapterCount - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><ChevronDown size={14}/></button>
                <input type="number" readOnly value={newProject.chapterCount} className="w-8 text-center text-xs font-bold bg-transparent outline-none dark:text-white" />
                <button type="button" onClick={() => handleChapterCountChange(newProject.chapterCount + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><ChevronUp size={14}/></button>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
             {newProject.chapters.map((title, idx) => (
               <div key={idx} className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-gray-400 w-4">{idx+1}</span>
                 <input type="text" value={title} placeholder="نام فصل..." onChange={e => handleChapterTitleChange(idx, e.target.value)} className={`flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-600 outline-none focus:border-${themeColor}-400 transition-all dark:text-white`} />
               </div>
             ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-3xl border dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200">زمان‌بندی مطالعه</label>
            <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-600">
              <button type="button" onClick={() => setNewProject({...newProject, schedule: {...newProject.schedule, isDaily: true}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${newProject.schedule.isDaily ? `bg-${themeColor}-600 text-white` : 'text-gray-400'}`}>هر روز</button>
              <button type="button" onClick={() => setNewProject({...newProject, schedule: {...newProject.schedule, isDaily: false}})} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${!newProject.schedule.isDaily ? `bg-${themeColor}-600 text-white` : 'text-gray-400'}`}>روزهای خاص</button>
            </div>
          </div>
          {newProject.schedule.isDaily ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1">زمان شروع</label>
                <input type="time" value={newProject.schedule.routine?.startTime} onChange={e => setNewProject({...newProject, schedule: {...newProject.schedule, routine: {...(newProject.schedule.routine || {startTime:'09:00', endTime:'10:00'}), startTime: e.target.value}}})} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-600 outline-none dark:text-white ltr-input text-left" style={{direction: 'ltr'}} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1">زمان پایان</label>
                <input type="time" value={newProject.schedule.routine?.endTime} onChange={e => setNewProject({...newProject, schedule: {...newProject.schedule, routine: {...(newProject.schedule.routine || {startTime:'09:00', endTime:'10:00'}), endTime: e.target.value}}})} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-600 outline-none dark:text-white ltr-input text-left" style={{direction: 'ltr'}} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">روزهای مورد نظر برای مطالعه را انتخاب کنید:</p>
              {PERSIAN_DAYS.map((dayName, index) => {
                const isSelected = !!newProject.schedule.weeklyCustom?.[index];
                return (
                  <div 
                    key={index} 
                    className={`p-3 rounded-2xl border-2 transition-all duration-200 ${
                      isSelected 
                        ? `bg-white dark:bg-gray-800 border-${themeColor}-500 shadow-md` 
                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer select-none w-full sm:w-auto"
                        onClick={() => {
                          const newCustom = { ...newProject.schedule.weeklyCustom };
                          if (isSelected) {
                            delete newCustom[index];
                          } else {
                            newCustom[index] = { startTime: '09:00', endTime: '10:00' };
                          }
                          setNewProject({ ...newProject, schedule: { ...newProject.schedule, weeklyCustom: newCustom } });
                        }}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? `bg-${themeColor}-500 border-${themeColor}-500` : 'border-gray-300 dark:border-gray-500'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold ${isSelected ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{dayName}</span>
                      </div>

                      {isSelected && (
                        <div className="flex-1 flex items-center gap-2 mt-2 sm:mt-0 mr-0 sm:mr-4">
                          <div className="relative flex-1">
                             <input 
                               type="time" 
                               value={newProject.schedule.weeklyCustom?.[index]?.startTime || '09:00'} 
                               onChange={(e) => {
                                 const newCustom = { ...newProject.schedule.weeklyCustom };
                                 if (newCustom[index]) newCustom[index]!.startTime = e.target.value;
                                 setNewProject({ ...newProject, schedule: { ...newProject.schedule, weeklyCustom: newCustom } });
                               }}
                               className="w-full px-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 border-none text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 ltr-input"
                             />
                          </div>
                          <span className="text-gray-300 font-black">-</span>
                          <div className="relative flex-1">
                             <input 
                               type="time" 
                               value={newProject.schedule.weeklyCustom?.[index]?.endTime || '10:00'} 
                               onChange={(e) => {
                                  const newCustom = { ...newProject.schedule.weeklyCustom };
                                 if (newCustom[index]) newCustom[index]!.endTime = e.target.value;
                                 setNewProject({ ...newProject, schedule: { ...newProject.schedule, weeklyCustom: newCustom } });
                               }}
                               className="w-full px-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 border-none text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 ltr-input"
                             />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">میزان اهمیت پروژه</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(Importance).map(imp => (
              <button key={imp} type="button" onClick={() => setNewProject({...newProject, importance: imp})} className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-xs font-bold border transition-all ${newProject.importance === imp ? `bg-${themeColor}-600 border-${themeColor}-600 text-white shadow-md` : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                {imp}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
          <button type="button" onClick={() => setActiveTab('dashboard')} className="flex-1 py-4 px-6 rounded-2xl border dark:border-gray-700 font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300">انصراف</button>
          <button type="submit" disabled={loading} className={`flex-[2] py-4 px-6 rounded-2xl bg-${themeColor}-600 text-white font-bold flex justify-center items-center gap-2 disabled:opacity-70 shadow-xl shadow-${themeColor}-100 dark:shadow-none transition-all hover:bg-${themeColor}-700`}>
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
            {loading ? 'در حال طراحی برنامه...' : 'تولید برنامه هوشمند'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderDailyTasks = () => {
    const today = new Date();
    const todaysTasks: { project: Project, task: Task }[] = [];
    projects.forEach(p => p.tasks.forEach(t => { if (isSameDay(new Date(t.date), today)) todaysTasks.push({ project: p, task: t }); }));

    return (
      <div className="animate-fade-in max-w-3xl mx-auto pb-24 md:pb-8">
        <header className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white">برنامه امروز شما</h1>
          <p className="text-gray-500 mt-1">{formatPersianDate(today)}</p>
        </header>

        {todaysTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border shadow-sm border-gray-100 dark:border-gray-700">
            <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-6" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">کار تمام است!</h3>
            <p className="text-gray-500 mt-2">برنامه مطالعه‌ای برای امروز باقی نمانده.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysTasks.map(({ project, task }) => (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-5 hover:shadow-md transition-all">
                <button onClick={() => toggleTask(project.id, task.id)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? `bg-emerald-500 border-emerald-500 text-white` : `border-gray-200 dark:border-gray-600`}`}>
                  {task.isCompleted && <CheckCircle2 size={20} />}
                </button>
                <div className="flex-1">
                  <div className="flex gap-2 items-center mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md bg-${project.color}-50 dark:bg-${project.color}-900/20 text-${project.color}-600 font-bold uppercase`}>{project.name}</span>
                    <span className="text-[10px] text-gray-400 font-bold">{TASK_TYPE_LABELS[task.type]}</span>
                  </div>
                  <p className={`font-bold text-gray-800 dark:text-gray-100 ${task.isCompleted ? 'line-through opacity-40' : ''}`}>{task.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProjectDetail = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;
    return (
      <div className="animate-fade-in space-y-8 pb-24 md:pb-8">
        <button onClick={() => setActiveTab('dashboard')} className={`text-gray-500 flex items-center gap-1 text-sm font-bold hover:text-${themeColor}-600 transition-colors dark:text-gray-400`}><ChevronRight size={18} /> بازگشت به پروژه‌ها</button>
        
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border shadow-sm relative overflow-hidden border-gray-100 dark:border-gray-700">
          <div className={`absolute top-0 right-0 w-full h-1.5 bg-${project.color}-500`} />
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-gray-800 dark:text-white mb-4">{project.name}</h1>
              <div className="flex gap-3 flex-wrap">
                <span className="bg-gray-50 dark:bg-gray-700 px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300">📚 {project.chapterCount} فصل</span>
                <span className="bg-gray-50 dark:bg-gray-700 px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300">📄 {project.pageCount} صفحه</span>
                <span className="bg-gray-50 dark:bg-gray-700 px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300">🔥 {project.importance}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleAnalyzeProject(project)} disabled={analyzing} className={`flex items-center gap-2 bg-${themeColor}-600 text-white px-4 md:px-6 py-3 rounded-2xl text-xs md:text-sm font-black disabled:opacity-50 shadow-lg shadow-${themeColor}-100 dark:shadow-none transition-all hover:bg-${themeColor}-700 w-full justify-center md:w-auto`}>
                {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Microscope size={20} />}
                تحلیل وضعیت با مدل {selectedModel.includes('flash') ? 'Flash' : 'Pro'}
              </button>
            </div>
          </div>
        </div>

        {project.lastAnalysis && (
           <div className={`bg-gradient-to-br from-${themeColor}-600 to-${themeColor}-800 text-white rounded-3xl p-6 md:p-8 shadow-xl animate-fade-in border border-${themeColor}-400/20`}>
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit size={24} />
                <h3 className="text-lg md:text-xl font-black">تحلیل مربی هوشمند</h3>
              </div>
              <p className="text-sm leading-relaxed mb-6 opacity-90">{project.lastAnalysis.user_feedback}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] opacity-70 block mb-1 uppercase tracking-tighter">وضعیت یادگیری</span>
                  <span className="font-bold text-sm md:text-base">{STATE_LABELS[project.lastAnalysis.learning_state]}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] opacity-70 block mb-1 uppercase tracking-tighter">اقدام پیشنهادی</span>
                  <span className="font-bold text-sm md:text-base">{TASK_TYPE_LABELS[project.lastAnalysis.next_action]}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] opacity-70 block mb-1 uppercase tracking-tighter">پیش‌بینی تسلط</span>
                  <span className="font-bold text-sm md:text-base">{project.lastAnalysis.future_projection}</span>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] opacity-70 block mb-1 uppercase tracking-tighter">درجه عمق</span>
                  <span className="font-bold text-sm md:text-base">{project.lastAnalysis.estimated_dou}%</span>
                </div>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2">
            <PersianCalendar 
              project={project} 
              onTasksChange={(updatedTasks) => handleUpdateProjectTasks(project.id, updatedTasks)}
            />

            {/* Color Legend */}
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
                  <Info size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">راهنمای رنگ‌های برنامه</span>
               </div>
               <div className="flex flex-wrap gap-4">
                  {[
                    { color: 'indigo', label: 'مطالعه اصلی' },
                    { color: 'amber', label: 'مرور مطالب' },
                    { color: 'rose', label: 'آزمون و تست' },
                    { color: 'emerald', label: 'تمرین عملی' },
                    { color: 'sky', label: 'تدریس به دیگران' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}-500 shadow-[0_0_8px] shadow-${item.color}-500/30`} />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{item.label}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl border shadow-sm border-gray-100 dark:border-gray-700">
              <h3 className={`font-black mb-6 flex items-center gap-2 text-${themeColor}-600 dark:text-${themeColor}-400`}><TrendingUp size={22} /> پیشرفت پروژه</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2 text-gray-500 dark:text-gray-400"><span>پیشرفت مطالعه</span><span className="font-black text-gray-800 dark:text-white">{project.progress}%</span></div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                    <div className={`bg-${project.color}-500 h-3 rounded-full transition-all duration-500`} style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <div className={`flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">فاز فعلی:</span>
                  <span className={`font-black text-${themeColor}-600 dark:text-${themeColor}-400`}>{PHASE_LABELS[project.currentPhase]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-gray-900 overflow-hidden font-['Vazirmatn'] text-gray-800 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-gray-800 border-l dark:border-gray-700 p-8 transition-all duration-300">
        <div className="flex items-center gap-4 mb-12">
          <div className={`w-12 h-12 bg-${themeColor}-600 rounded-2xl flex items-center justify-center text-white shadow-xl min-w-[3rem]`}><BookOpen size={28} /></div>
          <span className="text-xl font-black text-gray-800 dark:text-white leading-tight">برنامه ریزی با هوش‌مصنوعی</span>
        </div>
        <nav className="flex-1 space-y-3">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? `bg-${themeColor}-50 dark:bg-${themeColor}-900/20 text-${themeColor}-700 dark:text-${themeColor}-300 font-black shadow-sm` : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><LayoutDashboard size={22}/> داشبورد</button>
          <button onClick={() => setActiveTab('daily')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === 'daily' ? `bg-${themeColor}-50 dark:bg-${themeColor}-900/20 text-${themeColor}-700 dark:text-${themeColor}-300 font-black shadow-sm` : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><CalendarDays size={22}/> برنامه امروز</button>
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"><Settings size={22}/> تنظیمات</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth relative">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'create' && renderCreateProject()}
        {activeTab === 'daily' && renderDailyTasks()}
        {typeof activeTab === 'string' && !['dashboard', 'create', 'daily'].includes(activeTab) && renderProjectDetail(activeTab)}

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-xl transition-all ${activeTab === 'dashboard' ? `bg-${themeColor}-50 text-${themeColor}-600 dark:bg-${themeColor}-900/20 dark:text-${themeColor}-400` : 'text-gray-400'}`}><LayoutDashboard size={24}/></button>
            <button onClick={() => setActiveTab('create')} className={`bg-${themeColor}-600 text-white p-3 rounded-full shadow-lg shadow-${themeColor}-200 dark:shadow-none -mt-8 border-4 border-white dark:border-gray-800`}>
              <Plus size={28}/>
            </button>
            <button onClick={() => setActiveTab('daily')} className={`p-2 rounded-xl transition-all ${activeTab === 'daily' ? `bg-${themeColor}-50 text-${themeColor}-600 dark:bg-${themeColor}-900/20 dark:text-${themeColor}-400` : 'text-gray-400'}`}><CalendarDays size={24}/></button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"><Settings size={24}/></button>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md p-6 sm:p-8 rounded-t-[2rem] sm:rounded-3xl shadow-2xl animate-slide-up sm:animate-scale-in relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black dark:text-white">تنظیمات برنامه</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"><Plus className="rotate-45" size={24}/></button>
            </div>
            
            <div className="space-y-6 pb-6 sm:pb-0 h-[60vh] sm:h-auto overflow-y-auto">
              
              {/* API Key Input */}
              <div className="space-y-3">
                <span className="text-sm font-bold block dark:text-gray-300">کلید API گوگل (Gemini)</span>
                <div className="relative">
                   <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <Key size={18} />
                   </div>
                   <input 
                     type="password" 
                     value={apiKey} 
                     onChange={(e) => setApiKey(e.target.value)}
                     placeholder="کلید API خود را اینجا وارد کنید..."
                     className="w-full pr-10 pl-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 outline-none focus:border-indigo-500 transition-all dark:text-white text-sm ltr-input text-left"
                     style={{ direction: 'ltr' }}
                   />
                </div>
                <p className="text-[10px] text-gray-400">
                  برای دریافت کلید رایگان به <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a> مراجعه کنید.
                </p>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border dark:border-gray-600">
                <span className="font-bold dark:text-gray-200">حالت شب</span>
                <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl transition-all ${darkMode ? `bg-${themeColor}-600 text-white shadow-lg shadow-${themeColor}-200` : 'bg-white text-amber-500 shadow-sm'}`}>
                  {darkMode ? <Moon size={20}/> : <Sun size={20}/>}
                </button>
              </div>

              {/* Theme Color Selection */}
              <div className="space-y-3">
                <span className="text-sm font-bold block dark:text-gray-300">انتخاب رنگ پوسته</span>
                <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border dark:border-gray-600">
                  {THEME_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setThemeColor(color.name)}
                      title={color.label}
                      className={`w-10 h-10 rounded-full ${color.class} flex items-center justify-center transition-all ${themeColor === color.name ? 'ring-4 ring-offset-2 ring-gray-300 dark:ring-gray-500 scale-110' : 'hover:scale-105'}`}
                    >
                      {themeColor === color.name && <Check size={18} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <span className="text-sm font-bold block dark:text-gray-300">انتخاب مدل هوش مصنوعی</span>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-2xl border dark:border-gray-600">
                  <button 
                    onClick={() => setSelectedModel('gemini-3-flash-preview')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${selectedModel === 'gemini-3-flash-preview' ? `bg-white dark:bg-gray-600 shadow-sm text-${themeColor}-600 dark:text-${themeColor}-400` : 'text-gray-500'}`}
                  >
                    <Zap size={14} />
                    Gemini Flash
                  </button>
                  <button 
                    onClick={() => setSelectedModel('gemini-3-pro-preview')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${selectedModel === 'gemini-3-pro-preview' ? `bg-white dark:bg-gray-600 shadow-sm text-${themeColor}-600 dark:text-${themeColor}-400` : 'text-gray-500'}`}
                  >
                    <Cpu size={14} />
                    Gemini Pro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
