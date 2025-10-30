

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Participant, AttendanceRecord, HistoryEntry, FinancialRecord, ParticipantFinancials, InscriptionStatus, FinancialUpdateAction, User } from './types';
import { EntryTab } from './components/EntryTab';
import { DataTab } from './components/DataTab';
import { HistoryTab } from './components/HistoryTab';
import { StatisticsTab } from './components/StatisticsTab';
import { ReceiptsTab } from './components/ReceiptsTab';
import { FinancialsTab } from './components/FinancialsTab';
import { AccountsTab } from './components/AccountsTab';
import { SettingsTab } from './components/SettingsTab';
import { Login } from './components/Login';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FileUpIcon, HistoryIcon, BarChartIcon, FileTextIcon, DollarSignIcon, EditIcon, UsersIcon, SettingsIcon } from './components/icons/Icons';
import { mockParticipants } from './mockParticipants';
import { mockUsers } from './mockUsers';
import { getTrainingYears as getDefaultTrainingYears } from './utils/dateUtils';

type Tab = 'entry' | 'data' | 'history' | 'stats' | 'receipts' | 'financials' | 'accounts' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('entry');
  
  // Data States
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('participants');
    try {
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockParticipants;
    } catch (e) {
        return mockParticipants;
    }
  });
  const [attendance, setAttendance] = useState<AttendanceRecord>(() => {
    const saved = localStorage.getItem('attendance');
    return saved ? JSON.parse(saved) : {};
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('history');
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (e) {
        console.error("Échec de l'analyse de l'historique depuis le localStorage", e);
        return [];
    }
  });
  const [financials, setFinancials] = useState<FinancialRecord>(() => {
    const saved = localStorage.getItem('financials');
    return saved ? JSON.parse(saved) : {};
  });
  const [trainingYears, setTrainingYears] = useState<string[]>(() => {
    const saved = localStorage.getItem('trainingYears');
    return saved ? JSON.parse(saved) : getDefaultTrainingYears();
  });
  
  // Auth & User States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : mockUsers;
  });

  // Modal State
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);

  // Data Persistence Effects
  useEffect(() => {
    localStorage.setItem('participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);
  
  useEffect(() => {
    localStorage.setItem('financials', JSON.stringify(financials));
  }, [financials]);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('trainingYears', JSON.stringify(trainingYears));
  }, [trainingYears]);
  
  // Auth Handlers
  const handleLogin = (username: string, password_input: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password_input);
    if (user) {
      const { password, ...userToStore } = user;
      setCurrentUser(userToStore);
      sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
      // Set default tab based on role
      setActiveTab(userToStore.role === 'admin' ? 'entry' : 'stats');
      return true;
    }
    return false;
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    setActiveTab('entry'); // Reset to default for next login
  };
  
  // User Management Handlers
  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUser: User = { ...user, id: `user-${Date.now()}` };
    setUsers(prev => [...prev, newUser]);
  };
  
  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };
  
  const handleResetPassword = (userId: string) => {
    setUsers(prevUsers => prevUsers.map(user => {
      if (user.id === userId && user.participantCef) {
        const participant = participants.find(p => p.cef === user.participantCef);
        if (participant) {
          const newPassword = `${participant.nom.split(' ')[0]}@${participant.cef.replace(/\D/g, '').substring(0, 4)}`;
          return { ...user, password: newPassword };
        }
      }
      return user;
    }));
  };
  
  // Data Handlers
  const handleParticipantsImport = (newParticipants: Participant[], trainingYear: string) => {
    setParticipants(prev => [
        ...prev.filter(p => p.trainingYear !== trainingYear),
        ...newParticipants
    ]);
    
    setUsers(prevUsers => {
        const existingCefs = new Set(prevUsers.map(u => u.participantCef));
        const usersToAdd: User[] = [];

        newParticipants.forEach(p => {
            if (!existingCefs.has(p.cef)) {
                usersToAdd.push({
                    id: `user-${p.cef}`,
                    username: p.cef,
                    password: `${p.nom.split(' ')[0]}@${p.cef.replace(/\D/g, '').substring(0, 4)}`,
                    role: 'user',
                    participantCef: p.cef,
                });
            }
        });
        
        return [...prevUsers, ...usersToAdd];
    });

    setActiveTab('entry');
  };

  const handleAttendanceChange = (participantCef: string, date: string, isAbsent: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [participantCef]: {
        ...prev[participantCef],
        [date]: isAbsent,
      },
    }));
  };
  
  const handleFinancialsChange = (cef: string, action: FinancialUpdateAction) => {
    setFinancials(prev => {
        const existingRecord = prev[cef] || { 
            inscriptionStatus: 'En attente', 
            monthlyPayments: {},
            inscriptionPayment: 0
        };

        let newRecord: ParticipantFinancials;

        if (action.type === 'monthly') {
            const newPayments = { ...existingRecord.monthlyPayments };
            if (action.amount > 0) {
                newPayments[action.month] = action.amount;
            } else {
                delete newPayments[action.month];
            }
            newRecord = { ...existingRecord, monthlyPayments: newPayments };
        } else { // 'inscription'
            const participant = participants.find(p => p.cef === cef);
            if (!participant) return prev; 

            const newStatus: InscriptionStatus = action.amount >= participant.fraisInscription ? 'Payé' : 'En attente';
            newRecord = {
                ...existingRecord,
                inscriptionPayment: action.amount,
                inscriptionStatus: newStatus,
            };
        }

        return {
            ...prev,
            [cef]: newRecord
        };
    });
  };
  
  const handleSave = (context: {
    trainingYear: string;
    monthValue: string;
    monthLabel: string;
    weekIndex: number;
    weekLabel: string;
    groupValue: string;
    groupLabel: string;
    weekDates: Date[];
  }) => {
    const groupsToSave =
      context.groupValue === 'all'
        ? [...new Set(participants
            .filter(p => p.trainingYear === context.trainingYear)
            .map(p => p.groupe)
        )]
        : [context.groupValue];

    const weekDateStrings = new Set(context.weekDates.map(d => format(d, 'yyyy-MM-dd')));

    setHistory(prev => {
        let updatedHistory = [...prev];

        // FIX: The error "Type 'unknown' cannot be used as an index type" suggests `groupValue`'s type is not being inferred correctly inside the loop,
        // likely due to data from localStorage. Refactoring to forEach can help with type inference.
        groupsToSave.forEach(groupValue => {
            if (typeof groupValue !== 'string' || !groupValue) {
                // with forEach, `return` is equivalent to `continue` in a for loop
                return;
            }

            const entryId = `${context.trainingYear}-${context.monthValue}-${context.weekIndex}-${groupValue}`;

            const weekAttendance: AttendanceRecord = {};
            // FIX: With correct type inference for `groupValue` as a string, this comparison is now valid.
            // @google/genai-fix: Cast `participants` to `Participant[]` to ensure proper type inference for `p` and its properties.
            const relevantParticipants = (participants as Participant[]).filter(p => 
                p.trainingYear === context.trainingYear && p.groupe === groupValue
            );

            for (const p of relevantParticipants) {
                const cef = p.cef;
                const participantAbsences = attendance[cef];
                if (!participantAbsences) continue;

                const weekAbsencesForParticipant: Record<string, boolean> = {};
                let hasAbsencesThisWeek = false;

                for (const dateStr in participantAbsences) {
                    if (weekDateStrings.has(dateStr) && participantAbsences[dateStr] === true) {
                        weekAbsencesForParticipant[dateStr] = true;
                        hasAbsencesThisWeek = true;
                    }
                }
                if (hasAbsencesThisWeek) {
                    weekAttendance[cef] = weekAbsencesForParticipant;
                }
            }

            const existingEntryIndex = updatedHistory.findIndex(entry => entry.id === entryId);
            const weekDatesISO = context.weekDates.map(d => d.toISOString());

            if (existingEntryIndex !== -1) {
                const existingEntry = updatedHistory[existingEntryIndex];
                updatedHistory[existingEntryIndex] = {
                    ...existingEntry,
                    date: new Date().toISOString(),
                    attendance: weekAttendance,
                    weekDates: weekDatesISO,
                };
            } else {
                const newHistoryEntry: HistoryEntry = {
                    id: entryId,
                    date: new Date().toISOString(),
                    trainingYear: context.trainingYear,
                    month: context.monthLabel,
                    weekLabel: context.weekLabel,
                    group: groupValue,
                    attendance: weekAttendance,
                    weekDates: weekDatesISO,
                };
                updatedHistory.unshift(newHistoryEntry);
            }
        });
        return updatedHistory;
    });
  };

  const handleAddTrainingYear = (year: string) => {
    if (!trainingYears.includes(year)) {
      setTrainingYears(prev => [...prev, year].sort((a, b) => b.localeCompare(a)));
    }
  };

  const handleConfirmDeleteYear = () => {
    if (!yearToDelete) return;

    // 1. Identify participants and their CEFs to delete
    const participantsToDelete = participants.filter(p => p.trainingYear === yearToDelete);
    const cefsToDelete = new Set(participantsToDelete.map(p => p.cef));

    // 2. Filter all related data in a cascading manner
    setParticipants(prev => prev.filter(p => p.trainingYear !== yearToDelete));
    setHistory(prev => prev.filter(h => h.trainingYear !== yearToDelete));
    setUsers(prev => prev.filter(u => !u.participantCef || !cefsToDelete.has(u.participantCef)));
    
    setAttendance(prev => {
        const newAttendance = { ...prev };
        cefsToDelete.forEach(cef => {
            delete newAttendance[cef];
        });
        return newAttendance;
    });

    setFinancials(prev => {
        const newFinancials = { ...prev };
        cefsToDelete.forEach(cef => {
            delete newFinancials[cef];
        });
        return newFinancials;
    });
    
    setTrainingYears(prev => prev.filter(y => y !== yearToDelete));
    
    // 3. Close the modal
    setYearToDelete(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Filter data based on user role
  const visibleParticipants = currentUser.role === 'admin' 
    ? participants 
    : participants.filter(p => p.cef === currentUser.participantCef);

  const linkedParticipant = participants.find(p => p.cef === currentUser.participantCef);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'entry':
        if (currentUser.role !== 'admin') return null;
        return <EntryTab participants={visibleParticipants} attendance={attendance} onAttendanceChange={handleAttendanceChange} onSave={handleSave} trainingYears={trainingYears} />;
      case 'stats':
        return <StatisticsTab currentUser={currentUser} participants={visibleParticipants} attendance={attendance} trainingYears={trainingYears}/>;
      case 'history':
        if (currentUser.role !== 'admin') return null;
        return <HistoryTab history={history} participants={visibleParticipants} />;
      case 'receipts':
        return <ReceiptsTab currentUser={currentUser} participants={visibleParticipants} attendance={attendance} trainingYears={trainingYears} />;
      case 'financials':
        return <FinancialsTab currentUser={currentUser} participants={visibleParticipants} financials={financials} onFinancialsChange={handleFinancialsChange} trainingYears={trainingYears} />;
      case 'data':
        if (currentUser.role !== 'admin') return null;
        return <DataTab currentUser={currentUser} participants={visibleParticipants} onParticipantsImport={handleParticipantsImport} trainingYears={trainingYears} />;
      case 'accounts':
        if (currentUser.role !== 'admin') return null;
        return <AccountsTab users={users} participants={participants} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onResetPassword={handleResetPassword} trainingYears={trainingYears} />;
      case 'settings':
        if (currentUser.role !== 'admin') return null;
        return <SettingsTab trainingYears={trainingYears} onAddTrainingYear={handleAddTrainingYear} onDeleteTrainingYear={setYearToDelete} />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tab
          ? 'bg-blue-700 text-white'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
    </button>
  );
  
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="bg-gray-800 text-white min-h-screen font-sans">
        <header className="bg-gray-900 shadow-md sticky top-0 z-50 border-b border-gray-700/50">
            <div className="container mx-auto px-4 py-4">
                 <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-400 whitespace-nowrap">
                        {isAdmin ? "Suivi des Absences" : "Ma situation administrative"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <button onClick={handleLogout} className="text-sm font-medium text-blue-400 hover:text-blue-300">Déconnexion</button>
                    </div>
                </div>

                {!isAdmin && linkedParticipant && (
                    <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <h2 className="text-xl font-bold text-white">Bonjour, {linkedParticipant.prenom} {linkedParticipant.nom}</h2>
                        <p className="text-gray-300 text-sm">
                        Vous êtes dans le groupe <span className="font-semibold text-blue-400">{linkedParticipant.groupe}</span> pour l'année de formation {linkedParticipant.trainingYear}.
                        </p>
                    </div>
                )}

                 <nav className="mt-4 flex items-center gap-2 w-full overflow-x-auto pb-1 justify-start">
                    {isAdmin ? (
                        <>
                            <TabButton tab="entry" label="Saisie" icon={<EditIcon className="h-5 w-5" />} />
                            <TabButton tab="stats" label="Statistiques" icon={<BarChartIcon className="h-5 w-5"/>} />
                            <TabButton tab="history" label="Historique" icon={<HistoryIcon className="h-5 w-5"/>} />
                            <TabButton tab="receipts" label="Reçus" icon={<FileTextIcon className="h-5 w-5"/>} />
                            <TabButton tab="financials" label="Recettes" icon={<DollarSignIcon className="h-5 w-5"/>} />
                            <TabButton tab="data" label="Données" icon={<FileUpIcon className="h-5 w-5"/>} />
                            <TabButton tab="accounts" label="Comptes" icon={<UsersIcon className="h-5 w-5"/>} />
                            <TabButton tab="settings" label="Paramètres" icon={<SettingsIcon className="h-5 w-5"/>} />
                        </>
                    ) : (
                         <>
                            <TabButton tab="stats" label="Mes Absences" icon={<BarChartIcon className="h-5 w-5"/>} />
                            <TabButton tab="financials" label="Mes Paiements" icon={<DollarSignIcon className="h-5 w-5"/>} />
                         </>
                    )}
                </nav>
            </div>
        </header>

        <main className="container mx-auto px-4 py-8">
            {renderTabContent()}
        </main>
        
        <ConfirmationModal
            isOpen={!!yearToDelete}
            onClose={() => setYearToDelete(null)}
            onConfirm={handleConfirmDeleteYear}
            title="Confirmer la Suppression"
        >
            <p>Êtes-vous sûr de vouloir supprimer l'année de formation <strong>{yearToDelete}</strong> ?</p>
            <p className="mt-2 text-sm text-yellow-400">
                Cette action est irréversible et supprimera tous les participants, absences, saisies, comptes et données financières associés à cette année.
            </p>
        </ConfirmationModal>
    </div>
  );
};

export default App;
