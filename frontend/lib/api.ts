import { CRMDatabase, Contact, Deal, UserProfile } from './crm-db';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type BackendEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string };
};

const statusToRu: Record<string, Deal['status']> = {
  NEW: 'Новая',
  CONTACTED: 'В работе',
  NEGOTIATION: 'В работе',
  PROPOSAL_SENT: 'Ожидание',
  WAITING_RESPONSE: 'Ожидание',
  WON: 'Успешно',
  LOST: 'Потеряна',
  CANCELLED: 'Потеряна',
};

const statusFromRu: Record<string, string> = {
  Новая: 'NEW',
  'В работе': 'NEGOTIATION',
  Ожидание: 'WAITING_RESPONSE',
  Успешно: 'WON',
  Потеряна: 'LOST',
};

/**
 * Centered TypeScript API Client Service for the Mini CRM.
 * Connected directly to the production FastAPI backend.
 */
export class CrmApiClient {
  static getRealtimeUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const token = this.getToken();
    if (!token) return null;

    const wsBase = this.getBackendUrl().replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/api/v1/notifications/ws?token=${encodeURIComponent(token)}`;
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('access_token') || window.localStorage.getItem('crm_access_token');
  }

  private static getBackendUrl(): string {
    const configured = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (configured) return configured.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return '';
  }

  private static async backendRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    if (!token) throw new Error('Токен доступа не найден. Пожалуйста, авторизуйтесь.');

    const backendUrl = this.getBackendUrl();
    let response;
    try {
      response = await fetch(`${backendUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
    } catch (networkError: any) {
      throw new Error(`Ошибка сети: ${networkError.message || 'не удалось связаться с сервером.'}`);
    }

    if (response.status === 401 || response.status === 403) {
      this.logout();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }

    let raw;
    try {
      raw = (await response.json()) as BackendEnvelope<T>;
    } catch {
      throw new Error(`Сервер вернул некорректный ответ (HTTP ${response.status})`);
    }

