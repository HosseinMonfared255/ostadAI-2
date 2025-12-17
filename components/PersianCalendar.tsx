
import React, { useState } from 'react';
import { Plus, X, Trash2, Calendar as CalendarIcon, Check, Edit3, Save } from 'lucide-react';
import { getPersianDay, getPersianMonthName, isSameDay, formatPersianDate } from '../utils/dateUtils';
import { Project, Task, TaskType, TASK_TYPE_LABELS } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PersianCalendarProps {
  project: Project;
  onTasksChange: (updatedTasks: Task[]) => void;
}

export const PersianCalendar: React.FC<PersianCalendarProps> = ({ project, onTasksChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>(TaskType.STUDY);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 10); 
  
  const days: Date[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  const getTasksForDay = (date: Date): Task[] => {
    return project.tasks.filter(t => isSameDay(new Date(t.date), date));
  };

  const getTaskColor = (type: TaskType) => {
    switch (type) {
      case TaskType.STUDY: return 'indigo';
      case TaskType.REVIEW: return 'amber';
      case TaskType.TEST: return 'rose';
      case TaskType.PRACTICE: return 'emerald';
      case TaskType.TEACH: return 'sky';
      default: return 'gray';
    }
  };

  const handleAddTask = () => {
    if (!selectedDate || !newTaskDesc.trim()) return;
    const newTask: Task = {
      id: uuidv4(),
      projectId: project.id,
      date: selectedDate.toISOString(),
      type: newTaskType,
      description: newTaskDesc,
      isCompleted: false
    };
    onTasksChange([...project.tasks, newTask]);
    setNewTaskDesc('');
  };

  const handleDeleteTask = (taskId: string) => {
    onTasksChange(project.tasks.filter(t => t.id !== taskId));
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    onTasksChange(project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    setEditingTaskId(null);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" size={20} />
          تقویم برنامه ریزی
        </h3>
        <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-gray-500">
          {getPersianMonthName(today)} {new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', year: 'numeric' }).format(today)}
        </span>
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-black text-gray-400 py-1">{d}</div>
        ))}

        {days.map((date, idx) => {
          const tasks = getTasksForDay(date);
          const isToday = isSameDay(date, today);
          
          return (
            <button 
              key={idx} 
              onClick={() => setSelectedDate(date)}
              className={`h-16 rounded-2xl flex flex-col items-center justify-center transition-all relative group ${
                isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900' : ''
              } ${tasks.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <span className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>{getPersianDay(date)}</span>
              <div className="flex gap-0.5 mt-1 overflow-hidden px-1">
                {tasks.slice(0, 3).map(t => (
                  <div key={t.id} className={`w-1.5 h-1.5 rounded-full bg-${getTaskColor(t.type)}-500`} />
                ))}
                {tasks.length > 3 && <div className="w-1 h-1 rounded-full bg-gray-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pop-up Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedDate(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h4 className="font-black text-lg text-gray-800 dark:text-white">{formatPersianDate(selectedDate)}</h4>
                <p className="text-[10px] text-gray-400 font-bold">مدیریت وظایف روزانه</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Task List */}
              <div className="space-y-4">
                <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">وظایف ثبت شده</h5>
                {getTasksForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-2xl border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400">برنامه‌ای برای این روز ثبت نشده است.</p>
                  </div>
                ) : (
                  getTasksForDay(selectedDate).map(task => (
                    <div key={task.id} className="group bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border dark:border-gray-700 transition-all hover:shadow-sm">
                      {editingTaskId === task.id ? (
                        <div className="space-y-3">
                          <input 
                            autoFocus
                            className="w-full bg-white dark:bg-gray-800 border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            defaultValue={task.description}
                            onBlur={(e) => handleUpdateTask(task.id, { description: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTask(task.id, { description: e.currentTarget.value })}
                          />
                          <div className="flex gap-2">
                            {Object.values(TaskType).map(type => (
                              <button 
                                key={type} 
                                onClick={() => handleUpdateTask(task.id, { type })}
                                className={`text-[9px] px-2 py-1 rounded-lg border font-bold ${task.type === type ? `bg-${getTaskColor(type)}-500 text-white border-${getTaskColor(type)}-500` : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600'}`}
                              >
                                {TASK_TYPE_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 w-2 h-2 rounded-full bg-${getTaskColor(task.type)}-500 shadow-[0_0_8px] shadow-${getTaskColor(task.type)}-500/50`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black uppercase text-${getTaskColor(task.type)}-600`}>{TASK_TYPE_LABELS[task.type]}</span>
                              {task.isCompleted && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 rounded flex items-center gap-0.5"><Check size={8}/> انجام شده</span>}
                            </div>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{task.description}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTaskId(task.id)} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 rounded-lg"><Edit3 size={14} /></button>
                            <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Task Section */}
              <div className="pt-6 border-t dark:border-gray-700">
                <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">افزودن وظیفه جدید</h5>
                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-2xl space-y-4">
                  <textarea 
                    placeholder="توضیح فعالیت را اینجا بنویسید..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all resize-none min-h-[80px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {Object.values(TaskType).map(type => (
                      <button 
                        key={type} 
                        onClick={() => setNewTaskType(type)}
                        className={`text-[10px] px-3 py-1.5 rounded-xl border-2 font-black transition-all ${newTaskType === type ? `bg-${getTaskColor(type)}-500 text-white border-${getTaskColor(type)}-500 shadow-lg shadow-${getTaskColor(type)}-500/20` : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 hover:border-indigo-200'}`}
                      >
                        {TASK_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleAddTask}
                    disabled={!newTaskDesc.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                  >
                    <Plus size={18} />
                    ثبت در تقویم
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
