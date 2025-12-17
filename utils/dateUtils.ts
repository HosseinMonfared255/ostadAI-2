// Using native Intl.DateTimeFormat for Solar Hijri (Persian) calendar support
// This avoids heavy libraries like moment-jalaali or date-fns-jalali for basic formatting

export const formatPersianDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const getPersianMonthName = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    month: 'long',
  }).format(date);
};

export const getPersianYear = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    year: 'numeric',
  }).format(date);
};

export const getPersianDay = (date: Date): string => {
  // Returns number as string in Persian digits
  return new Intl.DateTimeFormat('fa-IR', {
    calendar: 'persian',
    day: 'numeric',
  }).format(date);
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Generate days for a calendar view (approximate for the current month window)
export const generateCalendarDays = (baseDate: Date = new Date()) => {
  const days = [];
  const start = new Date(baseDate);
  start.setDate(start.getDate() - 15); // Show 2 weeks back
  
  for (let i = 0; i < 45; i++) { // Show 45 days total window
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};