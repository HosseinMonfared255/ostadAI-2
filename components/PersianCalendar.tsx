import React, { useState } from 'react';
import { Edit2, X, Check, Trash2 } from 'lucide-react';
import { getPersianDay, getPersianMonthName, isSameDay, formatPersianDate } from '../utils/dateUtils';
import { Project, Task, TaskType, TASK_TYPE_LABELS } from '../types';

interface PersianCalendarProps {
  project: Project;
  onDayClick?: (date: Date) => void;
  onTaskUpdate?: (date: Date, newType: TaskType | null) => void;
}

export const PersianCalendar: React.FC<PersianCalendarProps> = ({ project, onDayClick, onTaskUpdate }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState<Date | null>(null);

  // Generate a view of the current month/window
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 10); // Start 10 days ago
  
  const days: Date[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  const getTaskForDay = (date: Date): Task | undefined => {
    return project.tasks.find(t => isSameDay(new Date(t.date), date));
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

  const handleDayClick = (date: Date) => {
    if (isEditMode) {
      setSelectedDateForEdit(date);
    } else if (onDayClick) {
      onDayClick(date);
    }
  };

  const confirmTaskChange = (type: TaskType | null) => {
    if (selectedDateForEdit && onTaskUpdate) {
      onTaskUpdate(selectedDateForEdit, type);
    }
    setSelectedDateForEdit(null);
  };

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border transition-all duration-300 relative ${isEditMode ? 'border-indigo-300 ring-2 ring-indigo-50 dark:ring-indigo-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">تقویم مطالعاتی</h3>
          {isEditMode && <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full animate-pulse">حالت ویرایش</span>}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{getPersianMonthName(today)}</span>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-2 rounded-lg transition-all ${isEditMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
            title={isEditMode ? "ذخیره تغییرات" : "ویرایش برنامه"}
          >
            {isEditMode ? <Check size={18} /> : <Edit2 size={18} />}
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Days of week headers (Persian) */}
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}

        {days.map((date, idx) => {
          const task = getTaskForDay(date);
          const isToday = isSameDay(date, new Date());
          const colorName = task ? getTaskColor(task.type) : 'gray';
          
          // Tailwind class construction
          const baseClasses = "h-14 rounded-xl flex flex-col items-center justify-center text-sm transition-all relative";
          
          let specificClasses = "";
          if (task) {
             if (task.isCompleted) {
                specificClasses = `bg-${colorName}-500 text-white`;
             } else {
                specificClasses = `border-2 border-${colorName}-500 text-${colorName}-700 dark:text-${colorName}-400 font-medium`;
             }
          } else if (isToday) {
             specificClasses = "border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-400";
          } else {
             specificClasses = "bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600";
          }

          // Edit mode styling override
          if (isEditMode) {
             specificClasses += " cursor-pointer hover:scale-105 active:scale-95 hover:shadow-md";
             if (!task) specificClasses += " hover:bg-gray-100 dark:hover:bg-gray-700";
          } else {
             specificClasses += " cursor-default";
          }

          return (
            <div 
              key={idx} 
              onClick={() => handleDayClick(date)}
              className={`${baseClasses} ${specificClasses}`}
              title={task ? `${task.type}: ${task.description}` : ''}
            >
              <span className="text-xs font-bold">{getPersianDay(date)}</span>
              {task && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${task.isCompleted ? 'bg-white' : `bg-${colorName}-500`}`} />
              )}
              {isEditMode && task && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center">
                   <div className={`w-1.5 h-1.5 rounded-full bg-${colorName}-500`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      {!isEditMode && (
        <div className="flex flex-wrap gap-3 mt-4 justify-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> مطالعه</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> مرور</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> آزمون</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> تمرین</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-sky-500 rounded-full"></div> تدریس</div>
        </div>
      )}

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="mt-4 text-center text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg">
          برای تغییر یا حذف برنامه، روی روز مورد نظر کلیک کنید.
        </div>
      )}

      {/* Type Selection Modal */}
      {selectedDateForEdit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-11/12 max-w-xs">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="font-bold text-gray-800 dark:text-gray-100">{formatPersianDate(selectedDateForEdit)}</span>
              <button onClick={() => setSelectedDateForEdit(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.values(TaskType).map((type) => {
                const color = getTaskColor(type);
                return (
                  <button
                    key={type}
                    onClick={() => confirmTaskChange(type)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 text-xs font-bold transition-colors border-${color}-100 dark:border-${color}-900 bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:border-${color}-500`}
                  >
                    {TASK_TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => confirmTaskChange(null)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <Trash2 size={14} />
              <span>حذف / روز خالی</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};