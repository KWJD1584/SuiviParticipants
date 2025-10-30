import React, { useState, useMemo, useEffect } from 'react';
import type { Participant, AttendanceRecord } from '../types';
import { getCurrentTrainingYear, getMonthsForTrainingYear, getWeeksForMonth, formatWeekLabel } from '../utils/dateUtils';
import { Select } from './Select';
import { Button } from './Button';
import { AttendanceGrid } from './AttendanceGrid';

interface EntryTabProps {
  participants: Participant[];
  attendance: AttendanceRecord;
  onAttendanceChange: (participantCef: string, date: string, isAbsent: boolean) => void;
  onSave: (context: {
    trainingYear: string;
    monthValue: string;
    monthLabel: string;
    weekIndex: number;
    weekLabel: string;
    groupValue: string;
    groupLabel: string;
    weekDates: Date[];
  }) => void;
  trainingYears: string[];
}

export const EntryTab: React.FC<EntryTabProps> = ({ participants, attendance, onAttendanceChange, onSave, trainingYears }) => {
  const [selectedYear, setSelectedYear] = useState(getCurrentTrainingYear());
  
  const monthOptions = useMemo(() => getMonthsForTrainingYear(selectedYear), [selectedYear]);
  const [selectedMonth, setSelectedMonth] = useState('');
  
  const weekOptions = useMemo(() => getWeeksForMonth(selectedMonth), [selectedMonth]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!trainingYears.includes(selectedYear)) {
      const newYear = trainingYears[0] || getCurrentTrainingYear();
      setSelectedYear(newYear);
    }
  }, [trainingYears, selectedYear]);
  
  useEffect(() => {
    const newMonthOptions = getMonthsForTrainingYear(selectedYear);
    setSelectedMonth(newMonthOptions.length > 0 ? newMonthOptions[0].value : '');
    setSelectedWeekIndex(0);
  }, [selectedYear]);

  const groupOptions = useMemo(() => {
    const participantsForYear = participants.filter(p => p.trainingYear === selectedYear);
    const groups = [...new Set(participantsForYear.map(p => p.groupe))];
    return [{ value: 'all', label: 'Tous les groupes' }, ...groups.map(g => ({ value: g, label: g }))];
  }, [participants, selectedYear]);
  const [selectedGroup, setSelectedGroup] = useState('all');

  const filteredParticipants = useMemo(() => {
    const yearParticipants = participants.filter(p => p.trainingYear === selectedYear);
    if (selectedGroup === 'all') return yearParticipants;
    return yearParticipants.filter(p => p.groupe === selectedGroup);
  }, [participants, selectedGroup, selectedYear]);
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setSelectedGroup('all'); // Reset group filter
  };
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    setSelectedWeekIndex(0);
  };

  const handleSaveClick = () => {
    setIsSaving(true);
    onSave({
        trainingYear: selectedYear,
        monthValue: selectedMonth,
        monthLabel: monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth,
        weekIndex: selectedWeekIndex,
        weekLabel: formatWeekLabel(weekOptions[selectedWeekIndex]),
        groupValue: selectedGroup,
        groupLabel: groupOptions.find(g => g.value === selectedGroup)?.label || selectedGroup,
        weekDates: weekOptions[selectedWeekIndex] || [],
    });
    // Simulate async operation
    setTimeout(() => setIsSaving(false), 1000);
  };

  const participantsForCurrentYear = useMemo(() => participants.filter(p => p.trainingYear === selectedYear), [participants, selectedYear]);

  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-white">Aucun participant importé.</h3>
        <p className="mt-2 text-gray-400">Veuillez d'abord importer un fichier de participants dans l'onglet "Données".</p>
      </div>
    );
  }
  
  if (participantsForCurrentYear.length === 0) {
     return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-white">Aucun participant pour l'année {selectedYear}.</h3>
        <p className="mt-2 text-gray-400">Veuillez importer des participants pour cette année de formation dans l'onglet "Données".</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Année</label>
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            options={trainingYears.map(y => ({ value: y, label: y }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mois</label>
          <Select
            value={selectedMonth}
            onChange={handleMonthChange}
            options={monthOptions}
            disabled={monthOptions.length === 0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Groupe</label>
          <Select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            options={groupOptions}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Semaine</label>
          <Select
            value={selectedWeekIndex.toString()}
            onChange={e => setSelectedWeekIndex(parseInt(e.target.value))}
            options={weekOptions.map((week, index) => ({ value: index.toString(), label: formatWeekLabel(week) }))}
            disabled={weekOptions.length === 0}
          />
        </div>
      </div>

      <AttendanceGrid
        participants={filteredParticipants}
        attendance={attendance}
        onAttendanceChange={onAttendanceChange}
        weekDates={weekOptions[selectedWeekIndex] || []}
      />

      <div className="fixed bottom-0 inset-x-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-end">
            <Button onClick={handleSaveClick} disabled={isSaving || filteredParticipants.length === 0}>
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
        </div>
      </div>
    </div>
  );
};