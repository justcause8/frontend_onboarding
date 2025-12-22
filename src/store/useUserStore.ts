import { create } from 'zustand';
import axios from 'axios';

// Экспортируем api, чтобы использовать в других компонентах
export const api = axios.create({
    baseURL: 'https://localhost:7054',
    withCredentials: true 
});

interface User {
    name: string;
    login: string;
    role: string;
}

interface UserState {
    user: User | null;
    isLoading: boolean;
    fetchUser: () => Promise<void>;
    loginAs: (login: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    isLoading: true,

    fetchUser: async () => {
        try {
            const res = await api.get('/auth/whoami');
            set({ user: res.data, isLoading: false });
        } catch (err) {
            set({ user: null, isLoading: false });
            console.error("Ошибка авторизации:", err);
        }
    },

    loginAs: async (login: string) => {
        try {
            set({ isLoading: true });
            const res = await api.post(`/auth/login-as?login=${login}`);
            set({ user: res.data, isLoading: false });
            window.location.reload();
        } catch (err) {
            set({ isLoading: false });
            alert("Пользователь не найден");
        }
    },

    logout: async () => {
        try {
            set({ isLoading: true });
            await api.post('/auth/logout');
            set({ user: null, isLoading: false });
            window.location.href = '/'; 
        } catch (err) {
            set({ isLoading: false });
            console.error("Ошибка при выходе:", err);
            alert("Не удалось выйти из системы");
        }
    }
}));