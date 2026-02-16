import { api } from '../api/api';

export interface Material {
  id: number;
  urlDocument: string;
  title: string;
  isExternalLink: boolean;
  category?: string;
}

export const materialService = {
  /** Получить общие материалы (ресурсы) */
  async getGeneralMaterials(): Promise<Material[]> {
    const res = await api.get<Material[]>('/onboarding/materials/general');
    return res.data;
  },

  /** Создать новую запись о материале в БД */
  async createMaterial(data: Partial<Material>): Promise<void> {
    await api.post('/onboarding/material', data);
  },

  async updateMaterial(id: number, data: Partial<Material>): Promise<void> {
    await api.put(`/onboarding/material/${id}`, data);
  },

  /** Сформировать URL для скачивания файла */
  getFileUrl(relativePath: string): string {
    const baseUrl = api.defaults.baseURL;
    return `${baseUrl}/Files/download?path=${encodeURIComponent(relativePath)}`;
  },

  /** Загрузить физический файл на сервер */
  async uploadFile(file: File, subFolder: string = 'Materials'): Promise<{ relativePath: string, fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(`/Files/upload?subFolder=${subFolder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /** Удалить материал из БД */
  async deleteMaterial(id: number): Promise<void> {
    await api.delete(`/onboarding/material/${id}`);
  },
};