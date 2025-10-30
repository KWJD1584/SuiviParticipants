export interface Participant {
  cef: string;
  nom: string;
  prenom: string;
  groupe: string;
  mhAnnuelleAffectee: number;
  fraisInscription: number;
  fraisFormation: number;
  trainingYear: string;
}

// { [participantCef]: { [dateString]: isAbsent } }
export type AttendanceRecord = Record<string, Record<string, boolean>>;

export interface HistoryEntry {
  id: string;
  date: string;
  trainingYear: string;
  month: string;
  weekLabel: string;
  group: string;
  attendance: AttendanceRecord;
  weekDates: string[];
}

// Types for Financials
export type InscriptionStatus = 'Payé' | 'En attente';
export interface MonthlyPayments {
  [month: string]: number; // e.g., '2024-09': 500
}
export interface ParticipantFinancials {
  inscriptionStatus: InscriptionStatus;
  monthlyPayments: MonthlyPayments;
  inscriptionPayment?: number;
}
export type FinancialRecord = Record<string, ParticipantFinancials>;

// Action type for updating financials state
export type FinancialUpdateAction = 
    | { type: 'monthly'; month: string; amount: number }
    | { type: 'inscription'; amount: number };

// Type for user accounts
export interface User {
  id: string;
  username: string;
  password?: string; // Should not be stored in client-side state long-term
  role: 'admin' | 'user';
  participantCef?: string;
}