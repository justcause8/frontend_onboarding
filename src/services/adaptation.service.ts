
export type AdaptationStatus = 'active' | 'archived' | 'draft';

export interface AdaptationRoute {
  id: number;
  title: string;
  status: AdaptationStatus;
  createdAt?: string;
}

// 2. Имитация задержки сети
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const mockRoutes: AdaptationRoute[] = [
  { id: 1, title: 'Адаптационный маршрут для отдела разработки', status: 'active' },
  { id: 2, title: 'Адаптационный маршрут для отдела развития веб-решений', status: 'archived' },
  { id: 3, title: 'Маршрут для менеджеров', status: 'draft' },
];

export const adaptationService = {
  // GET: Получить все маршруты
  getAllRoutes: async (): Promise<AdaptationRoute[]> => {
    await delay(600); // Имитация загрузки
    // TODO: Здесь будет return api.get('/admin/routes');
    return [...mockRoutes];
  },

  // POST: Создать новый
  createRoute: async (title: string): Promise<AdaptationRoute> => {
    await delay(400);
    const newRoute: AdaptationRoute = {
      id: Date.now(),
      title,
      status: 'draft',
    };

    return newRoute;
  },

  // DELETE: Удалить
  deleteRoute: async (id: number): Promise<void> => {
    await delay(300);
    // TODO: api.delete(`/admin/routes/${id}`);
    console.log(`Deleted ${id}`);
  },
  
  // UPDATE: Изменить статус или название
  updateRoute: async (id: number, data: Partial<AdaptationRoute>): Promise<void> => {
      await delay(300);
      // TODO: api.patch(`/admin/routes/${id}`, data);
      console.log(`Updated ${id}`, data);
  }
};