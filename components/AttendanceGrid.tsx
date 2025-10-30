import React from 'react';
import type { Participant, AttendanceRecord } from '../types';
import { format, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SESSION_HOURS, ABSENCE_THRESHOLD } from '../constants';
import { AlertTriangleIcon } from './icons/Icons';

interface AttendanceGridProps {
  participants: Participant[];
  attendance: AttendanceRecord;
  onAttendanceChange: (participantCef: string, date: string, isAbsent: boolean) => void;
  weekDates: Date[];
}

const AttendanceCheckbox = ({ checked, onChange }: { checked: boolean, onChange: (isChecked: boolean) => void }) => {
    return (
        <div className="flex items-center justify-center h-full">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600 focus:ring-2 cursor-pointer"
            />
        </div>
    );
};


export const AttendanceGrid: React.FC<AttendanceGridProps> = ({ participants, attendance, onAttendanceChange, weekDates }) => {
    
    const calculateAbsenceRate = (participant: Participant): number => {
        const participantAbsences = attendance[participant.cef] || {};
        let totalAbsenceHours = 0;
        
        for (const dateStr in participantAbsences) {
            if (participantAbsences[dateStr]) { // if absent
                const dayOfWeek = getDay(new Date(dateStr));
                totalAbsenceHours += SESSION_HOURS[dayOfWeek] || 0;
            }
        }

        if (!participant.mhAnnuelleAffectee || participant.mhAnnuelleAffectee === 0) return 0;
        return (totalAbsenceHours / participant.mhAnnuelleAffectee);
    };
    
  return (
    <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg max-h-[60vh]">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800 sticky top-0 z-20">
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-800 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider z-10">
              Participant
            </th>
            {weekDates.map(date => (
              <th key={date.toISOString()} scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                <span className="block capitalize">{format(date, 'eee', { locale: fr })}</span>
                <span className="block font-normal">{format(date, 'dd/MM', { locale: fr })}</span>
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Taux Abs.
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {participants.map((participant) => {
            const absenceRate = calculateAbsenceRate(participant);
            const isOverThreshold = absenceRate > ABSENCE_THRESHOLD;
            const rateColor = isOverThreshold ? 'text-red-400' : 'text-green-400';
            const nameColor = isOverThreshold ? 'text-red-400 font-bold' : 'text-white';
            const rowBg = isOverThreshold ? 'bg-red-900/20 hover:bg-red-900/40' : 'hover:bg-gray-700/50'

            return (
              <tr key={participant.cef} className={rowBg}>
                <td className="sticky left-0 bg-gray-800 px-6 py-4 whitespace-nowrap z-10">
                   <div className="flex items-center gap-2">
                    {isOverThreshold && <AlertTriangleIcon className="h-5 w-5 text-red-500 shrink-0" />}
                    <div>
                      <div className={`text-sm font-medium ${nameColor}`}>{participant.nom} {participant.prenom}</div>
                      <div className="text-xs text-gray-400">{participant.cef}</div>
                    </div>
                  </div>
                </td>
                {weekDates.map(date => {
                  const dateString = format(date, 'yyyy-MM-dd');
                  const isAbsent = attendance[participant.cef]?.[dateString] || false;
                  return (
                    <td key={dateString} className="px-4 py-2 whitespace-nowrap text-center">
                        <AttendanceCheckbox
                            checked={isAbsent}
                            onChange={(isChecked) => onAttendanceChange(participant.cef, dateString, isChecked)}
                        />
                    </td>
                  );
                })}
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${rateColor}`}>
                    {(absenceRate * 100).toFixed(1)}%
                </td>
              </tr>
            )
          })}
           {participants.length === 0 && (
            <tr>
              <td colSpan={weekDates.length + 2} className="text-center py-8 text-gray-400">
                Aucun participant pour ce groupe.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
