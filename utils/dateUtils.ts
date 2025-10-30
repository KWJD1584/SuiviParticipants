import { format, getYear, getMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const getCurrentTrainingYear = (): string => {
  const now = new Date();
  const year = getYear(now);
  const month = getMonth(now);
  // L'année de formation commence en Septembre (mois 8)
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const getTrainingYears = (): string[] => {
  const currentYearEnd = parseInt(getCurrentTrainingYear().split('-')[1], 10);
  return Array.from({ length: 5 }, (_, i) => `${currentYearEnd - i - 1}-${currentYearEnd - i}`);
};

export const getMonthsForTrainingYear = (year: string): { value: string; label: string }[] => {
  const startYear = parseInt(year.split('-')[0], 10);
  const months = [];
  for (let i = 0; i < 11; i++) {
    const monthIndex = (8 + i) % 12;
    const yearForMonth = monthIndex >= 8 ? startYear : startYear + 1;
    const date = new Date(yearForMonth, monthIndex, 1);
    months.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: fr }).replace(/^\w/, c => c.toUpperCase()),
    });
  }
  return months;
};

export const getWeeksForMonth = (yearMonth: string): Date[][] => {
  if (!yearMonth) return [];
  const [year, month] = yearMonth.split('-').map(Number);
  const monthStartDate = new Date(year, month - 1, 1);
  const monthEndDate = endOfMonth(monthStartDate);
  
  const daysInMonth = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });
  
  // Règle : une semaine appartient à un mois si son Lundi est dans ce mois.
  // Cela évite les doublons de semaines entre les mois.
  const mondaysInMonth = daysInMonth.filter(day => getDay(day) === 1);
  
  const weeks = mondaysInMonth.map(monday => {
    // Pour chaque lundi, on génère la semaine complète du lundi au samedi
    return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  });

  return weeks;
};

export const formatWeekLabel = (week: Date[]): string => {
  if (!week || week.length === 0) return '';
  const start = format(week[0], 'dd/MM');
  const end = format(week[week.length - 1], 'dd/MM/yyyy');
  return `Semaine du ${start} au ${end}`;
};