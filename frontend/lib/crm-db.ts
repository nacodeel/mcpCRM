import fs from 'fs';
import path from 'path';

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

const STORAGE_PATH = path.join(process.cwd(), 'crm-storage.json');

// Mock data generator
const getInitialDatabase = (): CRMDatabase => {
  const initialContacts: Contact[] = [
    {
      id: 'c1',
      name: 'Дмитрий Козлов',
      phones: ['+7 (999) 111-22-33', '+7 (900) 123-45-67'],
      emails: ['d.kozlov@ai-labs.ru', 'dmitry@kozlov.io'],
      addresses: ['Москва, Садовническая ул., д. 42'],
      tags: ['AI Agent', 'Client', 'Warm'],
      notes: 'Интересуется интеграцией ИИ-помощника в свой отдел продаж. Готовы обсуждать детали пилота.',
      dealIds: ['d1'],
      updatedAt: '2026-06-11T08:30:00Z',
    },
    {
      id: 'c2',
      name: 'Анна Смирнова',
      phones: ['+7 (905) 555-44-33'],
      emails: ['smirnova.anna@retail.org'],
      addresses: ['Санкт-Петербург, Невский пр., д. 15'],
      tags: ['Retail', 'Hot'],
      notes: 'Планируют запуск умного чат-ботика для поддержки покупателей на сайте и в Telegram.',
      dealIds: ['d4'],
      updatedAt: '2026-06-10T12:00:00Z',
    },
    {
      id: 'c3',
      name: 'Александр Петров',
      phones: ['+7 (911) 456-78-90'],
      emails: ['a.petrov@techflow.io'],
      addresses: ['Новосибирск, ул. Ленина, д. 12'],
      tags: ['Enterprise', 'Partner'],
      notes: 'Обсудили пилотный проект по автоматизации внутреннего документооборота с помощью LLM.',
      dealIds: ['d3'],
      updatedAt: '2026-06-09T15:20:00Z',
    },
    {
      id: 'c4',
      name: 'Елена Соколова',
      phones: ['+7 (903) 777-88-99'],
      emails: ['e.sokolova@creative.media'],
      addresses: [],
      tags: ['Lead'],
      notes: 'Поступил запрос коммерческого предложения на разработку голосового ИИ-агента для обзвона базы.',
      dealIds: ['d2'],
      updatedAt: '2026-06-08T10:15:00Z',
    },
    {
      id: 'c5',
      name: 'Михаил Морозов',
      phones: ['+7 (926) 333-22-11'],
      emails: ['m.morozov@fintech.group'],
      addresses: ['Москва, Сити, Башня Федерация'],
      tags: ['Lead', 'Finance'],
      notes: 'Встреча назначена на пятницу. Очень важна информационная безопасность и локальное развертывание модели.',
      dealIds: ['d5'],
      updatedAt: '2026-06-07T17:45:00Z',
    }
  ];

  const initialDeals: Deal[] = [
    {
      id: 'd1',
      title: 'ИИ-Ассистент для отдела продаж',
      description: 'Интеграция умного голосового ассистента в CRM заказчика для квалификации лидов на входящей линии.',
      amount: 250000,
      contactId: 'c1',
      status: 'В работе',
      updatedAt: '2026-06-11T08:30:00Z',
    },
    {
      id: 'd2',
      title: 'Голосовой бот поддержки (пилот)',
      description: 'Разработка и пилотное тестирование робота для обработки частых вопросов в службе поддержки.',
      amount: 180000,
      contactId: 'c4',
      status: 'Новая',
      updatedAt: '2026-06-08T10:15:00Z',
    },
    {
      id: 'd3',
      title: 'Автоматизация документооборота',
      description: 'Внедрение системы извлечения сущностей из договоров и счетов на базе ИИ-агента.',
      amount: 450000,
      contactId: 'c3',
      status: 'Ожидание',
      updatedAt: '2026-06-09T15:20:00Z',
    },
    {
      id: 'd4',
      title: 'Чат-бот поддержки Retail',
      description: 'Мультиязычный чат-бот для ритейл платформы с базой знаний и интеграцией с каталогом товаров.',
      amount: 120000,
      contactId: 'c2',
      status: 'Успешно',
      updatedAt: '2026-06-10T12:00:00Z',
    },
    {
      id: 'd5',
      title: 'ИИ-Комплаенс аудит документов',
      description: 'Финансовый комплаенс и автоматическая проверка транзакций на предмет рисков.',
      amount: 890000,
      contactId: 'c5',
      status: 'Потеряна',
      updatedAt: '2026-06-07T17:45:00Z',
    }
  ];

  const genRandomApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'agent_crm_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  return {
    contacts: initialContacts,
    deals: initialDeals,
    apiKey: genRandomApiKey(),
    profile: {
      name: 'Никита',
      email: 'nikiteron@gmail.com',
      avatarUrl: '',
      notifications: true
    }
  };
};

export function readDB(): CRMDatabase {
  try {
    if (!fs.existsSync(STORAGE_PATH)) {
      const defaultDb = getInitialDatabase();
      writeDB(defaultDb);
      return defaultDb;
    }
    const data = fs.readFileSync(STORAGE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading CRM DB:', error);
    return getInitialDatabase();
  }
}

export function writeDB(db: CRMDatabase): void {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing CRM DB:', error);
  }
}

export function generateNewApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'agent_crm_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}
