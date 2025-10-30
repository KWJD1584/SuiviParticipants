import React, { useState, useMemo, useEffect } from 'react';
import type { Participant, AttendanceRecord, User } from '../types';
import { getDay, format, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SESSION_HOURS } from '../constants';
import { Select } from './Select';
import { Button } from './Button';
import { getCurrentTrainingYear } from '../utils/dateUtils';

interface ReceiptsTabProps {
  participants: Participant[];
  attendance: AttendanceRecord;
  currentUser: User;
  trainingYears: string[];
}

export const ReceiptsTab: React.FC<ReceiptsTabProps> = ({ participants, attendance, currentUser, trainingYears }) => {
  const isAdmin = currentUser.role === 'admin';
  
  const [selectedCef, setSelectedCef] = useState<string>(!isAdmin ? currentUser.participantCef || '' : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(getCurrentTrainingYear());
  const [selectedGroup, setSelectedGroup] = useState('all');
  
  useEffect(() => {
    if (!isAdmin) {
      setSelectedCef(currentUser.participantCef || '');
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!trainingYears.includes(selectedYear)) {
      setSelectedYear(trainingYears[0] || getCurrentTrainingYear());
    }
  }, [trainingYears, selectedYear]);

  const participantsForYear = useMemo(() => participants.filter(p => p.trainingYear === selectedYear), [participants, selectedYear]);
  
  const groupOptions = useMemo(() => {
    const groups = [...new Set(participantsForYear.map(p => p.groupe))];
    return [{ value: 'all', label: 'Tous les groupes' }, ...groups.sort().map(g => ({ value: g, label: g }))];
  }, [participantsForYear]);

  const participantOptions = useMemo(() => {
    const participantsInGroup = participantsForYear.filter(p => selectedGroup === 'all' || p.groupe === selectedGroup);
    return [
      { value: '', label: 'Sélectionner un participant' },
      ...participantsInGroup
          .sort((a,b) => a.nom.localeCompare(b.nom))
          .map(p => ({ value: p.cef, label: `${p.nom} ${p.prenom}` }))
    ]
  }, [participantsForYear, selectedGroup]);

  const selectedParticipant = participants.find(p => p.cef === selectedCef);

  const receiptData = useMemo(() => {
    if (!selectedParticipant || !startDate || !endDate) return null;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    const interval = { start, end };
    
    const participantAbsences = attendance[selectedParticipant.cef] || {};
    
    const absencesInPeriod = Object.entries(participantAbsences)
        .filter(([dateStr, isAbsent]) => isAbsent && isWithinInterval(parseISO(dateStr), interval))
        .map(([dateStr]) => ({
            date: parseISO(dateStr),
            hours: SESSION_HOURS[getDay(parseISO(dateStr))] || 0,
        }))
        .sort((a,b) => a.date.getTime() - b.date.getTime());

    const totalHours = absencesInPeriod.reduce((sum, abs) => sum + abs.hours, 0);

    return {
        participant: selectedParticipant,
        trainingYear: selectedParticipant.trainingYear,
        startDate: format(start, 'dd/MM/yyyy'),
        endDate: format(end, 'dd/MM/yyyy'),
        absences: absencesInPeriod,
        totalHours: totalHours,
    };
  }, [selectedParticipant, startDate, endDate, attendance]);
  
  const handleExportPdf = () => {
    if (!receiptData) return;

    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("Attestation d'Absences", 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);

    // Participant Info
    doc.text(`Participant: ${receiptData.participant.nom} ${receiptData.participant.prenom}`, 14, 40);
    doc.text(`CEF: ${receiptData.participant.cef}`, 14, 46);
    doc.text(`Groupe: ${receiptData.participant.groupe}`, 14, 52);
    doc.text(`Année de Formation: ${receiptData.trainingYear}`, 14, 58);

    // Period Info
    doc.text(`Période du: ${receiptData.startDate}`, 196, 40, { align: 'right' });
    doc.text(`Au: ${receiptData.endDate}`, 196, 46, { align: 'right' });

    // Table
    if (receiptData.absences.length > 0) {
        const head = [['Date', 'Jour', "Heures d'absence"]];
        const body = receiptData.absences.map(abs => [
            format(abs.date, 'dd/MM/yyyy'),
            format(abs.date, 'eeee', { locale: fr }),
            `${abs.hours.toFixed(1)}h`
        ]);
        body.push([
            { content: "Total des heures d'absence", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `${receiptData.totalHours.toFixed(1)}h`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]);

        // @ts-ignore
        doc.autoTable({
            head,
            body,
            startY: 70,
            theme: 'grid',
            headStyles: { halign: 'center', fontStyle: 'bold' },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'left' },
                2: { halign: 'right' },
            }
        });
    } else {
        doc.text("Aucune absence enregistrée pour cette période.", 105, 80, { align: 'center' });
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Fait le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 14, pageHeight - 10);
    
    const participantName = `${receiptData.participant.nom}_${receiptData.participant.prenom}`.replace(/ /g, '_');
    const filename = `Attestation_Absences_${participantName}.pdf`;
    doc.save(filename);
  };


  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-700 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 col-span-2 gap-4 items-end">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Année de formation</label>
                    <Select 
                        options={trainingYears.map(y => ({ value: y, label: y }))} 
                        value={selectedYear} 
                        onChange={e => {
                            setSelectedYear(e.target.value);
                            setSelectedGroup('all');
                            setSelectedCef('');
                        }}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Groupe</label>
                    <Select 
                        options={groupOptions} 
                        value={selectedGroup} 
                        onChange={e => {
                            setSelectedGroup(e.target.value);
                            setSelectedCef(''); // Reset participant selection
                        }}
                    />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Participant</label>
                <Select options={participantOptions} value={selectedCef} onChange={e => setSelectedCef(e.target.value)} />
                </div>
            </div>
        )}
        <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-1">Date de début</label>
            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white rounded-md shadow-sm p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-1">Date de fin</label>
            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-900 border border-gray-600 text-white rounded-md shadow-sm p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
      </div>

      {receiptData && (
        <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
            <div id="receipt-content" className="bg-white text-gray-900 p-8 rounded">
                <h2 className="text-2xl font-bold text-center mb-4">Attestation d'Absences</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <p><strong>Année de Formation:</strong> {receiptData.trainingYear}</p>
                        <p><strong>Groupe:</strong> {receiptData.participant.groupe}</p>
                        <p className="mt-2"><strong>Participant:</strong> {receiptData.participant.nom} {receiptData.participant.prenom}</p>
                        <p><strong>CEF:</strong> {receiptData.participant.cef}</p>
                    </div>
                    <div className="md:text-right">
                        <p><strong>Période du:</strong> {receiptData.startDate}</p>
                        <p><strong>Au:</strong> {receiptData.endDate}</p>
                    </div>
                </div>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">Détail des absences</h3>
                {receiptData.absences.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{borderCollapse: 'collapse'}}>
                            <thead>
                                <tr>
                                    <th className="p-2 border-b text-center">Date</th>
                                    <th className="p-2 border-b text-center">Jour</th>
                                    <th className="p-2 border-b text-center">Heures d'absence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receiptData.absences.map((abs, i) => (
                                    <tr key={i}>
                                        <td className="p-2">{format(abs.date, 'dd/MM/yyyy')}</td>
                                        <td className="p-2 capitalize">{format(abs.date, 'eeee', { locale: fr })}</td>
                                        <td className="p-2 text-right">{abs.hours.toFixed(1)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2} className="p-2 text-right font-bold border-t">Total des heures d'absence</td>
                                    <td className="p-2 text-right font-bold border-t">{receiptData.totalHours.toFixed(1)}h</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-4">Aucune absence enregistrée pour cette période.</p>
                )}
                 <div className="mt-12 text-sm text-gray-600">
                    <p>Fait le {format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleExportPdf} disabled={!receiptData}>Exporter PDF</Button>
            </div>
        </div>
      )}
    </div>
  );
};