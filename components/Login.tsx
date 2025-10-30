import React, { useState } from 'react';
import { Button } from './Button';
import { LogoIcon, UserIcon, LockIcon } from './icons/Icons';

interface LoginProps {
  onLogin: (username: string, password_input: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Nom d\'utilisateur ou mot de passe incorrect.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <div className="p-10 bg-gray-800/80 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
            <LogoIcon className="h-16 w-16 text-blue-500"/>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenue
        </h1>
        <p className="text-gray-400 mb-8">Veuillez vous connecter pour accéder à votre espace.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
             <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"/>
            <input
              id="username"
              type="text"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg shadow-sm p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="relative">
            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"/>
            <input
              id="password-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg shadow-sm p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          {error && <p className="text-sm text-red-400 animate-pulse">{error}</p>}
          <Button type="submit" fullWidth className="py-3 text-base font-semibold transition-transform transform hover:scale-105">
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
};