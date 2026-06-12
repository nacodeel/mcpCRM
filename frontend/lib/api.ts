import { CRMDatabase, Contact, Deal, UserProfile } from './crm-db';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Centered TypeScript API Client Service for the Mini CRM
 * Handles and abstracts all database transactions with full typings.
 */
export class CrmApiClient {
  private static baseUrl = '/api/crm';

  /**
   * Helper utility for general requests
   */
  private static async request<T>(
    method: 'GET' | 'POST',
    payload?: any
  ): Promise<ApiResponse<T>> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST' && payload) {
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(this.baseUrl, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawResult = await response.json();
      
      // Handle the standardized { success, db, error } output from /api/crm
      if (rawResult.error) {
        return { success: false, error: rawResult.error };
      }

      // If db is returned inside success response, map it to the requested generic type
      return {
        success: true,
        data: (rawResult.db ? rawResult.db : rawResult) as T,
      };
    } catch (err: any) {
      console.error('CRM API client error:', err);
      return {
        success: false,
        error: err.message || 'Сбой подключения к серверу.',
      };
    }
  }

  /**
   * Fetches the entire CRM database state
   */
  static async getDatabase(): Promise<ApiResponse<CRMDatabase>> {
    // Standard mock placeholder logic can be added here if no backend is detected
    return this.request<CRMDatabase>('GET');
  }

  /**
   * Saves (creates or updates) a contact in the system
   */
  static async saveContact(contact: Partial<Contact>): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'save_contact',
      payload: contact,
    });
  }

  /**
   * Deletes a contact and its associated deals
   */
  static async deleteContact(id: string): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'delete_contact',
      payload: { id },
    });
  }

  /**
   * Saves (creates or updates) a sales deal
   */
  static async saveDeal(deal: Partial<Deal>): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'save_deal',
      payload: deal,
    });
  }

  /**
   * Deletes a specific deal
   */
  static async deleteDeal(id: string): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'delete_deal',
      payload: { id },
    });
  }

  /**
   * Generates a new secure API authorization token
   */
  static async regenerateApiKey(): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'regenerate_apiKey',
      payload: {},
    });
  }

  /**
   * Updates user metadata settings
   */
  static async updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<CRMDatabase>> {
    return this.request<CRMDatabase>('POST', {
      action: 'update_profile',
      payload: profile,
    });
  }
}
