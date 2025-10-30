import React, { useState, useMemo } from 'react';
import type { HistoryEntry, Participant } from '../types';
import { Button } from './Button';
import { PrinterIcon, ChevronDownIcon } from './icons/Icons';
import { getDay, format } from 'date-fns';
import { SESSION_HOURS } from '../constants';
import { getMonthsForTrainingYear, getWeeksForMonth, formatWeekLabel } from '../utils/dateUtils';


interface HistoryTabProps {
  history: HistoryEntry[];
  participants: Participant[];
}

type GroupedHistory = Record<string, Record<string, Record<string, HistoryEntry[]>>>;

// Component for the detailed monthly summary table
const MonthlySummaryTable: React.FC<{ year: string; monthLabel: string; group: string; entries: HistoryEntry[], participants: Participant[] }> = ({ year, monthLabel, group, entries, participants }) => {
    const summaryData = useMemo(() => {
        const allMonthsForYear = getMonthsForTrainingYear(year);
        const currentMonth = allMonthsForYear.find(m => m.label === monthLabel);
        if (!currentMonth) return { weeks: [], participantStats: [] };

        const allWeeksForMonth = getWeeksForMonth(currentMonth.value);
        if (allWeeksForMonth.length === 0) return { weeks: [], participantStats: [] };

        const allParticipantsInGroup = participants
            .filter(p => p.trainingYear === year && p.groupe === group)
            .sort((a, b) => a.nom.localeCompare(b.nom));

        const participantStats = allParticipantsInGroup.map(participant => {
            const weeklyAbsenceHours = allWeeksForMonth.map(week => {
                const weekLabel = formatWeekLabel(week);
                const entryForWeek = entries.find(e => e.weekLabel === weekLabel);
                
                if (!entryForWeek) return 0;
                
                let hours = 0;
                const participantAttendance = entryForWeek.attendance[participant.cef];
                if (participantAttendance) {
                    for (const dateStr in participantAttendance) {
                        if (participantAttendance[dateStr]) {
                             const dayOfWeek = getDay(new Date(dateStr));
                             hours += SESSION_HOURS[dayOfWeek] || 0;
                        }
                    }
                }
                return hours;
            });
            const totalHours = weeklyAbsenceHours.reduce((sum, h) => sum + h, 0);
            return {
                cef: participant.cef, nom: participant.nom, prenom: participant.prenom, groupe: participant.groupe, weeklyAbsenceHours, totalHours,
            };
        });

        return { 
            weeks: allWeeksForMonth.map(w => ({ label: formatWeekLabel(w) })),
            participantStats 
        };
    }, [year, monthLabel, group, entries, participants]);

    const { weeks, participantStats } = summaryData;

    return (
        <div className="overflow-x-auto p-2">
            <table className="min-w-full text-sm">
                <thead className="border-b border-gray-600">
                    <tr>
                        <th className="px-3 py-2 text-left font-semibold">Participant</th>
                        {weeks.map((w, index) => (
                            <th key={w.label} className="px-3 py-2 text-center font-semibold" title={w.label}>
                                S{index + 1} <span className="text-xs font-normal text-gray-400">({w.label.split(' ')[2]})</span>
                            </th>
                        ))}
                        <th className="px-3 py-2 text-right font-semibold">Total Mois</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {participantStats.map(p => (
                        <tr key={p.cef}>
                            <td className="px-3 py-2 whitespace-nowrap">{p.nom} {p.prenom}</td>
                            {p.weeklyAbsenceHours.map((h, i) => (
                                <td key={i} className={`px-3 py-2 text-center ${h > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                    {h.toFixed(1)}h
                                </td>
                            ))}
                            <td className={`px-3 py-2 text-right font-bold ${p.totalHours > 0 ? 'text-yellow-300' : 'text-gray-200'}`}>
                                {p.totalHours.toFixed(1)}h
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export const HistoryTab: React.FC<HistoryTabProps> = ({ history, participants }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportPdf = (year: string, monthLabel: string, group: string, entries: HistoryEntry[], participants: Participant[]) => {
    // Re-calculate summary data using the same robust logic as the display component
    const allMonthsForYear = getMonthsForTrainingYear(year);
    const currentMonth = allMonthsForYear.find(m => m.label === monthLabel);
    if (!currentMonth) return;

    const allWeeksForMonth = getWeeksForMonth(currentMonth.value);
    const allParticipantsInGroup = participants.filter(p => p.trainingYear === year && p.groupe === group).sort((a, b) => a.nom.localeCompare(b.nom));

    const participantStats = allParticipantsInGroup.map(participant => {
        const weeklyAbsenceHours = allWeeksForMonth.map(week => {
            const weekLabel = formatWeekLabel(week);
            const entryForWeek = entries.find(e => e.weekLabel === weekLabel);
            if (!entryForWeek) return 0;
            let hours = 0;
            const participantAttendance = entryForWeek.attendance[participant.cef];
            if (participantAttendance) {
                for (const dateStr in participantAttendance) {
                    if (participantAttendance[dateStr]) {
                        const dayOfWeek = getDay(new Date(dateStr));
                        hours += SESSION_HOURS[dayOfWeek] || 0;
                    }
                }
            }
            return hours;
        });
        const totalHours = weeklyAbsenceHours.reduce((sum, h) => sum + h, 0);
        return {
            nom: participant.nom,
            prenom: participant.prenom,
            weeklyAbsenceHours,
            totalHours,
        };
    });

    // PDF Generation
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text(`Récapitulatif Mensuel des Absences`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Année: ${year} | Mois: ${monthLabel} | Groupe: ${group}`, 14, 30);

    const head = [['Participant', ...allWeeksForMonth.map((w, i) => `S${i + 1}`), 'Total Mois']];
    const body = participantStats.map(p => [
        `${p.nom} ${p.prenom}`,
        ...p.weeklyAbsenceHours.map(h => `${h.toFixed(1)}h`),
        `${p.totalHours.toFixed(1)}h`
    ]);
    
    const weekColumnCount = allWeeksForMonth.length;
    const columnStyles: { [key: number]: any } = {
        0: { halign: 'left' }, // Participant
    };

    // Apply center alignment to all week columns and the total column
    for (let i = 1; i <= weekColumnCount + 1; i++) {
        columnStyles[i] = { halign: 'center', valign: 'middle' };
    }


    // @ts-ignore
    doc.autoTable({
        head,
        body,
        startY: 40,
        theme: 'grid',
        headStyles: { halign: 'center', valign: 'middle' },
        columnStyles: columnStyles,
    });
    
    const now = new Date();
    const dateStr = format(now, 'yyyy-MM-dd_HH-mm');
    const safeMonth = monthLabel.replace(/ /g, '_');
    const filename = `Historique_${year}_${safeMonth}_${dateStr}.pdf`;

    doc.save(filename);
  };

  const groupedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .reduce((acc, entry) => {
        const { trainingYear, month, group } = entry;
        if (!acc[trainingYear]) acc[trainingYear] = {};
        if (!acc[trainingYear][month]) acc[trainingYear][month] = {};
        if (!acc[trainingYear][month][group]) acc[trainingYear][month][group] = [];
        acc[trainingYear][month][group].push(entry);
        return acc;
      }, {} as GroupedHistory);
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-white">Aucun historique de saisie.</h3>
        <p className="mt-2 text-gray-400">Les saisies sauvegardées apparaîtront ici.</p>
      </div>
    );
  }

  const sortedYears = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {sortedYears.map((year) => {
        const months = groupedHistory[year];
        const isYearOpen = !!openSections[year];
        
        return (
          <div key={year} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <button
              onClick={() => toggleSection(year)}
              className="w-full flex justify-between items-center text-left p-4 bg-gray-700/50 hover:bg-gray-700 transition-colors"
            >
              <span className="text-lg font-bold text-blue-300">Année de formation {year}</span>
              <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
            </button>
            {isYearOpen && (
              <div className="p-4 space-y-3">
                {Object.keys(months).map((month) => {
                  const groups = months[month];
                  const monthKey = `${year}-${month}`;
                  const isMonthOpen = !!openSections[monthKey];
                  return (
                    <div key={monthKey} className="bg-gray-900/50 rounded-md overflow-hidden">
                      <button
                        onClick={() => toggleSection(monthKey)}
                        className="w-full flex justify-between items-center text-left p-3 hover:bg-gray-900 transition-colors"
                      >
                        <span className="font-semibold text-white">{month}</span>
                        <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isMonthOpen && (
                        <div className="px-2 pb-2">
                           <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="border-b border-gray-700">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Groupe</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Dernière Saisie</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.keys(groups).sort().map((group) => {
                                    const entries = groups[group];
                                    const lastModified = new Date(Math.max(...entries.map(e => new Date(e.date).getTime())));
                                    const rowKey = `${year}-${month}-${group}`;
                                    const isExpanded = expandedKey === rowKey;
                                    
                                    return (
                                      <React.Fragment key={rowKey}>
                                        <tr className="hover:bg-gray-800/60">
                                          <td className="px-4 py-3 whitespace-nowrap font-bold text-white">{group}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{lastModified.toLocaleString('fr-FR')}</td>
                                          <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button onClick={() => setExpandedKey(isExpanded ? null : rowKey)}>
                                                {isExpanded ? 'Masquer' : 'Afficher le récapitulatif'}
                                              </Button>
                                              <Button onClick={() => handleExportPdf(year, month, group, entries, participants)}>
                                                <PrinterIcon className="h-4 w-4 mr-2" />
                                                Exporter PDF
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                        {isExpanded && (
                                           <tr>
                                               <td colSpan={3} className="bg-gray-900">
                                                    <MonthlySummaryTable year={year} monthLabel={month} group={group} entries={entries} participants={participants} />
                                               </td>
                                           </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};