import type { User } from './types';

export const mockUsers: User[] = [
    {
        id: 'admin-001',
        username: 'admin',
        password: 'password', // Dans une application réelle, ce mot de passe serait haché
        role: 'admin',
    },
    {
        id: 'user-001',
        username: 'jdupont',
        password: 'password',
        role: 'user',
        participantCef: 'P123456', // Jean Dupont from mockParticipants
    }
];
