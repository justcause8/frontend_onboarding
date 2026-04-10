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
    // Нормализуем путь: убираем ведущий слеш и заменяем обратные слеши
    const normalizedPath = relativePath
      .replace(/\\/g, '/')
      .replace(/^\//, '');
    return `${baseUrl}/Files/download?path=${encodeURIComponent(normalizedPath)}`;
  },

  /** Загрузить физический файл на сервер */
  async uploadFile(file: File, subFolder: string = 'Onbording'): Promise<{ relativePath: string, fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(`/Files/upload?subFolder=${subFolder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  /** Удалить физический файл с диска */
  async deleteFile(relativePath: string): Promise<void> {
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\//, '');
    await api.delete(`/Files/delete`, { params: { path: normalizedPath } });
  },

  /** Удалить материал из БД */
  async deleteMaterial(id: number): Promise<void> {
    await api.delete(`/onboarding/material/${id}`);
  },

  /** Удалить материал из БД и физический файл с диска (если не внешняя ссылка) */
  async deleteMaterialWithFile(id: number, urlDocument: string, isExternalLink: boolean): Promise<void> {
    if (!isExternalLink && !urlDocument.startsWith('http://') && !urlDocument.startsWith('https://')) {
      try {
        await materialService.deleteFile(urlDocument);
      } catch {
        // Файл мог уже не существовать — не блокируем удаление записи из БД
      }
    }
    await api.delete(`/onboarding/material/${id}`);
  },

  /** Проверить физическое наличие файла на сервере */
  async checkFileExists(path: string): Promise<boolean> {
    try {
      // Если это внешняя ссылка, проверку на сервере не делаем (она только для локальных файлов)
      if (path.startsWith('http')) return true;

      const res = await api.get<{ exists: boolean }>(`/Files/exists`, {
        params: { path: path.replace(/\\/g, '/').replace(/^\//, '') }
      });
      return res.data.exists;
    } catch (e) {
      return false;
    }
  },
};