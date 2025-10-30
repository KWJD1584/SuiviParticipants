import React, { useState, useMemo, useEffect } from 'react';
import type { Participant, User } from '../types';
import { Button } from './Button';
import { Select } from './Select';
import { getCurrentTrainingYear } from '../utils/dateUtils';

interface DataTabProps {
  participants: Participant[];
  onParticipantsImport: (newParticipants: Participant[], trainingYear: string) => void;
  currentUser: User;
  trainingYears: string[];
}

export const DataTab: React.FC<DataTabProps> = ({ participants, onParticipantsImport, currentUser, trainingYears }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(getCurrentTrainingYear());

  useEffect(() => {
    if (!trainingYears.includes(selectedYear)) {
      setSelectedYear(trainingYears[0] || getCurrentTrainingYear());
    }
  }, [trainingYears, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const header = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = ['cef', 'nom', 'prenom', 'groupe', 'mhAnnuelleAffectee', 'fraisInscription', 'fraisFormation'];
        
        if (expectedHeaders.some(h => !header.includes(h))) {
            setError(`En-têtes manquants ou incorrects. Attendu: ${expectedHeaders.join(', ')}`);
            return;
        }

        const importedParticipants: Participant[] = rows.slice(1).map(row => {
          const values = row.split(',');
          const participant: any = {};
          header.forEach((key, index) => {
            const value = values[index]?.trim().replace(/"/g, '');
            if (['mhAnnuelleAffectee', 'fraisInscription', 'fraisFormation'].includes(key)) {
              participant[key] = parseFloat(value) || 0;
            } else {
              participant[key] = value;
            }
          });
          return { ...participant, trainingYear: selectedYear } as Participant;
        });

        onParticipantsImport(importedParticipants, selectedYear);
        setFile(null); // Reset file input
      } catch (err) {
        setError("Erreur lors de la lecture du fichier. Assurez-vous que c'est un CSV valide.");
        console.error(err);
      }
    };
    reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier.");
    }
    reader.readAsText(file);
  };
  
  const handleExport = () => {
    const participantsToExport = participants.filter(p => p.trainingYear === selectedYear);
    if (participantsToExport.length === 0) return;

    const dataForCsv = participantsToExport.map(p => {
        const { trainingYear, ...rest } = p;
        return rest;
    });

    const header = Object.keys(dataForCsv[0]).join(',');
    const rows = dataForCsv.map(p => Object.values(p).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `participants_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => p.trainingYear === selectedYear);
  }, [participants, selectedYear]);

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-700 rounded-lg max-w-md">
        <label className="block text-sm font-medium text-gray-300 mb-1">Année de Formation</label>
        <Select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          options={trainingYears.map(y => ({ value: y, label: y }))}
        />
        {isAdmin && (
            <p className="text-xs text-gray-400 mt-2">
            Sélectionnez l'année pour laquelle vous souhaitez gérer les données des participants.
            </p>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Importer des Participants ({selectedYear})</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Le fichier CSV doit contenir les colonnes : cef, nom, prenom, groupe, mhAnnuelleAffectee, fraisInscription, fraisFormation.
                </p>
                <div className="flex items-center gap-4">
                    <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    <Button onClick={handleImport} disabled={!file}>Importer</Button>
                </div>
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>
            <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Exporter les Participants ({selectedYear})</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Exporter la liste des participants pour l'année sélectionnée au format CSV.
                </p>
                <Button onClick={handleExport} disabled={filteredParticipants.length === 0}>Exporter en CSV</Button>
            </div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Participants ({filteredParticipants.length}) - Année {selectedYear}</h3>
        <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">CEF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prénom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Groupe</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredParticipants.map(p => (
                <tr key={p.cef} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{p.cef}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{p.nom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{p.prenom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{p.groupe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};