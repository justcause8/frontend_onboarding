import { api } from '../api/api';

export interface SupportContact {
  id: number;
  fkUserId: number;
  employeeName: string;
  employeeJobTitle: string;
  employeeDepartment: string;
  issueCategory: string;
  description: string;
  messengerLink?: string;
}

export interface EmployeeContact {
  id: number;
  name: string;
  email?: string;
  jobTitle: string;
  department: string;
}

export const contactsService = {
  /** Получить все категории помощи */
  async getSupportContacts(): Promise<SupportContact[]> {
    const res = await api.get<SupportContact[]>('/onboarding/support-contacts');
    return res.data;
  },

  /** Получить наставника текущего сотрудника */
  async getMentor(userId: string): Promise<EmployeeContact | null> {
    try {
      const res = await api.get<EmployeeContact>(`/onboarding/support-contacts/${userId}/mentor`);
      return res.data;
    } catch {
      return null;
    }
  },

  /** Получить начальника отдела текущего сотрудника */
  async getDepartmentHead(userId: string): Promise<EmployeeContact | null> {
    try {
      const res = await api.get<EmployeeContact>(`/onboarding/support-contacts/${userId}/department-head`);
      return res.data;
    } catch {
      return null;
    }
  },

  /** Создать категорию помощи (HrAdmin / SuperAdmin) */
  async createSupportContact(data: Omit<SupportContact, 'id' | 'employeeName' | 'employeeJobTitle' | 'employeeDepartment'>): Promise<void> {
    await api.post('/onboarding/support-contacts', data);
  },

  /** Редактировать категорию помощи */
  async updateSupportContact(id: number, data: Partial<SupportContact>): Promise<void> {
    await api.put(`/onboarding/support-contacts/${id}`, data);
  },

  /** Удалить категорию помощи */
  async deleteSupportContact(id: number): Promise<void> {
    await api.delete(`/onboarding/support-contacts/${id}`);
  },
};
