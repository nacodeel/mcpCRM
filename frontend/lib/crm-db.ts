// Define DB Types
export interface Contact {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  addresses: string[];
  tags: string[];
  notes: string;
  dealIds: string[];
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  amount: number;
  contactId: string;
  status: 'Новая' | 'В работе' | 'Ожидание' | 'Успешно' | 'Потеряна';
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  notifications: boolean;
}

export interface CRMDatabase {
  contacts: Contact[];
  deals: Deal[];
  apiKey: string;
  profile: UserProfile;
}
