import React, { useState } from 'react';
import { Button } from './Button';
import { Trash2Icon } from './icons/Icons';

interface SettingsTabProps {
  trainingYears: string[];
  onAddTrainingYear: (year: string) => void;
  onDeleteTrainingYear: (year: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ trainingYears, onAddTrainingYear, onDeleteTrainingYear }) => {
    const [newYear, setNewYear] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        if (!/^\d{4}-\d{4}$/.test(newYear)) {
            setError("Format invalide. Utilisez AAAA-AAAA (ex: 2023-2024).");
            return;
        }
        if (trainingYears.includes(newYear)) {
            setError("Cette année existe déjà.");
            return;
        }
        setError('');
        onAddTrainingYear(newYear);
        setNewYear('');
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="p-6 bg-gray-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Gérer les Années de Formation</h3>
                <div className="flex items-start gap-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-300">Ajouter une année</label>
                        <input 
                            type="text" 
                            value={newYear} 
                            onChange={e => setNewYear(e.target.value)} 
                            placeholder="ex: 2024-2025"
                            className="w-full mt-1 bg-gray-900 border border-gray-600 text-white rounded-md p-2"
                        />
                         {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
                    </div>
                    <div className="pt-6">
                         <Button onClick={handleAdd}>Ajouter</Button>
                    </div>
                </div>
            </div>
             <div className="p-6 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Années de Formation Existantes</h3>
                <ul className="space-y-2">
                    {trainingYears.map(year => (
                        <li key={year} className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-md text-white">
                           <span>{year}</span>
                           <button 
                                onClick={() => onDeleteTrainingYear(year)} 
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title={`Supprimer l'année ${year}`}
                            >
                                <Trash2Icon className="h-5 w-5" />
                           </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};