import { create } from 'zustand';
import { authService } from '../services/auth.service';
import type { UserDto } from '../services/auth.service';


interface UserState {
    user: UserDto | null;
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
            const user = await authService.whoAmI();
            set({ user, isLoading: false });
        } catch {
            set({ user: null, isLoading: false });
        }
    },

    loginAs: async (login) => {
        try{
            set({ isLoading: true });
            const user = await authService.loginAs(login);
            set({ user, isLoading: false });
        } catch {
            set({ isLoading: false });
            alert('Пользователь не найден');
        }
    },

    logout: async () => {
        try{
            set({ isLoading: true });
            await authService.logout();
            set({ user: null, isLoading: false });
            window.location.href = '/';
        } catch {
            set({ isLoading: false });
            alert('Ошибка входа');
        }
    },
}));