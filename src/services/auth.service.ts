import { api } from '../api/api'

export interface UserDto {
    name: string;
    login: string;
    role: string;
}

export const authService = {
    async whoAmI(): Promise<UserDto> {
        const res = await api.get(`auth/whoami`);
        return res.data;
    },

    async loginAs(login: string): Promise<UserDto> {
        const res = await api.post(`auth/login-as?login=${login}`);
        return res.data;
    },

    async logout(): Promise<void> {
        await api.post(`auth/logout`);
    }
};