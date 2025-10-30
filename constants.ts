
// Heures de session par jour de la semaine (Lundi=1, ..., Samedi=6)
export const SESSION_HOURS: { [key: number]: number } = {
  1: 2.5, // Lundi
  2: 2.5, // Mardi
  3: 2.5, // Mercredi
  4: 2.5, // Jeudi
  5: 2.5, // Vendredi
  6: 5,   // Samedi
};

// Taux d'absentéisme tolérable
export const ABSENCE_THRESHOLD = 0.30;
