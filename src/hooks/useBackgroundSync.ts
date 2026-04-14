import { useEffect } from 'react';
import { userService } from '../services/user.service';

const INTERVALS = {
    rimsUsers: 5 * 60 * 1000, // 5 минут
} as const;

export function useBackgroundSync() {
    useEffect(() => {
        const syncUsers = async () => {
            try {
                await userService.syncAllFromRims();
            } catch {
            }
        };

        syncUsers();

        const id = setInterval(syncUsers, INTERVALS.rimsUsers);
        return () => clearInterval(id);
    }, []);
}
