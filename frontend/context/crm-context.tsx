'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, SlidersHorizontal, Trash2, Edit3, Copy, Eye, EyeOff,
  RefreshCw, User, Mail, Phone, MapPin, Calendar, TrendingUp, Wallet,
  Check, X, FileText, ArrowRight, CheckCircle2, AlertCircle, Sparkles, HelpCircle,
  ShieldAlert, KeyRound, CreditCard
} from 'lucide-react';
import { useToast, Button, Input, Textarea, Select, Badge, Skeleton, ConfirmDialog, CustomDropdown } from '@/components/ui';
import { Sidebar, CRMSection } from '@/components/sidebar';
import { CrmApiClient } from '@/lib/api';
import { CRMDatabase, Contact, Deal } from '@/lib/crm-db';
import { ResponsiveModal } from '@/components/modal';

interface CRMContextType {
  db: CRMDatabase | null;
  loading: boolean;
  hasBackendToken: boolean;
  mcpKeys: any[];
  newMcpKeyName: string;
  setNewMcpKeyName: (val: string) => void;
  selectedAccessLevel: string;
  setSelectedAccessLevel: (val: string) => void;
  mcpKeyLoading: boolean;
  newRawToken: string | null;
  setNewRawToken: (val: string | null) => void;
  originUrl: string;
  
  // Modals & operational states
  contactModalOpen: boolean;
  setContactModalOpen: (val: boolean) => void;
  selectedContact: Partial<Contact> | null;
  setSelectedContact: (val: Partial<Contact> | null) => void;
  editContactMode: 'create' | 'edit' | 'view';
  setEditContactMode: (val: 'create' | 'edit' | 'view') => void;
  
  dealModalOpen: boolean;
  setDealModalOpen: (val: boolean) => void;
  selectedDeal: Partial<Deal> | null;
  setSelectedDeal: (val: Partial<Deal> | null) => void;
  editDealMode: 'create' | 'edit' | 'view';
  setEditDealMode: (val: 'create' | 'edit' | 'view') => void;
  
  newPhoneInput: string;
  setNewPhoneInput: (val: string) => void;
  newEmailInput: string;
  setNewEmailInput: (val: string) => void;
  newAddressInput: string;
  setNewAddressInput: (val: string) => void;
  newTagInput: string;
  setNewTagInput: (val: string) => void;
  
  // Helpers
  getDealStatusBadgeVariant: (status: Deal['status']) => 'blue' | 'amber' | 'purple' | 'emerald' | 'red' | 'gray';
  formatMoney: (amountInRub: number) => string;
  formatDate: (dateStr: string) => string;
  isToday: (dateStr: string) => boolean;
  isWithinLast7Days: (dateStr: string) => boolean;
  
  // Contact & Deal actions
  openCreateContact: () => void;
  openEditContact: (contact: Contact) => void;
  saveContactForm: () => void;
  initiateDeleteContact: (id: string, e?: React.MouseEvent) => void;
  
  openCreateDeal: () => void;
  openEditDeal: (deal: Deal) => void;
  saveDealForm: () => void;
  initiateDeleteDeal: (id: string, e?: React.MouseEvent) => void;
  
  handleCreateMcpKey: () => Promise<void>;
  handleDeleteMcpKey: (id: number) => Promise<void>;
  
  handleContactDealClick: (dealId: string) => void;
  handleDealContactClick: (contactId: string) => void;
  copyToClipboard: (text: string, subject: string) => void;
  fetchDB: (silent?: boolean) => Promise<void>;
  fetchMcpKeys: () => Promise<void>;
  handleLogout: () => void;
  
  // Filter states
  contactsSearch: string;
  setContactsSearch: (val: string) => void;
  contactsPage: number;
  setContactsPage: (val: number) => void;
  contactsPageSize: number;
  setContactsPageSize: (val: number) => void;
  contactsSortField: string;
  setContactsSortField: (val: string) => void;
  contactsSortDirection: 'asc' | 'desc';
  setContactsSortDirection: (val: 'asc' | 'desc') => void;
  contactsFilterTag: string;
  setContactsFilterTag: (val: string) => void;
  contactsFilterHasDeals: string;
  setContactsFilterHasDeals: (val: string) => void;
  contactsFilterDate: string;
  setContactsFilterDate: (val: string) => void;

  dealsSearch: string;
  setDealsSearch: (val: string) => void;
  dealsPage: number;
  setDealsPage: (val: number) => void;
  dealsPageSize: number;
  setDealsPageSize: (val: number) => void;
  dealsSortField: string;
  setDealsSortField: (val: string) => void;
  dealsSortDirection: 'asc' | 'desc';
  setDealsSortDirection: (val: 'asc' | 'desc') => void;
  dealsFilterStatus: string;
  setDealsFilterStatus: (val: string) => void;
  dealsFilterContact: string;
  setDealsFilterContact: (val: string) => void;
  dealsMinAmount: string;
  setDealsMinAmount: (val: string) => void;
  dealsMaxAmount: string;
  setDealsMaxAmount: (val: string) => void;
  dealsFilterDate: string;
  setDealsFilterDate: (val: string) => void;
}

const CRMContext = React.createContext<CRMContextType | null>(null);

