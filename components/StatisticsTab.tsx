import React, { useMemo, useState, useEffect } from 'react';
import type { Participant, AttendanceRecord, User } from '../types';
import { getDay } from 'date-fns';
import { SESSION_HOURS, ABSENCE_THRESHOLD } from '../constants';
import { getCurrentTrainingYear, getMonthsForTrainingYear } from '../utils/dateUtils';
import { Select } from './Select';
import { AlertTriangleIcon } from './icons/Icons';


interface StatisticsTabProps {
  participants: Participant[];
  attendance: AttendanceRecord;
  currentUser: User;
  trainingYears: string[];
}

interface ChartData {
    name: string;
    fullName: string;
    totalHours: number;
}

const AbsenceLineChart: React.FC<{ data: ChartData[], currentUser: User }> = ({ data, currentUser }) => {
    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const isAdmin = currentUser.role === 'admin';

    const maxHours = Math.max(...data.map(d => d.totalHours), 10); // Ensure a minimum height

    const xScale = (index: number) => margin.left + (index / (data.length > 1 ? data.length - 1 : 1)) * chartWidth;
    const yScale = (hours: number) => margin.top + chartHeight - (hours / maxHours) * chartHeight;

    const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.totalHours)}`).join(' ');

    return (
        <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-white">
                {isAdmin ? "Heures d'absence par mois" : "Mes heures d'absence par mois"}
            </h3>
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis labels */}
                {[...Array(5)].map((_, i) => {
                    const value = Math.round(maxHours * (i / 4));
                    const y = yScale(value);
                    return (
                        <g key={i}>
                            <text x={margin.left - 10} y={y + 5} textAnchor="end" fill="#9ca3af" fontSize="12">{value}h</text>
                            <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#4b5563" strokeDasharray="2,2" />
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text key={d.name} x={xScale(i)} y={height - margin.bottom + 20} textAnchor="middle" fill="#9ca3af" fontSize="12">
                        {d.name.substring(0, 3)}
                    </text>
                ))}

                {/* Line path */}
                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" />

                {/* Data points */}
                {data.map((d, i) => (
                    <circle key={d.name} cx={xScale(i)} cy={yScale(d.totalHours)} r="4" fill="#3b82f6" stroke="#1f2937" strokeWidth="2" />
                ))}
            </svg>
        </div>
    );
};


export const StatisticsTab: React.FC<StatisticsTabProps> = ({ participants, attendance, currentUser, trainingYears }) => {
  const isAdmin = currentUser.role === 'admin';
  const [selectedYear, setSelectedYear] = useState(getCurrentTrainingYear());
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedParticipantCef, setSelectedParticipantCef] = useState('all');

  useEffect(() => {
    if (!trainingYears.includes(selectedYear)) {
      setSelectedYear(trainingYears[0] || getCurrentTrainingYear());
    }
  }, [trainingYears, selectedYear]);

  const participantsForYear = useMemo(() => {
    // For users, participants are already filtered, so this will just confirm the year.
    return participants.filter(p => p.trainingYear === selectedYear);
  }, [participants, selectedYear]);

   const groupOptions = useMemo(() => {
    const groups = [...new Set(participantsForYear.map(p => p.groupe))];
    return [{ value: 'all', label: 'Tous les groupes' }, ...groups.sort().map(g => ({ value: g, label: g }))];
  }, [participantsForYear]);

  const participantOptions = useMemo(() => {
      const participantsInGroup = participantsForYear.filter(p => selectedGroup === 'all' || p.groupe === selectedGroup);
      return [
          { value: 'all', label: 'Tous les participants' },
          ...participantsInGroup.sort((a,b) => a.nom.localeCompare(b.nom)).map(p => ({ value: p.cef, label: `${p.nom} ${p.prenom}` }))
      ];
  }, [participantsForYear, selectedGroup]);
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedYear(e.target.value);
      setSelectedGroup('all');
      setSelectedParticipantCef('all');
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedGroup(e.target.value);
      setSelectedParticipantCef('all');
  };

  const filteredParticipants = useMemo(() => {
      if (!isAdmin) return participantsForYear; // User sees their own data
      
      return participantsForYear
          .filter(p => selectedGroup === 'all' || p.groupe === selectedGroup)
          .filter(p => selectedParticipantCef === 'all' || p.cef === selectedParticipantCef);
  }, [participantsForYear, selectedGroup, selectedParticipantCef, isAdmin]);

  const statistics = useMemo(() => {
    return filteredParticipants.map(participant => {
      const participantAbsences = attendance[participant.cef] || {};
      let totalAbsenceHours = 0;
      
      for (const dateStr in participantAbsences) {
        if (participantAbsences[dateStr]) {
          const dayOfWeek = getDay(new Date(dateStr));
          totalAbsenceHours += SESSION_HOURS[dayOfWeek] || 0;
        }
      }

      const absenceRate = participant.mhAnnuelleAffectee > 0 
        ? (totalAbsenceHours / participant.mhAnnuelleAffectee)
        : 0;

      return { participant, totalAbsenceHours, absenceRate };
    }).sort((a, b) => b.absenceRate - a.absenceRate); // Sort by highest absence rate
  }, [filteredParticipants, attendance]);

  const { totalHoursPlanned, totalHoursAbsent } = useMemo(() => {
    return statistics.reduce((acc, stat) => {
        acc.totalHoursPlanned += stat.participant.mhAnnuelleAffectee;
        acc.totalHoursAbsent += stat.totalAbsenceHours;
        return acc;
    }, { totalHoursPlanned: 0, totalHoursAbsent: 0 });
  }, [statistics]);

  const overallAbsenceRate = totalHoursPlanned > 0 ? (totalHoursAbsent / totalHoursPlanned) * 100 : 0;
  const rateColor = overallAbsenceRate > (ABSENCE_THRESHOLD * 100) ? 'text-red-400' : 'text-green-400';

  const monthlyAbsenceData = useMemo(() => {
    const months = getMonthsForTrainingYear(selectedYear);
    const monthlyData: ChartData[] = months.map(m => ({
      name: m.label.split(' ')[0],
      fullName: m.label,
      totalHours: 0,
    }));

    filteredParticipants.forEach(p => {
        const pAbsences = attendance[p.cef] || {};
        for (const dateStr in pAbsences) {
            if (pAbsences[dateStr]) {
                const date = new Date(dateStr);
                const monthIndex = date.getMonth();
                const year = date.getFullYear();
                
                const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                const targetMonth = months.find(m => m.value === monthKey);

                if (targetMonth) {
                    const dataEntry = monthlyData.find(md => md.fullName === targetMonth.label);
                    if (dataEntry) {
                        const dayOfWeek = getDay(date);
                        dataEntry.totalHours += SESSION_HOURS[dayOfWeek] || 0;
                    }
                }
            }
        }
    });
    return monthlyData;
  }, [filteredParticipants, attendance, selectedYear]);

  const topAbsentMonths = useMemo(() => {
      return [...monthlyAbsenceData]
          .filter(m => m.totalHours > 0)
          .sort((a, b) => b.totalHours - a.totalHours)
          .slice(0, 3);
  }, [monthlyAbsenceData]);


  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-white">Aucune donnée de participant disponible.</h3>
        {isAdmin && <p className="mt-2 text-gray-400">Veuillez d'abord importer un fichier de participants dans l'onglet "Données".</p>}
      </div>
    );
  }

  const participantsOverThreshold = statistics.filter(s => s.absenceRate > ABSENCE_THRESHOLD).length;
  const userIsOverThreshold = statistics.length > 0 && statistics[0].absenceRate > ABSENCE_THRESHOLD;

  return (
    <div className="space-y-6">
       {isAdmin && (
        <div className="p-4 bg-gray-700 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Année de Formation</label>
                <Select
                value={selectedYear}
                onChange={handleYearChange}
                options={trainingYears.map(y => ({ value: y, label: y }))}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Groupe</label>
                <Select
                value={selectedGroup}
                onChange={handleGroupChange}
                options={groupOptions}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Participant</label>
                <Select
                value={selectedParticipantCef}
                onChange={e => setSelectedParticipantCef(e.target.value)}
                options={participantOptions}
                />
            </div>
        </div>
       )}
       
       {isAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Total Participants Filtrés</h4>
                    <p className="text-2xl font-bold text-white">{filteredParticipants.length}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Total H. Prévues</h4>
                    <p className="text-2xl font-bold text-white">{Math.round(totalHoursPlanned).toLocaleString('fr-FR')}h</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Total H. d'Absence</h4>
                    <p className="text-2xl font-bold text-yellow-400">{totalHoursAbsent.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Taux d'Absentéisme</h4>
                    <p className={`text-2xl font-bold ${rateColor}`}>{overallAbsenceRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Participants en Alerte</h4>
                    <p className="text-2xl font-bold text-red-400">{participantsOverThreshold}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Seuil d'Alerte</h4>
                    <p className="text-2xl font-bold text-white">{(ABSENCE_THRESHOLD * 100).toFixed(0)}%</p>
                </div>
            </div>
       ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Mes Heures Prévues</h4>
                    <p className="text-2xl font-bold text-white">{Math.round(totalHoursPlanned).toLocaleString('fr-FR')}h</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Mes Heures d'Absence</h4>
                    <p className="text-2xl font-bold text-yellow-400">{totalHoursAbsent.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h4 className="text-sm font-medium text-gray-400">Mon Taux d'Absentéisme</h4>
                    <p className={`text-2xl font-bold ${rateColor}`}>{overallAbsenceRate.toFixed(1)}%</p>
                </div>
                <div className={`p-4 rounded-lg text-center flex flex-col justify-center items-center ${userIsOverThreshold ? 'bg-red-800' : 'bg-green-800'}`}>
                    <h4 className="text-sm font-medium text-white">Statut d'Alerte</h4>
                    <div className="flex items-center gap-2 mt-1">
                        {userIsOverThreshold && <AlertTriangleIcon className="h-6 w-6 text-white"/>}
                        <p className="text-2xl font-bold text-white">{userIsOverThreshold ? 'Oui' : 'Non'}</p>
                    </div>
                </div>
            </div>
       )}

      {!isAdmin && topAbsentMonths.length > 0 && (
        <div className="bg-gray-700 p-6 rounded-lg shadow-lg my-6">
            <h3 className="text-lg font-semibold mb-4 text-white text-center">Mes 3 mois avec le plus d'absences</h3>
            <div className="flex justify-around items-start text-center">
                {topAbsentMonths.map(month => (
                    <div key={month.fullName}>
                        <p className="text-3xl font-bold text-yellow-400">{month.totalHours.toFixed(1)}h</p>
                        <h4 className="text-sm font-medium text-gray-300 mt-1">{month.fullName}</h4>
                    </div>
                ))}
            </div>
        </div>
      )}
        
      {filteredParticipants.length > 0 && <AbsenceLineChart data={monthlyAbsenceData} currentUser={currentUser} />}

      {filteredParticipants.length > 0 && isAdmin ? (
        <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Participant</th>
                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Groupe</th>}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Heures d'absence</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Heures Annuelles</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Taux d'absence</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {statistics.map(({ participant, totalAbsenceHours, absenceRate }) => {
                const isOverThreshold = absenceRate > ABSENCE_THRESHOLD;
                const rateColor = isOverThreshold ? 'text-red-400' : 'text-green-400';

                return (
                  <tr key={participant.cef} className={`hover:bg-gray-700/50 ${isOverThreshold ? 'bg-red-900/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{participant.nom} {participant.prenom}</td>
                    {isAdmin && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{participant.groupe}</td>}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">{totalAbsenceHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">{participant.mhAnnuelleAffectee}h</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-end">
                            <span className={`text-sm font-semibold ${rateColor}`}>
                                {(absenceRate * 100).toFixed(1)}%
                            </span>
                            <div className="w-24 mt-1 bg-gray-600 rounded-full h-2">
                                <div
                                    className={`${isOverThreshold ? 'bg-red-500' : 'bg-green-500'} h-2 rounded-full`}
                                    style={{ width: `${Math.min(absenceRate * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !isAdmin ? null : (
         <div className="text-center py-12 bg-gray-900 rounded-lg">
            <h3 className="text-xl font-semibold text-white">Aucune donnée à afficher pour les filtres sélectionnés.</h3>
            {isAdmin && <p className="mt-2 text-gray-400">Modifiez les filtres ou importez des participants et saisissez des absences pour voir les statistiques.</p>}
        </div>
      )}
    </div>
  );
};