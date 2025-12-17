import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Circle, 
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
  Palette
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
  PHASE_LABELS
} from './types';
import { generateStudyPlan } from './services/geminiService';
import { formatPersianDate, isSameDay } from './utils/dateUtils';
import { PersianCalendar } from './components/PersianCalendar';

// --- Mock Data / Initial State Helper ---
const loadProjects = (): Project[] => {
  const saved = localStorage.getItem('ostad_projects');
  return saved ? JSON.parse(saved) : [];
};

const THEME_COLORS = [
  { id: 'indigo', name: 'نیلی', class: 'indigo' },
  { id: 'rose', name: 'سرخ', class: 'rose' },
  { id: 'emerald', name: 'زمردی', class: 'emerald' },
  { id: 'sky', name: 'آسمانی', class: 'sky' },
  { id: 'amber', name: 'کهربایی', class: 'amber' },
  { id: 'violet', name: 'بنفش', class: 'violet' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'create' | string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('themeMode') === 'dark');
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('themeColor') || 'indigo');

  // Create Project Form State
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    pageCount: 100,
    difficulty: Difficulty.MEDIUM,
    importance: Importance.MEDIUM
  });

  useEffect(() => {
    localStorage.setItem('ostad_projects', JSON.stringify(projects));
  }, [projects]);

  // Apply Theme Effects
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('themeMode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('themeMode', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  // --- Actions ---

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const plan = await generateStudyPlan(newProject);
      
      const newProj: Project = {
        id: uuidv4(),
        name: newProject.name,
        pageCount: newProject.pageCount,
        difficulty: newProject.difficulty,
        importance: newProject.importance,
        color: ['indigo', 'emerald', 'rose', 'amber', 'sky'][Math.floor(Math.random() * 5)],
        createdAt: new Date().toISOString(),
        currentPhase: Phase.EDUCATION,
        progress: 0,
        tasks: plan.tasks.map(t => ({ ...t, id: uuidv4() }))
      };

      setProjects([...projects, newProj]);
      setActiveTab('dashboard');
      setNewProject({ name: '', pageCount: 100, difficulty: Difficulty.MEDIUM, importance: Importance.MEDIUM });
    } catch (error) {
      console.error("Failed to create project", error);
      alert("خطا در ایجاد پروژه. لطفا کلید API را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      
      const updatedTasks = p.tasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      );
      
      // Recalculate progress
      const completed = updatedTasks.filter(t => t.isCompleted).length;
      const progress = Math.round((completed / updatedTasks.length) * 100);

      let phase = Phase.EDUCATION;
      if (progress > 25) phase = Phase.PRACTICE;
      if (progress > 50) phase = Phase.CONSOLIDATION;
      if (progress > 80) phase = Phase.MASTERY;

      return { ...p, tasks: updatedTasks, progress, currentPhase: phase };
    }));
  };

  const handleTaskUpdate = (projectId: string, date: Date, type: TaskType | null) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      let updatedTasks = p.tasks.filter(t => !isSameDay(new Date(t.date), date));
      if (type) {
        const newTask: Task = {
          id: uuidv4(),
          projectId: p.id,
          date: date.toISOString(),
          type: type,
          description: `${TASK_TYPE_LABELS[type]} (دستی)`,
          isCompleted: false
        };
        updatedTasks.push(newTask);
      }
      updatedTasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const completed = updatedTasks.filter(t => t.isCompleted).length;
      const total = updatedTasks.length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { ...p, tasks: updatedTasks, progress };
    }));
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">پروژه‌های مطالعاتی</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">مدیریت یادگیری عمیق و مرور</p>
        </div>
        <button 
          onClick={() => setActiveTab('create')}
          className={`bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-${themeColor}-200 dark:shadow-none`}
        >
          <Plus size={20} />
          <span>پروژه جدید</span>
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <BrainCircuit className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
          <p className="text-gray-500 dark:text-gray-400">هنوز پروژه‌ای ایجاد نکرده‌اید.</p>
          <button onClick={() => setActiveTab('create')} className={`text-${themeColor}-600 dark:text-${themeColor}-400 font-bold mt-2 hover:underline`}>
            اولین پروژه را بسازید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => setActiveTab(p.id)}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-1.5 h-full bg-${p.color}-500`} />
              
              <div className="flex justify-between items-start mb-4">
                <h3 className={`font-bold text-lg text-gray-800 dark:text-gray-100 group-hover:text-${themeColor}-600 dark:group-hover:text-${themeColor}-400 transition-colors`}>{p.name}</h3>
                <span className={`px-2 py-1 bg-${p.color}-50 dark:bg-${p.color}-900/30 text-${p.color}-600 dark:text-${p.color}-400 text-xs rounded-lg font-medium`}>
                  {p.difficulty}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>وضعیت:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{PHASE_LABELS[p.currentPhase]}</span>
                </div>
                
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`bg-${p.color}-500 h-2 rounded-full transition-all duration-500`} 
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>پیشرفت کلی</span>
                  <span>{p.progress}٪</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateProject = () => (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 animate-fade-in mb-20 md:mb-0">
      <div className="mb-8 text-center">
        <div className={`w-16 h-16 bg-${themeColor}-50 dark:bg-${themeColor}-900/30 text-${themeColor}-600 dark:text-${themeColor}-400 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <BrainCircuit size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">طراحی مسیر یادگیری هوشمند</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">با کمک هوش مصنوعی، برنامه ای دقیق بر اساس منحنی فراموشی دریافت کنید.</p>
      </div>

      <form onSubmit={handleCreateProject} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام پروژه مطالعه</label>
          <input 
            required
            type="text" 
            value={newProject.name}
            onChange={e => setNewProject({...newProject, name: e.target.value})}
            className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 focus:border-${themeColor}-500 focus:ring-2 focus:ring-${themeColor}-100 dark:focus:ring-${themeColor}-900 outline-none transition-all`}
            placeholder="مثال: یادگیری React پیشرفته"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تعداد صفحات/حجم</label>
            <input 
              required
              type="number" 
              min="1"
              value={newProject.pageCount}
              onChange={e => setNewProject({...newProject, pageCount: Number(e.target.value)})}
              className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 focus:border-${themeColor}-500 focus:ring-2 focus:ring-${themeColor}-100 dark:focus:ring-${themeColor}-900 outline-none transition-all`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">سختی مطلب</label>
            <select 
              value={newProject.difficulty}
              onChange={e => setNewProject({...newProject, difficulty: e.target.value as Difficulty})}
              className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 focus:border-${themeColor}-500 focus:ring-2 focus:ring-${themeColor}-100 dark:focus:ring-${themeColor}-900 outline-none transition-all`}
            >
              {Object.values(Difficulty).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اهمیت</label>
            <select 
              value={newProject.importance}
              onChange={e => setNewProject({...newProject, importance: e.target.value as Importance})}
              className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 focus:border-${themeColor}-500 focus:ring-2 focus:ring-${themeColor}-100 dark:focus:ring-${themeColor}-900 outline-none transition-all`}
            >
              {Object.values(Importance).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            type="button" 
            onClick={() => setActiveTab('dashboard')}
            className="flex-1 py-3 px-6 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            انصراف
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-xl bg-${themeColor}-600 text-white font-bold hover:bg-${themeColor}-700 transition-colors shadow-lg shadow-${themeColor}-200 dark:shadow-none flex justify-center items-center gap-2`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
            {loading ? 'در حال طراحی برنامه...' : 'ایجاد برنامه هوشمند'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderDailyTasks = () => {
    const today = new Date();
    const todaysTasks: { project: Project, task: Task }[] = [];

    projects.forEach(p => {
      p.tasks.forEach(t => {
        if (isSameDay(new Date(t.date), today)) {
          todaysTasks.push({ project: p, task: t });
        }
      });
    });

    return (
      <div className="animate-fade-in max-w-3xl mx-auto pb-20 md:pb-0">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">برنامه امروز</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{formatPersianDate(today)}</p>
        </header>

        {todaysTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">تبریک!</h3>
            <p className="text-gray-500 dark:text-gray-400">برای امروز وظیفه‌ای ندارید.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysTasks.map(({ project, task }) => (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-all">
                <button 
                  onClick={() => toggleTask(project.id, task.id)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    task.isCompleted 
                    ? `bg-${project.color}-500 text-white` 
                    : `border-2 border-${project.color}-200 dark:border-${project.color}-800 text-transparent hover:border-${project.color}-500`
                  }`}
                >
                  <CheckCircle2 size={18} />
                </button>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md bg-${project.color}-50 dark:bg-${project.color}-900/30 text-${project.color}-600 dark:text-${project.color}-400 font-bold`}>
                      {project.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 px-1.5 rounded">
                      {TASK_TYPE_LABELS[task.type]}
                    </span>
                  </div>
                  <p className={`font-medium text-gray-800 dark:text-gray-200 ${task.isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>
                    {task.description}
                  </p>
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
      <div className="animate-fade-in space-y-6 pb-20 md:pb-0">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 text-sm mb-2"
        >
          <ChevronRight size={16} /> بازگشت به داشبورد
        </button>

        {/* Header Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-full h-1 bg-${project.color}-500`} />
          
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
            <div>
              <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">{project.name}</h1>
              <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">سختی: {project.difficulty}</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">اهمیت: {project.importance}</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{project.pageCount} صفحه</span>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">فاز فعلی</div>
                <div className={`font-bold text-${project.color}-600 dark:text-${project.color}-400 text-lg`}>{PHASE_LABELS[project.currentPhase]}</div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"></div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">پیشرفت</div>
                <div className="font-bold text-gray-800 dark:text-white text-lg">{project.progress}٪</div>
              </div>
            </div>
          </div>

          {/* Progress Phases Visualizer */}
          <div className="mt-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-gray-700 -z-10 -translate-y-1/2 rounded-full"></div>
            <div className="flex justify-between">
              {Object.values(Phase).map((phase, idx) => {
                 const isActive = project.currentPhase === phase;
                 const phaseIndex = Object.values(Phase).indexOf(project.currentPhase);
                 const isPassed = idx < phaseIndex;
                 
                 return (
                  <div key={phase} className="flex flex-col items-center gap-2 bg-white dark:bg-gray-800 px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive ? `border-${project.color}-500 bg-${project.color}-50 dark:bg-${project.color}-900/50 text-${project.color}-600 dark:text-${project.color}-400 scale-110 shadow-lg` : 
                      isPassed ? `border-${project.color}-500 bg-${project.color}-500 text-white` : 
                      'border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                    }`}>
                      {isPassed ? <CheckCircle2 size={16} /> : <div className="text-xs font-bold">{idx + 1}</div>}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}>
                      {PHASE_LABELS[phase]}
                    </span>
                  </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <PersianCalendar 
              project={project} 
              onTaskUpdate={(date, type) => handleTaskUpdate(project.id, date, type)}
            />
          </div>

          {/* Upcoming Stats/Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                 <TrendingUp size={18} className={`text-${themeColor}-500`} />
                 وضعیت یادگیری
               </h3>
               <div className="space-y-4">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">کل وظایف</span>
                    <span className="font-bold dark:text-white">{project.tasks.length}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">انجام شده</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{project.tasks.filter(t => t.isCompleted).length}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">باقی مانده</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{project.tasks.filter(t => !t.isCompleted).length}</span>
                 </div>
               </div>
            </div>

            <div className={`bg-${themeColor}-600 p-5 rounded-2xl shadow-lg shadow-${themeColor}-200 dark:shadow-none text-white`}>
               <h3 className="font-bold mb-2 flex items-center gap-2">
                 <GraduationCap size={20} />
                 توصیه هوشمند
               </h3>
               <p className="text-sm opacity-90 leading-relaxed">
                 {project.currentPhase === Phase.EDUCATION && "تمرکز شما باید روی درک عمیق مفاهیم اولیه باشد. عجله نکنید."}
                 {project.currentPhase === Phase.PRACTICE && "زمان حل مسئله است. دانش خود را در سناریوهای واقعی به کار بگیرید."}
                 {project.currentPhase === Phase.CONSOLIDATION && "مرورهای فاصله‌دار کلید انتقال به حافظه بلندمدت است."}
                 {project.currentPhase === Phase.MASTERY && "برای تسلط کامل، سعی کنید مفاهیم را به دیگران (یا خیالی) تدریس کنید."}
               </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowSettings(false)}>
      <div className="bg-white dark:bg-gray-800 w-11/12 max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Settings className={`text-${themeColor}-600`} /> تنظیمات ظاهر
            </h3>
            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <Settings size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
         </div>

         <div className="space-y-6">
            {/* Dark Mode Toggle */}
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
               <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={24} className="text-indigo-400" /> : <Sun size={24} className="text-amber-500" />}
                  <div>
                    <div className="font-bold text-gray-800 dark:text-white">حالت شب</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{darkMode ? 'فعال' : 'غیرفعال'}</div>
                  </div>
               </div>
               <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-7 rounded-full transition-all flex items-center p-1 ${darkMode ? `bg-${themeColor}-600` : 'bg-gray-300'}`}
               >
                 <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all transform ${darkMode ? '-translate-x-5' : 'translate-x-0'}`} />
               </button>
            </div>

            {/* Theme Color Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                <Palette size={18} />
                رنگ اصلی برنامه
              </div>
              <div className="grid grid-cols-3 gap-3">
                 {THEME_COLORS.map(color => (
                   <button
                     key={color.id}
                     onClick={() => setThemeColor(color.id)}
                     className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                       themeColor === color.id 
                       ? `border-${color.id}-500 bg-${color.id}-50 dark:bg-${color.id}-900/30 text-${color.id}-700 dark:text-${color.id}-300` 
                       : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                     }`}
                   >
                     <div className={`w-4 h-4 rounded-full bg-${color.class}-500`}></div>
                     <span className="text-xs font-bold">{color.name}</span>
                   </button>
                 ))}
              </div>
            </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-[#f8fafc] dark:bg-gray-900 overflow-hidden font-['Vazirmatn'] transition-colors duration-300`}>
      
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className={`w-10 h-10 bg-${themeColor}-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-${themeColor}-200 dark:shadow-none`}>
            <BookOpen size={24} />
          </div>
          <span className="text-xl font-black text-gray-800 dark:text-white hidden lg:block">استاد هوش</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? `bg-${themeColor}-50 dark:bg-${themeColor}-900/20 text-${themeColor}-700 dark:text-${themeColor}-400 font-bold` : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden lg:block">داشبورد</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('daily')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'daily' ? `bg-${themeColor}-50 dark:bg-${themeColor}-900/20 text-${themeColor}-700 dark:text-${themeColor}-400 font-bold` : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <CalendarDays size={20} />
            <span className="hidden lg:block">برنامه روزانه</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            <Settings size={20} />
            <span className="hidden lg:block">تنظیمات ظاهر</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
           <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
             <div className={`w-8 h-8 rounded-full bg-${themeColor}-100 dark:bg-${themeColor}-900 flex items-center justify-center text-${themeColor}-600 dark:text-${themeColor}-400 font-bold`}>
               M
             </div>
             <div className="text-sm">
               <div className="font-bold text-gray-700 dark:text-gray-200">کاربر فعال</div>
               <div className="text-xs text-gray-400 dark:text-gray-500">نسخه آزمایشی</div>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 md:p-8">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
           <div className="flex items-center gap-2 font-black text-gray-800 dark:text-white text-lg">
             <BookOpen className={`text-${themeColor}-600`} />
             استاد هوش
           </div>
           <div className="flex gap-2">
             <button onClick={() => setShowSettings(true)} className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Settings size={20}/></button>
           </div>
        </div>
        
        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 z-40 flex justify-around">
           <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-xl ${activeTab === 'dashboard' ? `text-${themeColor}-600 bg-${themeColor}-50 dark:bg-${themeColor}-900/20` : 'text-gray-400'}`}>
              <LayoutDashboard />
           </button>
           <button onClick={() => setActiveTab('create')} className={`p-2 rounded-xl ${activeTab === 'create' ? `text-${themeColor}-600 bg-${themeColor}-50 dark:bg-${themeColor}-900/20` : 'text-gray-400'}`}>
              <Plus />
           </button>
           <button onClick={() => setActiveTab('daily')} className={`p-2 rounded-xl ${activeTab === 'daily' ? `text-${themeColor}-600 bg-${themeColor}-50 dark:bg-${themeColor}-900/20` : 'text-gray-400'}`}>
              <CalendarDays />
           </button>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'create' && renderCreateProject()}
        {activeTab === 'daily' && renderDailyTasks()}
        {typeof activeTab === 'string' && activeTab !== 'dashboard' && activeTab !== 'create' && activeTab !== 'daily' && renderProjectDetail(activeTab)}

        {showSettings && renderSettingsModal()}

      </main>

      {/* Global Style overrides */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}