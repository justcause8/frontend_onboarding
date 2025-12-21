import { create } from 'zustand';
import axios from 'axios';

// Настраиваем axios, чтобы он всегда отправлял куки
const api = axios.create({
    baseURL: 'https://localhost:7054', // Укажите URL вашего бэкенда
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

    // Метод WhoAmI (автоматический вход)
    fetchUser: async () => {
        try {
            const res = await api.get('/auth/whoami');
            set({ user: res.data, isLoading: false });
        } catch (err) {
            set({ user: null, isLoading: false });
            console.error("Ошибка авторизации:", err);
        }
    },

    // Метод LoginAs
    loginAs: async (login: string) => {
        try {
            set({ isLoading: true });
            const res = await api.post(`/auth/login-as?login=${login}`);
            set({ user: res.data, isLoading: false });
            // Перезагружаем страницу, чтобы обновить все данные
            window.location.reload();
        } catch (err) {
            set({ isLoading: false });
            alert("Пользователь не найден");
        }
    },

    // Метод выхода
    logout: async () => {
        try {
            set({ isLoading: true });
            await api.post('/auth/logout');
            set({ user: null, isLoading: false });
            // Перенаправляем на главную или перезагружаем
            window.location.href = '/'; 
        } catch (err) {
            set({ isLoading: false });
            console.error("Ошибка при выходе:", err);
            alert("Не удалось выйти из системы");
        }
    }
}));