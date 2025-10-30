import React, { useState, useMemo, useEffect } from 'react';
import type { User, Participant } from '../types';
import { Button } from './Button';
import { Select } from './Select';
import { Trash2Icon, PlusCircleIcon, EyeIcon, EyeOffIcon, KeyIcon } from './icons/Icons';

interface AccountsTabProps {
  users: User[];
  participants: Participant[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  trainingYears: string[];
}

export const AccountsTab: React.FC<AccountsTabProps> = ({ users, participants, onAddUser, onDeleteUser, onResetPassword, trainingYears }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [participantCef, setParticipantCef] = useState<string>('');
  const [error, setError] = useState('');
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Filters
  const [yearFilter, setYearFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    if (yearFilter !== 'all' && !trainingYears.includes(yearFilter)) {
      setYearFilter('all');
    }
  }, [trainingYears, yearFilter]);

  const groupOptions = useMemo(() => {
    if (yearFilter === 'all') return [{ value: 'all', label: 'Tous les groupes' }];
    const groups = [...new Set(participants.filter(p => p.trainingYear === yearFilter).map(p => p.groupe))];
    return [{ value: 'all', label: 'Tous les groupes' }, ...groups.sort().map(g => ({ value: g, label: g }))];
  }, [participants, yearFilter]);

  const availableParticipants = useMemo(() => {
    const assignedCefs = users.map(u => u.participantCef);
    return participants.filter(p => !assignedCefs.includes(p.cef));
  }, [users, participants]);
  
  const filteredAndSortedUsers = useMemo(() => {
    return users
        .map(user => ({
            ...user,
            participant: participants.find(p => p.cef === user.participantCef),
        }))
        .filter(userWithData => {
            if (userWithData.role === 'admin') return true;
            if (!userWithData.participant) return false;
            
            const { participant } = userWithData;
            const nameMatch = nameFilter ? `${participant.nom} ${participant.prenom}`.toLowerCase().includes(nameFilter.toLowerCase()) : true;
            const yearMatch = yearFilter !== 'all' ? participant.trainingYear === yearFilter : true;
            const groupMatch = groupFilter !== 'all' ? participant.groupe === groupFilter : true;
            
            return nameMatch && yearMatch && groupMatch;
        })
        .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, participants, yearFilter, groupFilter, nameFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Le nom d'utilisateur et le mot de passe sont requis.");
      return;
    }
    if (role === 'user' && !participantCef) {
      setError('Un participant doit être lié à un compte utilisateur.');
      return;
    }
    setError('');
    onAddUser({
      username,
      password,
      role,
      participantCef: role === 'user' ? participantCef : undefined,
    });
    // Reset and hide form
    setUsername('');
    setPassword('');
    setRole('user');
    setParticipantCef('');
    setIsFormVisible(false);
  };

  const togglePasswordVisibility = (userId: string) => {
      setVisiblePasswords(prev => ({...prev, [userId]: !prev[userId]}));
  };

  return (
    <div className="space-y-8">
      {isFormVisible && (
        <div className="p-6 bg-gray-700 rounded-lg max-w-2xl">
          <h3 className="text-xl font-semibold mb-4">Ajouter un Nouveau Compte</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Nom d'utilisateur</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-600 text-white rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Mot de passe</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-600 text-white rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Rôle</label>
                    <Select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} options={[{ value: 'user', label: 'Utilisateur' }, { value: 'admin', label: 'Administrateur' }]} />
                </div>
                {role === 'user' && (
                <div>
                    <label className="block text-sm font-medium text-gray-300">Lier au Participant</label>
                    <Select value={participantCef} onChange={e => setParticipantCef(e.target.value)} options={[{ value: '', label: 'Sélectionner...' }, ...availableParticipants.map(p => ({ value: p.cef, label: `${p.nom} ${p.prenom}` }))]} />
                </div>
                )}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-4">
                <Button type="submit">Ajouter le Compte</Button>
                <Button type="button" onClick={() => setIsFormVisible(false)} className="bg-gray-600 hover:bg-gray-500">Annuler</Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Liste des Comptes</h3>
            {!isFormVisible && (
                <Button onClick={() => setIsFormVisible(true)}>
                    <PlusCircleIcon className="h-5 w-5 mr-2"/>
                    Nouveau Compte
                </Button>
            )}
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg mb-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Année</label>
                <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)} options={[{value: 'all', label: 'Toutes les années'}, ...trainingYears.map(y => ({ value: y, label: y }))]}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Groupe</label>
                <Select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} options={groupOptions}/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom du participant</label>
                <input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Rechercher..." className="w-full mt-1 bg-gray-900 border border-gray-600 text-white rounded-md p-2" />
            </div>
        </div>

        <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nom d'utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Mot de Passe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Participant Lié</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredAndSortedUsers.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <span>{visiblePasswords[user.id] ? user.password : '••••••••'}</span>
                             {user.password && (
                                <button onClick={() => togglePasswordVisibility(user.id)} className="text-gray-400 hover:text-white">
                                    {visiblePasswords[user.id] ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                             )}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.participant ? `${user.participant.nom} ${user.participant.prenom}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {user.role !== 'admin' && (
                        <div className="flex items-center justify-end gap-4">
                            <button onClick={() => onResetPassword(user.id)} className="text-blue-400 hover:text-blue-600" title="Réinitialiser le mot de passe">
                                <KeyIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDeleteUser(user.id)} className="text-red-400 hover:text-red-600" title="Supprimer le compte">
                                <Trash2Icon className="h-5 w-5" />
                            </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};