    if (!response.ok || raw.error) {
      throw new Error(raw.error?.message || (raw as any).detail || `Ошибка сервера! (Код: ${response.status})`);
    }
    return (raw.success ? raw.data : raw) as T;
  }

  static async login(username: string, password: string): Promise<ApiResponse<string>> {
    try {
      const backendUrl = this.getBackendUrl();
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch(`${backendUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        let errMsg = 'Неверный логин или пароль';
        try {
          const errData = await response.json();
          errMsg = errData.detail || errData.error?.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const raw = await response.json();
      const token = raw.access_token;
      if (!token) {
        throw new Error('Токен не получен с сервера');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('access_token', token);
      }
      return { success: true, data: token };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка входа' };
    }
  }

  static async register(username: string, name: string, password: string): Promise<ApiResponse<string>> {
    try {
      const backendUrl = this.getBackendUrl();
      const response = await fetch(`${backendUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, name, password }),
      });

      if (!response.ok) {
        let errMsg = 'Не удалось зарегистрироваться';
        try {
          const errData = await response.json();
          if (errData.error?.code === 'validation_error' && Array.isArray(errData.error?.details?.errors)) {
            // Translate common pydantic errors or display them directly
            const msgs = errData.error.details.errors.map((e: any) => {
              if (e.type === 'string_too_short') return `Поле слишком короткое (мин. ${e.ctx?.min_length || 8} симв.)`;
              return e.msg;
            });
            errMsg = msgs.join('; ');
          } else {
            errMsg = errData.detail || errData.error?.message || errMsg;
          }
        } catch {}
        throw new Error(errMsg);
      }

      // Automatically login after successful registration
      return await this.login(username, password);
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка регистрации' };
    }
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('crm_access_token');
    }
  }

  private static normalizePage<T>(payload: any): T[] {
    if (Array.isArray(payload)) return payload;
    if (payload?.items && Array.isArray(payload.items)) return payload.items;
    return [];
  }

  private static backendContactToUi(contact: any): Contact {
    const phones = (contact.phones || []).map((item: any) => item.phone || String(item));
    const emails = (contact.emails || []).map((item: any) => item.email || String(item));
    const addresses = (contact.addresses || []).map((item: any) => item.address || String(item));
    const tags = (contact.tags || []).map((item: any) => item.tag || String(item));
    const notes = (contact.notes || []).map((item: any) => item.note || String(item)).join('\n');
    const dealIds = (contact.deals || []).map((deal: any) => String(deal.id));

    return {
      id: String(contact.id),
      name: contact.full_name || [contact.last_name, contact.first_name, contact.middle_name].filter(Boolean).join(' ') || `Контакт #${contact.id}`,
      phones,
      emails,
      addresses,
      tags,
      notes,
      dealIds,
      updatedAt: contact.updated_at || contact.created_at || new Date().toISOString(),
    };
  }

  private static backendDealToUi(deal: any): Deal {
    return {
      id: String(deal.id),
      title: deal.title,
      description: deal.description || deal.comment || '',
      amount: Number(deal.amount || 0),
      contactId: String(deal.contact_id),
      status: statusToRu[deal.status] || 'Новая',
      updatedAt: deal.updated_at || deal.created_at || new Date().toISOString(),
    };
  }

  private static splitName(name?: string) {
    const [last_name, first_name, ...middle] = (name || '').trim().split(/\s+/).filter(Boolean);
    return {
      first_name: first_name || last_name || undefined,
      last_name: first_name ? last_name : undefined,
      middle_name: middle.join(' ') || undefined,
    };
  }

  private static async getBackendDatabase(): Promise<CRMDatabase> {
    const [contactsPayload, dealsPayload, profilePayload] = await Promise.all([
      this.backendRequest<any>('/api/v1/crm/contacts?per_page=200'),
      this.backendRequest<any>('/api/v1/crm/deals?per_page=200'),
      this.backendRequest<any>('/api/v1/users/me'),
    ]);

    return {
      contacts: this.normalizePage<any>(contactsPayload).map(this.backendContactToUi),
      deals: this.normalizePage<any>(dealsPayload).map(this.backendDealToUi),
      apiKey: 'Пожалуйста, используйте JWT / авторизацию для MCP',
      profile: {
        name: profilePayload.name || profilePayload.username || 'Пользователь CRM',
        email: profilePayload.username || 'email@example.com',
        avatarUrl: '',
        notifications: true,
      },
    };
  }

  static async getDatabase(): Promise<ApiResponse<CRMDatabase>> {
    try {
      return { success: true, data: await this.getBackendDatabase() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Не удалось загрузить backend CRM.' };
    }
  }

  static async saveContact(contact: Partial<Contact>): Promise<ApiResponse<CRMDatabase>> {
    try {
      const body = {
        ...this.splitName(contact.name),
        phones: contact.phones || [],
        emails: contact.emails || [],
        addresses: contact.addresses || [],
        tags: contact.tags || [],
        note: contact.notes,
      };
      
      const isEdit = !!contact.id;
      if (isEdit) {
        await this.backendRequest(`/api/v1/crm/contacts/${contact.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await this.backendRequest('/api/v1/crm/contacts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      return { success: true, data: await this.getBackendDatabase() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Не удалось сохранить контакт.' };
    }
  }

  static async deleteContact(id: string): Promise<ApiResponse<CRMDatabase>> {
    try {
      await this.backendRequest(`/api/v1/crm/contacts/${id}`, { method: 'DELETE' });
      return { success: true, data: await this.getBackendDatabase() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Не удалось удалить контакт.' };
    }
  }

  static async saveDeal(deal: Partial<Deal>): Promise<ApiResponse<CRMDatabase>> {
    try {
      const body = {
        contact_id: Number(deal.contactId),
        title: deal.title,
        description: deal.description,
        amount: deal.amount,
        status: deal.status ? statusFromRu[deal.status] || 'NEW' : 'NEW',
      };
      
      const isEdit = !!deal.id;
      if (isEdit) {
        await this.backendRequest(`/api/v1/crm/deals/${deal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await this.backendRequest('/api/v1/crm/deals', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      return { success: true, data: await this.getBackendDatabase() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Не удалось сохранить сделку.' };
    }
  }

  static async deleteDeal(id: string): Promise<ApiResponse<CRMDatabase>> {
    try {
      await this.backendRequest(`/api/v1/crm/deals/${id}`, { method: 'DELETE' });
      return { success: true, data: await this.getBackendDatabase() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Не удалось удалить сделку.' };
    }
  }

  static async regenerateApiKey(): Promise<ApiResponse<CRMDatabase>> {
    return { success: false, error: 'Действие недоступно на сервере.' };
  }

  static async updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<CRMDatabase>> {
    return { success: false, error: 'Редактирование профиля недоступно.' };
  }
}
