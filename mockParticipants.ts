import type { Participant } from './types';
import { getCurrentTrainingYear } from './utils/dateUtils';

const trainingYear = getCurrentTrainingYear();

export const mockParticipants: Participant[] = [
  { cef: 'P123456', nom: 'Dupont', prenom: 'Jean', groupe: 'DEV101', mhAnnuelleAffectee: 500, fraisInscription: 200, fraisFormation: 2500, trainingYear },
  { cef: 'P789012', nom: 'Martin', prenom: 'Marie', groupe: 'DEV101', mhAnnuelleAffectee: 500, fraisInscription: 200, fraisFormation: 2500, trainingYear },
  { cef: 'P345678', nom: 'Bernard', prenom: 'Luc', groupe: 'DEV101', mhAnnuelleAffectee: 480, fraisInscription: 200, fraisFormation: 2300, trainingYear },
  { cef: 'P901234', nom: 'Thomas', prenom: 'Sophie', groupe: 'DEV102', mhAnnuelleAffectee: 520, fraisInscription: 250, fraisFormation: 2800, trainingYear },
  { cef: 'P567890', nom: 'Petit', prenom: 'Alice', groupe: 'DEV102', mhAnnuelleAffectee: 520, fraisInscription: 250, fraisFormation: 2800, trainingYear },
  { cef: 'P112233', nom: 'Robert', prenom: 'Julien', groupe: 'RESEAU201', mhAnnuelleAffectee: 600, fraisInscription: 300, fraisFormation: 3200, trainingYear },
  { cef: 'P445566', nom: 'Richard', prenom: 'Camille', groupe: 'RESEAU201', mhAnnuelleAffectee: 600, fraisInscription: 300, fraisFormation: 3200, trainingYear },
  { cef: 'P778899', nom: 'Durand', prenom: 'Paul', groupe: 'DEV101', mhAnnuelleAffectee: 500, fraisInscription: 200, fraisFormation: 2500, trainingYear },
  { cef: 'P998877', nom: 'Leroy', prenom: 'Isabelle', groupe: 'DEV102', mhAnnuelleAffectee: 520, fraisInscription: 250, fraisFormation: 2800, trainingYear },
  { cef: 'P665544', nom: 'Moreau', prenom: 'Nicolas', groupe: 'RESEAU201', mhAnnuelleAffectee: 600, fraisInscription: 300, fraisFormation: 3200, trainingYear },
  { cef: 'P258369', nom: 'Simon', prenom: 'Hugo', groupe: 'DEV101', mhAnnuelleAffectee: 480, fraisInscription: 200, fraisFormation: 2300, trainingYear },
  { cef: 'P147258', nom: 'Laurent', prenom: 'Léa', groupe: 'DEV102', mhAnnuelleAffectee: 520, fraisInscription: 250, fraisFormation: 2800, trainingYear },
  { cef: 'P369147', nom: 'Girard', prenom: 'Manon', groupe: 'RESEAU201', mhAnnuelleAffectee: 580, fraisInscription: 300, fraisFormation: 3000, trainingYear },
  { cef: 'P741852', nom: 'Garnier', prenom: 'Clément', groupe: 'DEV101', mhAnnuelleAffectee: 500, fraisInscription: 200, fraisFormation: 2500, trainingYear },
  { cef: 'P852963', nom: 'Faure', prenom: 'Chloé', groupe: 'DEV102', mhAnnuelleAffectee: 520, fraisInscription: 250, fraisFormation: 2800, trainingYear },
];