export const useCRM = () => {
  const context = React.useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Core Database States
  const [db, setDb] = React.useState<CRMDatabase | null>(null);
  const [loading, setLoading] = React.useState(true);

  // MCP Keys states
  const [mcpKeys, setMcpKeys] = React.useState<any[]>([]);
  const [newMcpKeyName, setNewMcpKeyName] = React.useState('');
  const [newMcpKeyScopes, setNewMcpKeyScopes] = React.useState<string[]>([]);
  const [selectedAccessLevel, setSelectedAccessLevel] = React.useState('crm:admin');
  const [mcpKeyLoading, setMcpKeyLoading] = React.useState(false);
  const [newRawToken, setNewRawToken] = React.useState<string | null>(null);

  // Authentication states
  const [hasBackendToken, setHasBackendToken] = React.useState(false);

  const [loginUsername, setLoginUsername] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [registerName, setRegisterName] = React.useState('');

  // URL extraction for API instructions
  const [originUrl, setOriginUrl] = React.useState('https://your-crm.app');

  // Dialog / Confirmation management
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: 'contact' | 'deal'; id: string } | null>(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = React.useState(false);

  // Modal active states
  const [contactModalOpen, setContactModalOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Partial<Contact> | null>(null);
  const [editContactMode, setEditContactMode] = React.useState<'create' | 'edit' | 'view'>('create');

  const [dealModalOpen, setDealModalOpen] = React.useState(false);
  const [selectedDeal, setSelectedDeal] = React.useState<Partial<Deal> | null>(null);
  const [editDealMode, setEditDealMode] = React.useState<'create' | 'edit' | 'view'>('create');

  // Input states inside modals
  const [newPhoneInput, setNewPhoneInput] = React.useState('');
  const [newEmailInput, setNewEmailInput] = React.useState('');
  const [newAddressInput, setNewAddressInput] = React.useState('');
  const [newTagInput, setNewTagInput] = React.useState('');

  // Push notification banner state
  const [pushBanners, setPushBanners] = React.useState<{ id: string; type: string; action: string; title: string; details: string; agentName?: string; time: string }[]>([]);

  // Search & Filter state for CONTACTS
  const [contactsSearch, setContactsSearch] = React.useState('');
  const [contactsPage, setContactsPage] = React.useState(1);
  const [contactsPageSize, setContactsPageSize] = React.useState(20);
  const [contactsSortField, setContactsSortField] = React.useState<string>('updatedAt');
  const [contactsSortDirection, setContactsSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [contactsFilterTag, setContactsFilterTag] = React.useState<string>('all');
  const [contactsFilterHasDeals, setContactsFilterHasDeals] = React.useState<string>('all');
  const [contactsFilterDate, setContactsFilterDate] = React.useState<string>('all');

  // Search & Filter state for DEALS
  const [dealsSearch, setDealsSearch] = React.useState('');
  const [dealsPage, setDealsPage] = React.useState(1);
  const [dealsPageSize, setDealsPageSize] = React.useState(20);
  const [dealsSortField, setDealsSortField] = React.useState<string>('updatedAt');
  const [dealsSortDirection, setDealsSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [dealsFilterStatus, setDealsFilterStatus] = React.useState<string>('all');
  const [dealsFilterContact, setDealsFilterContact] = React.useState<string>('all');
  const [dealsMinAmount, setDealsMinAmount] = React.useState<string>('');
  const [dealsMaxAmount, setDealsMaxAmount] = React.useState<string>('');
  const [dealsFilterDate, setDealsFilterDate] = React.useState<string>('all');

  // Current Section computed from pathname
  const currentSection: CRMSection = 
    pathname === '/contacts' ? 'contacts' :
    pathname === '/deals' ? 'deals' :
    pathname === '/integration' ? 'integration' : 'dashboard';

  const onSectionChange = (section: CRMSection) => {
    if (section === 'dashboard') router.push('/');
    else router.push(`/${section}`);
  };

  const triggerPush = React.useCallback((title: string, message: string, payload?: any, eventType?: string, latestDb?: any) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Extract Agent Name if present
    let agentName = '';
    let messageText = message || '';
    const agentMatch = messageText.match(/^\[(.*?)\]\s*(.*)/);
    if (agentMatch) {
      agentName = agentMatch[1];
      messageText = agentMatch[2];
    }
    
    const isAi = title && title.includes('🤖');
    let parsedTitle = title || 'Обновление CRM';
    let parsedDetails = messageText;
    let type = 'other';
    let action = 'other';

    const targetDb = latestDb || db;

    // Parse event details using payload and current db state
    if (eventType) {
      if (eventType.startsWith('crm.contact.')) {
        type = 'contact';
        const contactId = payload?.contact_id;
        const contact = targetDb?.contacts?.find((c: any) => String(c.id) === String(contactId));
        
        if (eventType === 'crm.contact.created') {
          action = 'created';
          parsedTitle = contact ? `Новый контакт: ${contact.name}` : 'Создан контакт';
          if (contact) {
            const phone = contact.phones?.[0];
            const email = contact.emails?.[0];
            parsedDetails = [phone, email].filter(Boolean).join(' | ') || 'Контакты не указаны';
          }
        } else if (eventType === 'crm.contact.updated') {
          action = 'updated';
          parsedTitle = contact ? `Контакт изменен: ${contact.name}` : 'Обновлен контакт';
          if (contact) {
            const tags = contact.tags?.length ? `Теги: ${contact.tags.join(', ')}` : '';
            parsedDetails = tags || 'Контакт обновлен в системе';
          }
        } else if (eventType === 'crm.contact.deleted') {
          action = 'deleted';
          parsedTitle = `Удален контакт #${contactId}`;
          parsedDetails = 'Данные контакта стерты из CRM';
        }
      } else if (eventType.startsWith('crm.deal.')) {
        type = 'deal';
        const dealId = payload?.deal_id;
        const deal = targetDb?.deals?.find((d: any) => String(d.id) === String(dealId));
        
        if (eventType === 'crm.deal.created') {
          action = 'created';
          parsedTitle = deal ? `Новая сделка: ${deal.title}` : 'Создана сделка';
          if (deal) {
            const amountStr = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(deal.amount);
            const contact = targetDb?.contacts?.find((c: any) => String(c.id) === String(deal.contactId));
            parsedDetails = `${amountStr} • ${contact ? contact.name : 'Без контакта'}`;
          }
        } else if (eventType === 'crm.deal.updated') {
          action = 'updated';
          parsedTitle = deal ? `Сделка изменена: ${deal.title}` : 'Обновлена сделка';
          if (deal) {
            const amountStr = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(deal.amount);
            parsedDetails = `Статус: ${deal.status} • ${amountStr}`;
          }
        } else if (eventType === 'crm.deal.deleted') {
          action = 'deleted';
          parsedTitle = `Удалена сделка #${dealId}`;
          parsedDetails = 'Сделка исключена из воронки';
        }
      }
    }

    const newBanner = {
      id,
      type,
      action,
      title: parsedTitle,
      details: parsedDetails,
      agentName: isAi ? (agentName || 'AI-Ассистент') : undefined,
      time: 'сейчас'
    };

    setPushBanners((current) => [...current, newBanner]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setPushBanners((current) => current.filter((b) => b.id !== id));
    }, 6000);

    // native browser notification fallback (if permitted)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(parsedTitle, { body: parsedDetails });
        } catch (e) {
          console.log('Frame native push error:', e);
        }
      }
    }
  }, [db]);

  // Triggering API fetch to server via CrmApiClient
  const fetchDB = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = CrmApiClient.getToken();
      setHasBackendToken(!!token);
      const response = await CrmApiClient.getDatabase();
      if (response.success && response.data) {
        setDb(response.data);
      } else {
        if (token && !silent) showToast(response.error || 'Не удалось загрузить данные CRM.', 'error');
        if (token && !CrmApiClient.getToken()) {
          setHasBackendToken(false);
        }
      }
    } catch {
      if (!silent) showToast('Сбой подключения к серверу.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  const fetchMcpKeys = React.useCallback(async () => {
    setMcpKeyLoading(true);
    const keysRes = await CrmApiClient.listMcpKeys();
    if (keysRes.success && keysRes.data) {
      setMcpKeys(keysRes.data);
    } else if (keysRes.error) {
      showToast(keysRes.error, 'error');
    }
    setMcpKeyLoading(false);
  }, [showToast]);

  React.useEffect(() => {
    if (currentSection === 'integration' && hasBackendToken) {
      fetchMcpKeys();
    }
  }, [currentSection, hasBackendToken, fetchMcpKeys]);

  const handleCreateMcpKey = async () => {
    if (!newMcpKeyName.trim()) {
      showToast('Введите название ключа', 'error');
      return;
    }
    const scopes = selectedAccessLevel.split(',');
    const res = await CrmApiClient.createMcpKey(newMcpKeyName, scopes);
    if (res.success && res.data) {
      setNewRawToken(res.data.raw_token);
      setNewMcpKeyName('');
      setSelectedAccessLevel('crm:admin');
      showToast('Ключ успешно создан', 'success');
      fetchMcpKeys();
    } else {
      showToast(res.error || 'Ошибка при создании ключа', 'error');
    }
  };

  const handleDeleteMcpKey = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот ключ? Ключ будет полностью и безвозвратно удален из базы данных.')) return;
    const res = await CrmApiClient.deleteMcpKey(id);
    if (res.success) {
      showToast('Ключ успешно удален из базы данных', 'success');
      fetchMcpKeys();
    } else {
      showToast(res.error || 'Ошибка при удалении ключа', 'error');
    }
  };

  React.useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        fetchDB();
        if (typeof window !== 'undefined') {
          setOriginUrl(window.location.origin);
        }
      }
    }, 0);
    return () => {
      active = false;
    };
  }, [fetchDB]);

  // Production WebSocket realtime synchronizer.
  React.useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByComponent = false;

    const connect = () => {
      const realtimeUrl = CrmApiClient.getRealtimeUrl();
      if (!realtimeUrl || closedByComponent) return;

      socket = new WebSocket(realtimeUrl);

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'notification' || !message.data) return;

          const updatedDb = await fetchDB(true);
          triggerPush(
            message.data.title || 'CRM обновлена',
            message.data.message || 'Данные обновлены',
            message.data.payload,
            message.data.type,
            updatedDb
          );
        } catch (err) {
          console.error('Realtime message handling failed:', err);
        }
      };

      socket.onclose = () => {
        if (!closedByComponent) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      closedByComponent = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [fetchDB, triggerPush, hasBackendToken]);

  // Real-time background update synchronizer polling cycle (every 8 seconds)
  React.useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      // Pause polling if modals or dialogs are active to protect user input states
      if (contactModalOpen || dealModalOpen || deleteConfirmOpen || regenerateConfirmOpen) {
        return;
      }
      if (active) {
        await fetchDB(true);
      }
    }, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchDB, contactModalOpen, dealModalOpen, deleteConfirmOpen, regenerateConfirmOpen]);

  const triggerAction = async (action: string, payload: any, successMessage?: string) => {
    try {
      let result;
      switch (action) {
        case 'save_contact':
          result = await CrmApiClient.saveContact(payload);
          break;
        case 'delete_contact':
          result = await CrmApiClient.deleteContact(payload.id);
          break;
        case 'save_deal':
          result = await CrmApiClient.saveDeal(payload);
          break;
        case 'delete_deal':
          result = await CrmApiClient.deleteDeal(payload.id);
          break;
        case 'regenerate_apiKey':
          showToast('Для управления ключами перейдите в раздел "Интеграции".', 'info');
          return;
        case 'update_profile':
          result = await CrmApiClient.updateProfile(payload);
          break;
        default:
          throw new Error(`Неизвестное действие: ${action}`);
      }

      if (result.success && result.data) {
        setDb(result.data);
        if (successMessage) {
          showToast(successMessage, 'success');
        }
      } else {
        showToast(result.error || 'Ошибка при обработке запроса.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ошибка сети при синхронизации.', 'error');
    }
  };

  const handleLogout = React.useCallback(() => {
    CrmApiClient.logout();
    setHasBackendToken(false);
    showToast('Вы успешно вышли из системы.', 'success');
    fetchDB();
  }, [fetchDB, showToast]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);
    try {
      let res;
      if (isRegistering) {
        if (!registerName.trim()) throw new Error("Введите имя");
        res = await CrmApiClient.register(loginUsername, registerName, loginPassword);
      } else {
        res = await CrmApiClient.login(loginUsername, loginPassword);
      }
      
      if (res.success) {
        setHasBackendToken(true);
        setLoginUsername('');
        setLoginPassword('');
        setRegisterName('');
        showToast(isRegistering ? 'Регистрация успешна!' : 'Успешный вход!', 'success');
        fetchDB();
      } else {
        setLoginError(res.error || (isRegistering ? 'Ошибка регистрации' : 'Неверные данные'));
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Contacts operations handlers
  const openCreateContact = () => {
    setEditContactMode('create');
    setSelectedContact({
      id: '',
      name: '',
      firstName: '',
      lastName: '',
      middleName: '',
      phones: [],
      emails: [],
      addresses: [],
      tags: [],
      notes: '',
      dealIds: []
    });
    setNewPhoneInput('');
    setNewEmailInput('');
    setNewAddressInput('');
    setNewTagInput('');
    setContactModalOpen(true);
  };

  const openEditContact = (contact: Contact) => {
    setEditContactMode('view');
    setSelectedContact(JSON.parse(JSON.stringify(contact))); // Deep copy
    setNewPhoneInput('');
    setNewEmailInput('');
    setNewAddressInput('');
    setNewTagInput('');
    setContactModalOpen(true);
  };

  const saveContactForm = async () => {
    if (!selectedContact?.firstName?.trim() && !selectedContact?.lastName?.trim() && !selectedContact?.name?.trim()) {
      showToast('Пожалуйста, введите Имя или Фамилию.', 'error');
      return;
    }
    const label = editContactMode === 'create' ? 'создан' : 'изменен';
    await triggerAction('save_contact', selectedContact, `Контакт "${selectedContact.name}" успешно ${label}.`);
    setContactModalOpen(false);
  };

  const initiateDeleteContact = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ type: 'contact', id });
    setDeleteConfirmOpen(true);
  };

  // Deals operations handlers
  const openCreateDeal = () => {
    setEditDealMode('create');
    setSelectedDeal({
      id: '',
      title: '',
      description: '',
      amount: 0,
      contactId: db?.contacts[0]?.id || '',
      status: 'Новая'
    });
    setDealModalOpen(true);
  };

  const openEditDeal = (deal: Deal) => {
    setEditDealMode('view');
    setSelectedDeal({ ...deal });
    setDealModalOpen(true);
  };

  const saveDealForm = async () => {
    if (!selectedDeal?.title?.trim()) {
      showToast('Пожалуйста, введите название сделки.', 'error');
      return;
    }
    if (!selectedDeal.contactId) {
      showToast('Пожалуйста, выберите связанный контакт.', 'error');
      return;
    }
    const label = editDealMode === 'create' ? 'создана' : 'изменена';
    await triggerAction('save_deal', selectedDeal, `Сделка "${selectedDeal.title}" успешно ${label}.`);
    setDealModalOpen(false);
  };

  const initiateDeleteDeal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ type: 'deal', id });
    setDeleteConfirmOpen(true);
  };

  const executeDeleteTarget = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'contact') {
      const contact = db?.contacts.find(c => c.id === deleteTarget.id);
      await triggerAction('delete_contact', { id: deleteTarget.id }, `Контакт "${contact?.name}" и связанные сделки удалены.`);
      // If modal was open for the same deleted contact, close it
      if (selectedContact?.id === deleteTarget.id) {
        setContactModalOpen(false);
      }
    } else {
      const deal = db?.deals.find(d => d.id === deleteTarget.id);
      await triggerAction('delete_deal', { id: deleteTarget.id }, `Сделка "${deal?.title}" успешно удалена.`);
      // If modal was open for the same deleted deal, close it
      if (selectedDeal?.id === deleteTarget.id) {
        setDealModalOpen(false);
      }
    }
    setDeleteTarget(null);
  };

  const handleRegenerateApiKey = async () => {
    await triggerAction('regenerate_apiKey', {}, 'API-ключ успешно изменен и вступает в силу немедленно.');
  };

  const copyToClipboard = (text: string, subject: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${subject} скопирован в буфер обмена.`, 'success');
  };

  const handleContactDealClick = (dealId: string) => {
    const deal = db?.deals.find(d => d.id === dealId);
    if (deal) {
      setContactModalOpen(false);
      router.push('/deals');
      openEditDeal(deal);
    }
  };

  const handleDealContactClick = (contactId: string) => {
    const contact = db?.contacts.find(c => c.id === contactId);
    if (contact) {
      setDealModalOpen(false);
      router.push('/contacts');
      openEditContact(contact);
    }
  };

  // Status helper colors
  const getDealStatusBadgeVariant = (status: Deal['status']) => {
    switch (status) {
      case 'Новая': return 'blue';
      case 'В работе': return 'amber';
      case 'Ожидание': return 'purple';
      case 'Успешно': return 'emerald';
      case 'Потеряна': return 'red';
      default: return 'gray';
    }
  };

  // Shared formatting
  const formatMoney = (amountInRub: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amountInRub);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper date checker
  const isWithinLast7Days = (dateStr: string) => {
    const recordDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - recordDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isToday = (dateStr: string) => {
    const recordDate = new Date(dateStr);
    const now = new Date();
    return recordDate.toDateString() === now.toDateString();
  };

  // Skeletons when initial loads
  if (loading && !db) {
    return (
      <div className="h-screen w-screen flex bg-[#F9F9F8] text-[#1A1A1A] font-sans antialiased overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col w-60 border-r border-[#EDEDED] bg-white p-5 h-screen space-y-7">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-sm bg-[#EDEDED] animate-pulse" />
            <div className="h-4 w-24 bg-[#EDEDED] animate-pulse rounded" />
          </div>
          <div className="space-y-2 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#F5F5F4] animate-pulse rounded-md w-full" />
            ))}
          </div>
        </div>
        {/* Main skeleton */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-none h-full max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#EDEDED]">
            <div className="space-y-1.5">
              <div className="h-6 w-48 bg-[#EDEDED] animate-pulse rounded" />
              <div className="h-3 w-72 bg-[#EDEDED] animate-pulse rounded" />
            </div>
            <div className="h-9 w-32 bg-[#EDEDED] animate-pulse rounded-md" />
          </div>
          {/* Stat boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-[#EDEDED] rounded-lg p-5 flex flex-col justify-between">
                <div className="h-3 w-20 bg-[#F5F5F4] animate-pulse rounded" />
                <div className="h-6 w-24 bg-[#EDEDED] animate-pulse rounded" />
              </div>
            ))}
          </div>
          {/* Split screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div className="bg-white border border-[#EDEDED] rounded-lg p-5 h-64 animate-pulse" />
            <div className="bg-white border border-[#EDEDED] rounded-lg p-5 h-64 animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!hasBackendToken) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F9F9F8] text-[#1A1A1A] font-sans antialiased overflow-hidden p-4">
        <div className="w-full max-w-md bg-white border border-[#EDEDED] p-8 rounded-2xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center font-bold text-xl mx-auto shadow-md">
              c
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Mini CRM</h2>
            <p className="text-xs text-neutral-400">Вход в систему управления клиентами</p>
          </div>

          {loginError && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl shadow-[0_2px_4px_rgba(239,68,68,0.02)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Ваше имя</label>
                <Input
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Иван Иванов"
                  disabled={isSubmittingLogin}
                  className="rounded-xl border-[#EDEDED] focus:border-neutral-900"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Имя пользователя</label>
              <Input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                disabled={isSubmittingLogin}
                className="rounded-xl border-[#EDEDED] focus:border-neutral-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Пароль</label>
              <Input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmittingLogin}
                className="rounded-xl border-[#EDEDED] focus:border-neutral-900"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmittingLogin}
              className="w-full py-3 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 font-semibold shadow-md transition-all duration-150 mt-2"
            >
              {isRegistering ? 'Зарегистрироваться' : 'Войти'}
            </Button>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError('');
                }}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline-offset-4 hover:underline transition-colors"
              >
                {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const safeDb = db || { contacts: [], deals: [], apiKey: '', profile: { name: 'Никита', email: 'nikiteron@gmail.com', avatarUrl: '', notifications: true } };

  return (
    <CRMContext.Provider value={{
      db: safeDb,
      loading,
      hasBackendToken,
      mcpKeys,
      newMcpKeyName,
      setNewMcpKeyName,
      selectedAccessLevel,
      setSelectedAccessLevel,
      mcpKeyLoading,
      newRawToken,
      setNewRawToken,
      originUrl,
      
      contactModalOpen,
      setContactModalOpen,
      selectedContact,
      setSelectedContact,
      editContactMode,
      setEditContactMode,
      
      dealModalOpen,
      setDealModalOpen,
      selectedDeal,
      setSelectedDeal,
      editDealMode,
      setEditDealMode,
      
      newPhoneInput,
      setNewPhoneInput,
      newEmailInput,
      setNewEmailInput,
      newAddressInput,
      setNewAddressInput,
      newTagInput,
      setNewTagInput,
      
      getDealStatusBadgeVariant,
      formatMoney,
      formatDate,
      isToday,
      isWithinLast7Days,
      
      openCreateContact,
      openEditContact,
      saveContactForm,
      initiateDeleteContact,
      
      openCreateDeal,
      openEditDeal,
      saveDealForm,
      initiateDeleteDeal,
      
      handleCreateMcpKey,
      handleDeleteMcpKey,
      
      handleContactDealClick,
      handleDealContactClick,
      copyToClipboard,
      fetchDB,
      fetchMcpKeys,
      handleLogout,

      contactsSearch,
      setContactsSearch,
      contactsPage,
      setContactsPage,
      contactsPageSize,
      setContactsPageSize,
      contactsSortField,
      setContactsSortField,
      contactsSortDirection,
      setContactsSortDirection,
      contactsFilterTag,
      setContactsFilterTag,
      contactsFilterHasDeals,
      setContactsFilterHasDeals,
      contactsFilterDate,
      setContactsFilterDate,

      dealsSearch,
      setDealsSearch,
      dealsPage,
      setDealsPage,
      dealsPageSize,
      setDealsPageSize,
      dealsSortField,
      setDealsSortField,
      dealsSortDirection,
      setDealsSortDirection,
      dealsFilterStatus,
      setDealsFilterStatus,
      dealsFilterContact,
      setDealsFilterContact,
      dealsMinAmount,
      setDealsMinAmount,
      dealsMaxAmount,
      setDealsMaxAmount,
      dealsFilterDate,
      setDealsFilterDate
    }}>
      <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#F9F9F8] text-[#1A1A1A] font-sans antialiased overflow-hidden">
        {/* 1. SIDEBAR Navigation */}
        <Sidebar
          currentSection={currentSection}
          onSectionChange={onSectionChange}
          userName={safeDb.profile.name}
          userEmail={safeDb.profile.email}
          onLogout={handleLogout}
        />

        {/* 2. MAIN WORKING REGION */}
        <main className="flex-1 overflow-y-auto scrollbar-none h-full relative mx-auto w-full transition-all duration-150 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
          {children}
        </main>

        {/* ========================================= */}
        {/* 3. MODALS AND SHEET COMPONENT WRAPPERS */}
        {/* ========================================= */}

        {/* NEW MCP TOKEN MODAL */}
        <ResponsiveModal
          isOpen={!!newRawToken}
          onClose={() => setNewRawToken(null)}
          title="Ваш новый ключ доступа"
          className="max-w-md"
        >
          <div className="space-y-4 text-sm font-normal">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Внимание:</strong> Скопируйте этот токен прямо сейчас. Он показан только один раз. В целях безопасности мы не храним его в открытом виде.
            </div>
            
            <div className="relative font-mono text-xs text-neutral-800 bg-neutral-100 p-3 rounded-lg border border-neutral-200 break-all select-all">
              {newRawToken}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setNewRawToken(null)}>Закрыть</Button>
              <Button variant="primary" onClick={() => {
                copyToClipboard(newRawToken || '', 'API-токен');
                setNewRawToken(null);
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Скопировать и закрыть
              </Button>
            </div>
          </div>
        </ResponsiveModal>

        {/* CONTACTS CREATE / EDIT VIEW */}
        <ResponsiveModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          title={editContactMode === 'create' ? 'Новый контакт' : editContactMode === 'view' ? 'Просмотр контакта' : 'Редактировать контакт'}
          className="max-w-2xl"
        >
          {selectedContact && (
            <div className="font-normal text-sm select-none">
              {editContactMode === 'view' ? (
                /* VIEW / READ-ONLY MODE */
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center font-bold text-lg">
                        {selectedContact.firstName ? selectedContact.firstName.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">
                          {[selectedContact.lastName, selectedContact.firstName, selectedContact.middleName].filter(Boolean).join(' ')}
                        </h3>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Клиент CRM</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setEditContactMode('edit')} className="flex items-center gap-1.5 rounded-xl">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </Button>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact info */}
                    <div className="space-y-4">
                      {/* Phones */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Номера телефонов</span>
                        {selectedContact.phones && selectedContact.phones.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {selectedContact.phones.map((phone, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-text-primary bg-surface-secondary/40 border border-border/60 px-3 py-2 rounded-xl">
                                <Phone className="w-3.5 h-3.5 text-text-secondary" />
                                <span>{phone}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary/50 italic font-medium">Телефоны не указаны</span>
                        )}
                      </div>

                      {/* Emails */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Адреса Email</span>
                        {selectedContact.emails && selectedContact.emails.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {selectedContact.emails.map((email, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-mono font-semibold text-text-primary bg-surface-secondary/40 border border-border/60 px-3 py-2 rounded-xl">
                                <Mail className="w-3.5 h-3.5 text-text-secondary" />
                                <span>{email}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary/50 italic font-medium">Email не указаны</span>
                        )}
                      </div>
                    </div>

                    {/* Addresses and Tags */}
                    <div className="space-y-4">
                      {/* Addresses */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Физические адреса</span>
                        {selectedContact.addresses && selectedContact.addresses.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {selectedContact.addresses.map((addr, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-medium text-text-primary bg-surface-secondary/40 border border-border/60 px-3 py-2 rounded-xl">
                                <MapPin className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                <span className="truncate">{addr}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary/50 italic font-medium">Адреса не указаны</span>
                        )}
                      </div>

                      {/* Tags */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Теги контакта</span>
                        {selectedContact.tags && selectedContact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-surface-secondary/20 border border-border/80 rounded-2xl">
                            {selectedContact.tags.map((tag) => (
                              <Badge key={tag} variant="gray">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary/50 italic font-medium">Теги отсутствуют</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Заметки и описание</span>
                    {selectedContact.notes ? (
                      <div className="p-4 bg-surface-secondary/30 border border-border rounded-2xl text-xs text-text-primary leading-relaxed font-medium">
                        {selectedContact.notes}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary/50 italic font-medium">Нет дополнительных заметок</span>
                    )}
                  </div>

                  {/* Associated Deals */}
                  <div className="pt-4 border-t border-border">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-3">Связанные сделки</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {safeDb.deals.filter((d) => d.contactId === selectedContact.id).length > 0 ? (
                        safeDb.deals
                          .filter((d) => d.contactId === selectedContact.id)
                          .map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => handleContactDealClick(deal.id)}
                              className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border hover:bg-surface-secondary/40 cursor-pointer transition-all duration-150 group"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-text-primary truncate block group-hover:text-accent">
                                  {deal.title}
                                </span>
                                <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">
                                  {formatMoney(deal.amount)} • {deal.status}
                                </span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-transform group-hover:translate-x-0.5" />
                            </div>
                          ))
                      ) : (
                        <span className="text-xs text-text-secondary/50 italic font-medium">Связанных сделок нет</span>
                      )}
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button variant="secondary" onClick={() => setContactModalOpen(false)}>
                      Закрыть
                    </Button>
                  </div>
                </div>
              ) : (
                /* EDIT / CREATE MODE */
                <div className="space-y-5">
                  {/* Name segments */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Фамилия <span className="text-red-500">*</span></label>
                      <Input
                        value={selectedContact.lastName || ''}
                        onChange={(e) => setSelectedContact({ ...selectedContact, lastName: e.target.value })}
                        placeholder="Иванов"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Имя <span className="text-red-500">*</span></label>
                      <Input
                        value={selectedContact.firstName || ''}
                        onChange={(e) => setSelectedContact({ ...selectedContact, firstName: e.target.value })}
                        placeholder="Иван"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Отчество</label>
                      <Input
                        value={selectedContact.middleName || ''}
                        onChange={(e) => setSelectedContact({ ...selectedContact, middleName: e.target.value })}
                        placeholder="Иванович"
                      />
                    </div>
                  </div>

                  {/* PHONES MULTIPLE ARRAY VALUE - CUSTOM LIST */}
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Номера телефонов</label>
                    <div className="space-y-2">
                      {selectedContact.phones && selectedContact.phones.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedContact.phones.map((phone, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-surface-secondary/40 border border-border/80 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Phone className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                <span className="text-xs text-text-primary font-bold font-mono truncate">{phone}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (selectedContact.phones || []).filter((_, i) => i !== idx);
                                  setSelectedContact({ ...selectedContact, phones: updated });
                                }}
                                className="p-1 text-text-secondary hover:text-danger rounded-xl transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add dynamic cell */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                          <Input
                            placeholder="+7 (999) 000-00-00"
                            value={newPhoneInput}
                            onChange={(e) => setNewPhoneInput(e.target.value)}
                            className="pl-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newPhoneInput.trim()) {
                                e.preventDefault();
                                const updated = [...(selectedContact.phones || []), newPhoneInput.trim()];
                                setSelectedContact({ ...selectedContact, phones: updated });
                                setNewPhoneInput('');
                              }
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newPhoneInput.trim()) {
                              const updated = [...(selectedContact.phones || []), newPhoneInput.trim()];
                              setSelectedContact({ ...selectedContact, phones: updated });
                              setNewPhoneInput('');
                            } else {
                              showToast('Введите телефон для добавления.', 'error');
                            }
                          }}
                        >
                          Добавить
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* EMAILS MULTIPLE ARRAY VALUE - CUSTOM LIST */}
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Адреса Email</label>
                    <div className="space-y-2">
                      {selectedContact.emails && selectedContact.emails.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedContact.emails.map((email, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-surface-secondary/40 border border-border/80 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                <span className="text-xs text-text-primary font-mono truncate">{email}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (selectedContact.emails || []).filter((_, i) => i !== idx);
                                  setSelectedContact({ ...selectedContact, emails: updated });
                                }}
                                className="p-1 text-text-secondary hover:text-danger rounded-xl transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                          <Input
                            placeholder="example@mail.ru"
                            type="email"
                            value={newEmailInput}
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            className="pl-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newEmailInput.trim()) {
                                e.preventDefault();
                                const updated = [...(selectedContact.emails || []), newEmailInput.trim()];
                                setSelectedContact({ ...selectedContact, emails: updated });
                                setNewEmailInput('');
                              }
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newEmailInput.trim()) {
                              const updated = [...(selectedContact.emails || []), newEmailInput.trim()];
                              setSelectedContact({ ...selectedContact, emails: updated });
                              setNewEmailInput('');
                            } else {
                              showToast('Введите email для добавления.', 'error');
                            }
                          }}
                        >
                          Добавить
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ADDRESSES MULTIPLE ARRAY VALUE - CUSTOM LIST */}
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Физические адреса (Доставка, Фирма)</label>
                    <div className="space-y-2">
                      {selectedContact.addresses && selectedContact.addresses.length > 0 && (
                        <div className="space-y-1.5">
                          {selectedContact.addresses.map((addr, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-surface-secondary/40 border border-border/80 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                <span className="text-xs text-text-primary truncate">{addr}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (selectedContact.addresses || []).filter((_, i) => i !== idx);
                                  setSelectedContact({ ...selectedContact, addresses: updated });
                                }}
                                className="p-1 text-text-secondary hover:text-danger rounded-xl transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                          <Input
                            placeholder="Город, улица, офис..."
                            value={newAddressInput}
                            onChange={(e) => setNewAddressInput(e.target.value)}
                            className="pl-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newAddressInput.trim()) {
                                e.preventDefault();
                                const updated = [...(selectedContact.addresses || []), newAddressInput.trim()];
                                setSelectedContact({ ...selectedContact, addresses: updated });
                                setNewAddressInput('');
                              }
                            }}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newAddressInput.trim()) {
                              const updated = [...(selectedContact.addresses || []), newAddressInput.trim()];
                              setSelectedContact({ ...selectedContact, addresses: updated });
                              setNewAddressInput('');
                            } else {
                              showToast('Введите адрес для добавления.', 'error');
                            }
                          }}
                        >
                          Добавить
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* TAG CHIP EDITOR */}
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Теги контакта</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-surface-secondary/20 border border-border/80 rounded-2xl">
                      {(selectedContact.tags || []).length > 0 ? (
                        selectedContact.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="gray"
                            onRemove={() => {
                              const updated = (selectedContact.tags || []).filter((t) => t !== tag);
                              setSelectedContact({ ...selectedContact, tags: updated });
                            }}
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-text-secondary">Нет добавленных тегов</span>
                      )}
                    </div>
                    <div className="flex gap-2 select-all">
                      <Input
                        placeholder="Новый тег"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagInput.trim()) {
                            e.preventDefault();
                            const val = newTagInput.trim();
                            if (selectedContact.tags?.includes(val)) {
                              showToast('Этот тег уже существует.', 'error');
                              return;
                            }
                            const updated = [...(selectedContact.tags || []), val];
                            setSelectedContact({ ...selectedContact, tags: updated });
                            setNewTagInput('');
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const val = newTagInput.trim();
                          if (val) {
                            if (selectedContact.tags?.includes(val)) {
                              showToast('Этот тег уже существует.', 'error');
                              return;
                            }
                            const updated = [...(selectedContact.tags || []), val];
                            setSelectedContact({ ...selectedContact, tags: updated });
                            setNewTagInput('');
                          } else {
                            showToast('Введите тег.', 'error');
                          }
                        }}
                      >
                        Добавить
                      </Button>
                    </div>
                  </div>

                  {/* NOTES */}
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Заметки и описание</label>
                    <Textarea
                      placeholder="Дополнительные примечания к клиенту..."
                      value={selectedContact.notes || ''}
                      onChange={(e) => setSelectedContact({ ...selectedContact, notes: e.target.value })}
                    />
                  </div>

                  {/* BUTTONS SAVE CANCEL */}
                  <div className="flex items-center justify-between gap-3 pt-5 border-t border-border">
                    <div>
                      {editContactMode === 'edit' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => initiateDeleteContact(selectedContact.id!)}
                        >
                          Удалить контакт
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => {
                        if (editContactMode === 'edit') {
                          const original = safeDb.contacts.find((c) => c.id === selectedContact.id);
                          if (original) setSelectedContact(JSON.parse(JSON.stringify(original)));
                          setEditContactMode('view');
                        } else {
                          setContactModalOpen(false);
                        }
                      }}>
                        Отмена
                      </Button>
                      <Button variant="primary" onClick={saveContactForm}>
                        Сохранить
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ResponsiveModal>

        {/* DEALS CREATE / EDIT VIEW */}
        <ResponsiveModal
          isOpen={dealModalOpen}
          onClose={() => setDealModalOpen(false)}
          title={editDealMode === 'create' ? 'Создать сделку' : editDealMode === 'view' ? 'Просмотр сделки' : 'Редактировать сделку'}
          className="max-w-xl"
        >
          {selectedDeal && (
            <div className="font-normal text-sm select-none">
              {editDealMode === 'view' ? (
                /* VIEW / READ-ONLY MODE */
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center font-bold text-lg">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">
                          {selectedDeal.title}
                        </h3>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Сделка</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setEditDealMode('edit')} className="flex items-center gap-1.5 rounded-xl">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </Button>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Amount */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Сумма сделки</span>
                        <div className="text-lg font-bold text-text-primary">
                          {selectedDeal.amount?.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      
                      {/* Status Dropdown (Editable in view mode) */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Статус сделки</span>
                        <CustomDropdown
                          className="w-full"
                          placeholder="Статус"
                          value={selectedDeal.status || 'Новая'}
                          onChange={(val) => {
                            const updatedDeal = { ...selectedDeal, status: val as any };
                            setSelectedDeal(updatedDeal);
                            triggerAction('save_deal', updatedDeal, `Статус сделки "${updatedDeal.title}" изменен на ${val}.`);
                          }}
                          options={[
                            { value: 'Новая', label: 'Новая' },
                            { value: 'В работе', label: 'В работе' },
                            { value: 'Ожидание', label: 'Ожидание' },
                            { value: 'Успешно', label: 'Успешно' },
                            { value: 'Потеряна', label: 'Потеряна' }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Linked Contact */}
                      <div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Ответственный клиент</span>
                        {(() => {
                          const contact = safeDb.contacts.find((c) => c.id === selectedDeal.contactId);
                          if (contact) {
                            return (
                              <div
                                onClick={() => handleDealContactClick(selectedDeal.contactId!)}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:bg-surface-secondary/40 cursor-pointer bg-surface transition-colors duration-150 group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-text-primary group-hover:text-accent truncate">
                                    {contact.name} ({contact.emails?.[0] || contact.phones?.[0] || 'Нет контактов'})
                                  </span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                              </div>
                            );
                          }
                          return <span className="text-xs text-text-secondary/50 italic font-medium">Контакт удален или изменен.</span>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Описание сделки / КП</span>
                    {selectedDeal.description ? (
                      <div className="p-4 bg-surface-secondary/30 border border-border rounded-2xl text-xs text-text-primary leading-relaxed font-medium">
                        {selectedDeal.description}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary/50 italic font-medium">Нет описания</span>
                    )}
                  </div>
                </div>
              ) : (
                /* EDIT / CREATE MODE */
                <div className="space-y-5">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Название сделки <span className="text-red-500">*</span></label>
                    <Input
                      value={selectedDeal.title || ''}
                      onChange={(e) => setSelectedDeal({ ...selectedDeal, title: e.target.value })}
                      placeholder="КП на умного бота"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Описание сделки / КП</label>
                    <Textarea
                      placeholder="Дополнительные детали технического задания..."
                      value={selectedDeal.description || ''}
                      onChange={(e) => setSelectedDeal({ ...selectedDeal, description: e.target.value })}
                    />
                  </div>

                  {/* Selection lists: linked Client and status dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Linked Client Selector */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Связанный контакт / Клиент <span className="text-red-500">*</span></label>
                      <CustomDropdown
                        className="w-full"
                        placeholder="Выберите клиента"
                        value={selectedDeal.contactId || ''}
                        onChange={(val) => setSelectedDeal({ ...selectedDeal, contactId: val })}
                        options={[
                          { value: '', label: 'Выберите из списка', disabled: true },
                          ...safeDb.contacts.map((c) => ({ value: c.id, label: c.name }))
                        ]}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block font-sans">Статус сделки <span className="text-red-500">*</span></label>
                      <CustomDropdown
                        className="w-full"
                        placeholder="Статус"
                        value={selectedDeal.status || 'Новая'}
                        onChange={(val) => setSelectedDeal({ ...selectedDeal, status: val as any })}
                        options={[
                          { value: 'Новая', label: 'Новая' },
                          { value: 'В работе', label: 'В работе' },
                          { value: 'Ожидание', label: 'Ожидание' },
                          { value: 'Успешно', label: 'Успешно' },
                          { value: 'Потеряна', label: 'Потеряна' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Amount sum input field */}
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Сумма сделки (Рядом в Рублях) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={selectedDeal.amount || ''}
                        onChange={(e) => setSelectedDeal({ ...selectedDeal, amount: Number(e.target.value) || 0 })}
                        placeholder="250 000"
                        className="pr-8"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-neutral-400 select-none">₽</span>
                    </div>
                  </div>

                  {/* Quick linked contact overview detail link */}
                  {editDealMode === 'edit' && selectedDeal.contactId && (
                    <div className="pt-2 border-t border-neutral-100 select-all">
                      <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block mb-1.5">Ответственный клиент</span>
                      {(() => {
                        const contact = safeDb.contacts.find((c) => c.id === selectedDeal.contactId);
                        if (contact) {
                          return (
                            <div
                              onClick={() => handleDealContactClick(selectedDeal.contactId!)}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:bg-surface-secondary/40 cursor-pointer bg-surface transition-colors duration-150 group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-text-primary group-hover:text-accent truncate">
                                  {contact.name} ({contact.emails[0] || 'Телефон'})
                                </span>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                            </div>
                          );
                        }
                        return <span className="text-xs text-text-secondary/50 italic font-medium">Контакт удален или изменен.</span>;
                      })()}
                    </div>
                  )}

                  {/* SAVE CANCEL ACTIONS */}
                  <div className="flex items-center justify-between gap-3 pt-5 border-t border-neutral-100">
                    <div>
                      {editDealMode === 'edit' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => initiateDeleteDeal(selectedDeal.id!)}
                        >
                          Удалить сделку
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => {
                        if (editDealMode === 'edit') {
                          const original = safeDb.deals.find((d) => d.id === selectedDeal.id);
                          if (original) setSelectedDeal(JSON.parse(JSON.stringify(original)));
                          setEditDealMode('view');
                        } else {
                          setDealModalOpen(false);
                        }
                      }}>
                        Отмена
                      </Button>
                      <Button variant="primary" onClick={saveDealForm}>
                        Сохранить
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ResponsiveModal>

        {/* 4. REUSABLE DIALOG SYSTEM FOR CONFIRMED ACTIONS */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={executeDeleteTarget}
          title="Подтверждение удаления"
          message={
            deleteTarget?.type === 'contact'
              ? 'Вы действительно хотите навсегда удалить этот контакт? Все связанные с ним сделки и КП будут также безвозвратно удалены из базы данных CRM.'
              : 'Вы действительно хотите отменить и удалить выбранную сделку из базы данных?'
          }
          confirmLabel="Удалить"
          cancelLabel="Отмена"
        />

        <ConfirmDialog
          isOpen={regenerateConfirmOpen}
          onClose={() => setRegenerateConfirmOpen(false)}
          onConfirm={handleRegenerateApiKey}
          title="Перевыпуск API-ключа"
          message="Вы уверены, что хотите создать новый секретный ключ доступа? Все существующие AI-агенты, боты и внешние интеграции потеряют доступ по старому ключу и прекратят передачу сделок, пока вы не обновите токен на их стороне."
          confirmLabel="Перевыпустить"
          cancelLabel="Отмена"
        />

        {/* 5. OVERLAY PUSH NOTIFICATIONS BANNER */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-xs pointer-events-none">
          <AnimatePresence>
            {pushBanners.map((banner) => (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 50, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="bg-surface border border-border/80 text-text-primary p-3.5 rounded-2xl shadow-xl flex items-start gap-3 pointer-events-auto select-none w-80 relative overflow-hidden"
              >
                {/* Left Side Icon Indicator based on type & action */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  banner.action === 'created' ? 'bg-success/15 text-success' :
                  banner.action === 'updated' ? 'bg-accent-soft text-text-primary' :
                  banner.action === 'deleted' ? 'bg-danger/15 text-danger' : 'bg-surface-secondary text-text-secondary'
                }`}>
                  {banner.type === 'contact' ? <User className="w-4.5 h-4.5" /> :
                   banner.type === 'deal' ? <TrendingUp className="w-4.5 h-4.5" /> :
                   <Sparkles className="w-4.5 h-4.5" />}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-primary truncate">{banner.title}</span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-normal mt-0.5 font-semibold">{banner.details}</p>
                  
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40 text-[9px] text-text-secondary/70 font-bold uppercase tracking-wider">
                    <span>{banner.agentName ? `🤖 ${banner.agentName}` : 'CRM Система'}</span>
                    <span className="font-mono lowercase tracking-normal font-medium">{banner.time}</span>
                  </div>
                </div>
                
                {/* Close Button absolute top-2 right-2 */}
                <button
                  onClick={() => setPushBanners((current) => current.filter((b) => b.id !== banner.id))}
                  className="absolute top-2 right-2 p-1 text-text-secondary/50 hover:text-text-primary rounded-xl hover:bg-surface-secondary transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </CRMContext.Provider>
  );
};
