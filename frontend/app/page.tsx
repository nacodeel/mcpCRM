'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, SlidersHorizontal, Trash2, Edit3, Copy, Eye, EyeOff,
  RefreshCw, User, Mail, Phone, MapPin, Calendar, TrendingUp, Wallet,
  Check, X, FileText, ArrowRight, CheckCircle2, AlertCircle, Sparkles, HelpCircle,
  ShieldAlert, KeyRound
} from 'lucide-react';
import { useToast, Button, Input, Textarea, Select, Badge, Skeleton, ConfirmDialog, CustomDropdown } from '@/components/ui';
import { Sidebar, CRMSection } from '@/components/sidebar';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column, Pagination, EmptyState } from '@/components/data-table';
import { ResponsiveModal } from '@/components/modal';
import { CrmApiClient } from '@/lib/api';
import { CRMDatabase, Contact, Deal } from '@/lib/crm-db';
import { cn } from '@/lib/utils';

export default function CRMPage() {
  const { showToast } = useToast();

  // Core Database States
  const [db, setDb] = React.useState<CRMDatabase | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentSection, setCurrentSection] = React.useState<CRMSection>('dashboard');

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
  const [editContactMode, setEditContactMode] = React.useState<'create' | 'edit'>('create');

  const [dealModalOpen, setDealModalOpen] = React.useState(false);
  const [selectedDeal, setSelectedDeal] = React.useState<Partial<Deal> | null>(null);
  const [editDealMode, setEditDealMode] = React.useState<'create' | 'edit'>('create');

  // Input states inside modals
  const [newPhoneInput, setNewPhoneInput] = React.useState('');
  const [newEmailInput, setNewEmailInput] = React.useState('');
  const [newAddressInput, setNewAddressInput] = React.useState('');
  const [newTagInput, setNewTagInput] = React.useState('');



  // --- PUSH NOTIFICATION SYSTEM ---
  const [pushBanner, setPushBanner] = React.useState<{ id: string; title: string; message: string } | null>(null);

  const triggerPush = React.useCallback((title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setPushBanner({ id, title, message });

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setPushBanner(current => current?.id === id ? null : current);
    }, 6000);

    // native browser notification fallback (if permitted)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body: message });
        } catch (e) {
          console.log('Frame native push error:', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            try {
              new Notification(title, { body: message });
            } catch (e) {
              console.log('Frame native push error:', e);
            }
          }
        });
      }
    }
  }, []);




  // Search & Filter state for CONTACTS
  const [contactsSearch, setContactsSearch] = React.useState('');
  const [contactsPage, setContactsPage] = React.useState(1);
  const [contactsPageSize, setContactsPageSize] = React.useState(20);
  const [contactsSortField, setContactsSortField] = React.useState<string>('updatedAt');
  const [contactsSortDirection, setContactsSortDirection] = React.useState<'asc' | 'desc'>('desc');
  // Filters
  const [contactsFilterTag, setContactsFilterTag] = React.useState<string>('all');
  const [contactsFilterHasDeals, setContactsFilterHasDeals] = React.useState<string>('all'); // all, yes, no
  const [contactsFilterDate, setContactsFilterDate] = React.useState<string>('all'); // all, today, week

  // Search & Filter state for DEALS
  const [dealsSearch, setDealsSearch] = React.useState('');
  const [dealsPage, setDealsPage] = React.useState(1);
  const [dealsPageSize, setDealsPageSize] = React.useState(20);
  const [dealsSortField, setDealsSortField] = React.useState<string>('updatedAt');
  const [dealsSortDirection, setDealsSortDirection] = React.useState<'asc' | 'desc'>('desc');
  // Filters
  const [dealsFilterStatus, setDealsFilterStatus] = React.useState<string>('all');
  const [dealsFilterContact, setDealsFilterContact] = React.useState<string>('all');
  const [dealsMinAmount, setDealsMinAmount] = React.useState<string>('');
  const [dealsMaxAmount, setDealsMaxAmount] = React.useState<string>('');
  const [dealsFilterDate, setDealsFilterDate] = React.useState<string>('all');

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

          triggerPush(message.data.title || 'CRM обновлена', message.data.message || 'Данные обновлены');
          await fetchDB(true);
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
    setEditContactMode('edit');
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
    setEditDealMode('edit');
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

  // Switch sections dynamically or click on related entities
  const handleContactDealClick = (dealId: string) => {
    const deal = db?.deals.find(d => d.id === dealId);
    if (deal) {
      setContactModalOpen(false);
      setCurrentSection('deals');
      openEditDeal(deal);
    }
  };

  const handleDealContactClick = (contactId: string) => {
    const contact = db?.contacts.find(c => c.id === contactId);
    if (contact) {
      setDealModalOpen(false);
      setCurrentSection('contacts');
      openEditContact(contact);
    }
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

  // Analytics calculator
  const totalContactsCount = safeDb.contacts.length;
  const totalDealsCount = safeDb.deals.length;
  // Active deals sum (those are status matches which are not lost i.e., 'Новая', 'В работе', 'Ожидание', 'Успешно' or excluding 'Потеряна')
  const activeDealsSum = safeDb.deals
    .filter(d => d.status !== 'Потеряна')
    .reduce((sum, d) => sum + d.amount, 0);

  const newContactsLast7Days = safeDb.contacts.filter(c => isWithinLast7Days(c.updatedAt)).length;

  const sortedRecentContactsForDashboard = [...safeDb.contacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const sortedRecentDealsForDashboard = [...safeDb.deals]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);


  // CONTACTS DATATABLE FILTERING LOGIC
  const getFilteredContacts = () => {
    let result = [...safeDb.contacts];

    // 1. Search term match name, emails, phones, tags
    if (contactsSearch.trim() !== '') {
      const term = contactsSearch.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.emails.some(e => e.toLowerCase().includes(term)) ||
        c.phones.some(p => p.includes(term)) ||
        c.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    // 2. Filter Tag
    if (contactsFilterTag !== 'all') {
      result = result.filter(c => c.tags.includes(contactsFilterTag));
    }

    // 3. Filter Has Deals
    if (contactsFilterHasDeals === 'yes') {
      result = result.filter(c => c.dealIds.length > 0);
    } else if (contactsFilterHasDeals === 'no') {
      result = result.filter(c => c.dealIds.length === 0);
    }

    // 4. Filter Date
    if (contactsFilterDate === 'today') {
      result = result.filter(c => isToday(c.updatedAt));
    } else if (contactsFilterDate === 'week') {
      result = result.filter(c => isWithinLast7Days(c.updatedAt));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (contactsSortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (contactsSortField === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return contactsSortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  };

  const filteredContacts = getFilteredContacts();
  const contactsTotalPages = Math.ceil(filteredContacts.length / contactsPageSize) || 1;
  const paginatedContacts = filteredContacts.slice(
    (contactsPage - 1) * contactsPageSize,
    contactsPage * contactsPageSize
  );

  const getUniqueContactTags = () => {
    const tags = new Set<string>();
    safeDb.contacts.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  };


  // DEALS DATATABLE FILTERING LOGIC
  const getFilteredDeals = () => {
    let result = [...safeDb.deals];

    // 1. Search in title, description, or linked contact's name!
    if (dealsSearch.trim() !== '') {
      const term = dealsSearch.toLowerCase();
      result = result.filter(d => {
        const linkedContact = safeDb.contacts.find(c => c.id === d.contactId);
        return (
          d.title.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term) ||
          (linkedContact && linkedContact.name.toLowerCase().includes(term))
        );
      });
    }

    // 2. Filter by status
    if (dealsFilterStatus !== 'all') {
      result = result.filter(d => d.status === dealsFilterStatus);
    }

    // 3. Filter by connected contact
    if (dealsFilterContact !== 'all') {
      result = result.filter(d => d.contactId === dealsFilterContact);
    }

    // 4. Filter by amount range
    if (dealsMinAmount !== '') {
      result = result.filter(d => d.amount >= Number(dealsMinAmount));
    }
    if (dealsMaxAmount !== '') {
      result = result.filter(d => d.amount <= Number(dealsMaxAmount));
    }

    // 5. Filter by date update
    if (dealsFilterDate === 'today') {
      result = result.filter(d => isToday(d.updatedAt));
    } else if (dealsFilterDate === 'week') {
      result = result.filter(d => isWithinLast7Days(d.updatedAt));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (dealsSortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (dealsSortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (dealsSortField === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return dealsSortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  };

  const filteredDeals = getFilteredDeals();
  const dealsTotalPages = Math.ceil(filteredDeals.length / dealsPageSize) || 1;
  const paginatedDeals = filteredDeals.slice(
    (dealsPage - 1) * dealsPageSize,
    dealsPage * dealsPageSize
  );

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

  // Contacts Table columns configuration
  const contactColumns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Имя контакта',
      sortable: true,
      render: (contact) => (
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-neutral-800 hover:text-neutral-900 leading-normal">{contact.name}</span>
        </div>
      )
    },
    {
      key: 'phones',
      header: 'Телефоны',
      render: (contact) => (
        <div className="flex flex-col gap-1 max-w-[170px]">
          {contact.phones.length > 0 ? (
            contact.phones.map((p, idx) => (
              <span key={idx} className="inline-flex items-center text-[11px] text-[#1A1A1A] font-medium bg-[#F5F5F4] border border-[#EDEDED] px-1.5 py-0.5 rounded-md truncate">
                {p}
              </span>
            ))
          ) : (
            <span className="text-xs text-neutral-300">—</span>
          )}
        </div>
      )
    },
    {
      key: 'emails',
      header: 'Email',
      render: (contact) => (
        <div className="flex flex-col gap-1 max-w-[200px]">
          {contact.emails.length > 0 ? (
            contact.emails.map((e, idx) => (
              <span key={idx} className="inline-flex items-center text-[11px] text-[#1A1A1A] font-mono bg-[#F9F9F8] border border-[#EDEDED] px-1.5 py-0.5 rounded-md truncate">
                {e}
              </span>
            ))
          ) : (
            <span className="text-xs text-neutral-300">—</span>
          )}
        </div>
      )
    },
    {
      key: 'tags',
      header: 'Теги',
      render: (contact) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {contact.tags.length > 0 ? (
            contact.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="gray">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-neutral-300">—</span>
          )}
        </div>
      )
    },
    {
      key: 'deals',
      header: 'Сделки',
      render: (contact) => {
        const count = contact.dealIds.length;
        if (count > 0) {
          return (
            <Badge variant="emerald" className="font-medium">
              {count} {count === 1 ? 'сделка' : count < 5 ? 'сделки' : 'сделок'}
            </Badge>
          );
        }
        return <span className="text-xs text-neutral-300">—</span>;
      }
    },
    {
      key: 'updatedAt',
      header: 'Обновлён',
      sortable: true,
      render: (contact) => (
        <span className="text-xs text-neutral-400 font-mono">
          {formatDate(contact.updatedAt)}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (contact) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            title="Редактировать"
            onClick={() => openEditContact(contact)}
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Удалить"
            className="hover:text-red-600 hover:bg-red-50"
            onClick={(e) => initiateDeleteContact(contact.id, e)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  // Deals columns configuration
  const dealColumns: Column<Deal>[] = [
    {
      key: 'title',
      header: 'Название сделки',
      sortable: true,
      render: (deal) => (
        <div className="flex flex-col">
          <span className="font-semibold text-neutral-800 leading-normal">{deal.title}</span>
          {deal.description && (
            <span className="text-[11px] text-neutral-400 truncate max-w-[220px] font-normal leading-normal mt-0.5">
              {deal.description}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Контакт',
      render: (deal) => {
        const contact = safeDb.contacts.find((c) => c.id === deal.contactId);
        if (contact) {
          return (
            <div className="flex items-center gap-1.5 hover:underline" onClick={(e) => { e.stopPropagation(); handleDealContactClick(deal.contactId); }}>
              <span className="text-xs text-neutral-700 font-medium truncate max-w-[120px]">
                {contact.name}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-red-400">Удален или отсутствует</span>;
      }
    },
    {
      key: 'amount',
      header: 'Сумма',
      sortable: true,
      render: (deal) => (
        <span className="font-medium text-neutral-800">
          {formatMoney(deal.amount)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (deal) => (
        <Badge variant={getDealStatusBadgeVariant(deal.status)} className="font-semibold text-[11px]">
          {deal.status}
        </Badge>
      )
    },
    {
      key: 'updatedAt',
      header: 'Обновлена',
      sortable: true,
      render: (deal) => (
        <span className="text-xs text-neutral-400 font-mono">
          {formatDate(deal.updatedAt)}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (deal) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            title="Редактировать"
            onClick={() => openEditDeal(deal)}
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Удалить"
            className="hover:text-red-600 hover:bg-red-50"
            onClick={(e) => initiateDeleteDeal(deal.id, e)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#F9F9F8] text-[#1A1A1A] font-sans antialiased overflow-hidden">
      {/* 1. SIDEBAR Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSectionChange={(sec) => {
          setCurrentSection(sec);
        }}
        userName={safeDb.profile.name}
        userEmail={safeDb.profile.email}
        onLogout={handleLogout}
      />

      {/* 2. MAIN WORKING REGION */}
      <main className="flex-1 overflow-y-auto scrollbar-none h-full relative mx-auto w-full transition-all duration-150 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">


        <AnimatePresence mode="wait">
          {currentSection === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <PageHeader
                title="Сводный дашборд"
                description="Текущие показатели и быстрая аналитика активности вашей CRM."
              />

              {/* Stat cards panel */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#EDEDED] p-5 rounded-lg flex flex-col justify-between h-28 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-[#666666] uppercase">Всего контактов</span>
                    <div className="p-1 px-1.5 rounded-sm bg-[#F5F5F4] text-[#1A1A1A]">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-[#1A1A1A] leading-none">{totalContactsCount}</span>
                    <p className="text-[10px] text-[#666666] mt-1 leading-none font-normal">Добавлены вручную или по API</p>
                  </div>
                </div>

                <div className="bg-white border border-[#EDEDED] p-5 rounded-lg flex flex-col justify-between h-28 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-[#666666] uppercase">Сделок верифицировано</span>
                    <div className="p-1 px-1.5 rounded-sm bg-[#F5F5F4] text-[#1A1A1A]">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-[#1A1A1A] leading-none">{totalDealsCount}</span>
                    <p className="text-[10px] text-[#666666] mt-1 leading-none font-normal">Всего комм. предложений</p>
                  </div>
                </div>

                <div className="bg-white border border-[#EDEDED] p-5 rounded-lg flex flex-col justify-between h-28 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-[#666666] uppercase">Объем активных сделок</span>
                    <div className="p-1 px-1.5 rounded-sm bg-[#F5F5F4] text-[#1A1A1A]">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-[#059669] leading-none">{formatMoney(activeDealsSum)}</span>
                    <p className="text-[10px] text-[#666666] mt-1 leading-none font-normal">Исключая статус «Потеряна»</p>
                  </div>
                </div>

                <div className="bg-white border border-[#EDEDED] p-5 rounded-lg flex flex-col justify-between h-28 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-[#666666] uppercase">Новые за 7 дней</span>
                    <div className="p-1 px-1.5 rounded-sm bg-[#F5F5F4] text-[#1A1A1A]">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-[#1A1A1A] leading-none">+{newContactsLast7Days}</span>
                    <p className="text-[10px] text-[#666666] mt-1 leading-none font-normal">Лидогенерация AI агентами</p>
                  </div>
                </div>
              </div>

              {/* Split Feed Recent Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* RECENT CONTACTS CARDELE */}
                <div className="bg-white border border-[#EDEDED] rounded-lg p-5 space-y-4 shadow-none">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EDEDED]">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Последние контакты</h3>
                    <button
                      onClick={() => setCurrentSection('contacts')}
                      className="text-xs text-[#666666] hover:text-[#1A1A1A] font-medium inline-flex items-center gap-1 transition-colors group"
                    >
                      <span>Все контакты</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  {sortedRecentContactsForDashboard.length > 0 ? (
                    <div className="divide-y divide-[#EDEDED]">
                      {sortedRecentContactsForDashboard.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => openEditContact(c)}
                          className="py-3 flex items-center justify-between cursor-pointer hover:bg-[#F9F9F8] rounded-md px-2 -mx-2 transition-all duration-100"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-[#1A1A1A] truncate block">{c.name}</span>
                              <span className="text-[11px] text-[#666666] truncate block">
                                {c.emails[0] || c.phones[0] || 'Контактов нет'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#666666] flex-shrink-0 font-mono">
                            {formatDate(c.updatedAt).split(',')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-[#666666] italic">Нет добавленных контактов.</div>
                  )}
                </div>

                {/* RECENT DEALS CARDELE */}
                <div className="bg-white border border-[#EDEDED] rounded-lg p-5 space-y-4 shadow-none">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EDEDED]">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Последние сделки</h3>
                    <button
                      onClick={() => setCurrentSection('deals')}
                      className="text-xs text-[#666666] hover:text-[#1A1A1A] font-medium inline-flex items-center gap-1 transition-colors group"
                    >
                      <span>Все сделки</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  {sortedRecentDealsForDashboard.length > 0 ? (
                    <div className="divide-y divide-[#EDEDED]">
                      {sortedRecentDealsForDashboard.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => openEditDeal(d)}
                          className="py-3 flex items-center justify-between cursor-pointer hover:bg-[#F9F9F8] rounded-md px-2 -mx-2 transition-all duration-100"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <span className="text-sm font-medium text-[#1A1A1A] truncate block">{d.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant={getDealStatusBadgeVariant(d.status)} className="text-[10px] px-1.5 py-0">
                                {d.status}
                              </Badge>
                              <span className="text-[11px] text-[#1A1A1A] font-semibold">{formatMoney(d.amount)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#666666] flex-shrink-0 font-mono">
                            {formatDate(d.updatedAt).split(',')[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-[#666666] italic">Нет активных сделок.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentSection === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <PageHeader
                title="Клиенты и контакты"
                description="База данных ваших клиентов с поддержкой поиска, фильтрации тегов и сделок."
                actions={
                  <Button variant="primary" onClick={openCreateContact}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Добавить контакт
                  </Button>
                }
              />

              {/* SEARCH & FILTER CONTROLS */}
              <div className="bg-white border border-[#EDEDED] rounded-lg p-4 space-y-3 shadow-none select-none">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]/60" />
                    <input
                      type="text"
                      placeholder="Поиск по имени, email, телефону или тегу..."
                      value={contactsSearch}
                      onChange={(e) => {
                        setContactsSearch(e.target.value);
                        setContactsPage(1); // Reset page on query
                      }}
                      className="w-full bg-white border border-[#EDEDED] rounded-md pl-9 pr-4 py-2 text-xs text-[#1A1A1A] placeholder-[#666666]/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] transition-all duration-150"
                    />
                    {contactsSearch && (
                      <button
                        onClick={() => {
                          setContactsSearch('');
                          setContactsPage(1);
                        }}
                        className="absolute right-3 top-2.5 p-0.5 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F4] rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tag select filter */}
                    <CustomDropdown
                      className="w-36"
                      placeholder="Все теги"
                      value={contactsFilterTag}
                      onChange={(val) => {
                        setContactsFilterTag(val);
                        setContactsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Все теги' },
                        ...getUniqueContactTags().map((tag) => ({ value: tag, label: `Тег: ${tag}` }))
                      ]}
                    />

                    {/* Has deal select filter */}
                    <CustomDropdown
                      className="w-36"
                      placeholder="Сделки: Все"
                      value={contactsFilterHasDeals}
                      onChange={(val) => {
                        setContactsFilterHasDeals(val);
                        setContactsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Сделки: Все' },
                        { value: 'yes', label: 'Есть сделки' },
                        { value: 'no', label: 'Нет сделок' }
                      ]}
                    />

                    {/* Updated date select filter */}
                    <CustomDropdown
                      className="w-40"
                      placeholder="Дата обновления"
                      value={contactsFilterDate}
                      onChange={(val) => {
                        setContactsFilterDate(val);
                        setContactsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Дата обновления' },
                        { value: 'today', label: 'Обновлено сегодня' },
                        { value: 'week', label: 'За последние 7 дней' }
                      ]}
                    />
                  </div>
                </div>

                {/* ACTIVE FILTER CHIPS ROW */}
                {(contactsSearch || contactsFilterTag !== 'all' || contactsFilterHasDeals !== 'all' || contactsFilterDate !== 'all') && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100 text-xs text-neutral-400">
                    <span className="font-normal text-neutral-400">Активные фильтры:</span>
                    {contactsSearch && (
                      <Badge variant="gray" onRemove={() => { setContactsSearch(''); setContactsPage(1); }}>
                        Поиск: {contactsSearch}
                      </Badge>
                    )}
                    {contactsFilterTag !== 'all' && (
                      <Badge variant="gray" onRemove={() => { setContactsFilterTag('all'); setContactsPage(1); }}>
                        Тег: {contactsFilterTag}
                      </Badge>
                    )}
                    {contactsFilterHasDeals !== 'all' && (
                      <Badge variant="gray" onRemove={() => { setContactsFilterHasDeals('all'); setContactsPage(1); }}>
                        Сделки: {contactsFilterHasDeals === 'yes' ? 'Есть' : 'Нет'}
                      </Badge>
                    )}
                    {contactsFilterDate !== 'all' && (
                      <Badge variant="gray" onRemove={() => { setContactsFilterDate('all'); setContactsPage(1); }}>
                        Дата: {contactsFilterDate === 'today' ? 'Сегодня' : '7 дней'}
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        setContactsSearch('');
                        setContactsFilterTag('all');
                        setContactsFilterHasDeals('all');
                        setContactsFilterDate('all');
                        setContactsPage(1);
                      }}
                      className="text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer hover:underline transition-all duration-150 ml-1"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>

              {/* UNIFIED DATA TABLE FOR CONTACTS */}
              {filteredContacts.length > 0 ? (
                <div className="space-y-4">
                  <DataTable
                    data={paginatedContacts}
                    columns={contactColumns}
                    sortField={contactsSortField}
                    sortDirection={contactsSortDirection}
                    onSort={(field) => {
                      if (contactsSortField === field) {
                        setContactsSortDirection(contactsSortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setContactsSortField(field);
                        setContactsSortDirection('desc');
                      }
                      setContactsPage(1);
                    }}
                    onRowClick={(contact) => openEditContact(contact)}
                  />
                  <Pagination
                    currentPage={contactsPage}
                    totalCount={filteredContacts.length}
                    pageSize={contactsPageSize}
                    onPageChange={(page) => setContactsPage(page)}
                    onPageSizeChange={(size) => {
                      setContactsPageSize(size);
                      setContactsPage(1);
                    }}
                  />
                </div>
              ) : (
                <EmptyState
                  title="Контакты не найдены"
                  description="В вашей базе данных пока нет контактов, соответствующих данным фильтрам поиска."
                  actionLabel="Создать первый контакт"
                  onAction={openCreateContact}
                />
              )}
            </motion.div>
          )}

          {currentSection === 'deals' && (
            <motion.div
              key="deals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <PageHeader
                title="Сделки и продажи"
                description="Унифицированный реестр коммерческих проектов и статусов взаимодействия."
                actions={
                  <Button variant="primary" onClick={openCreateDeal}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Создать сделку
                  </Button>
                }
              />

              {/* SEARCH & FILTERS FOR DEALS */}
              <div className="bg-white border border-[#EDEDED] rounded-lg p-4 space-y-3 shadow-none select-none">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]/60" />
                    <input
                      type="text"
                      placeholder="Поиск по названию сделки, КП, описанию или клиенту..."
                      value={dealsSearch}
                      onChange={(e) => {
                        setDealsSearch(e.target.value);
                        setDealsPage(1);
                      }}
                      className="w-full bg-white border border-[#EDEDED] rounded-md pl-9 pr-4 py-2 text-xs text-[#1A1A1A] placeholder-[#666666]/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] transition-all duration-150"
                    />
                    {dealsSearch && (
                      <button
                        onClick={() => {
                          setDealsSearch('');
                          setDealsPage(1);
                        }}
                        className="absolute right-3 top-2.5 p-0.5 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F4] rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status filter selection */}
                    <CustomDropdown
                      className="w-36"
                      placeholder="Все статусы"
                      value={dealsFilterStatus}
                      onChange={(val) => {
                        setDealsFilterStatus(val);
                        setDealsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Все статусы' },
                        { value: 'Новая', label: 'Новая' },
                        { value: 'В работе', label: 'В работе' },
                        { value: 'Ожидание', label: 'Ожидание' },
                        { value: 'Успешно', label: 'Успешно' },
                        { value: 'Потеряна', label: 'Потеряна' }
                      ]}
                    />

                    {/* Contact filter list */}
                    <CustomDropdown
                      className="w-48"
                      placeholder="Все клиенты"
                      value={dealsFilterContact}
                      onChange={(val) => {
                        setDealsFilterContact(val);
                        setDealsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Все клиенты' },
                        ...safeDb.contacts.map((c) => ({ value: c.id, label: c.name }))
                      ]}
                    />

                    {/* Updated date range filter */}
                    <CustomDropdown
                      className="w-36"
                      placeholder="Дата сделки"
                      value={dealsFilterDate}
                      onChange={(val) => {
                        setDealsFilterDate(val);
                        setDealsPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Дата сделки' },
                        { value: 'today', label: 'Обновлено сегодня' },
                        { value: 'week', label: 'За последние 7 дней' }
                      ]}
                    />
                  </div>
                </div>

                {/* Amount range filtering input */}
                <div className="flex flex-wrap items-center gap-4 text-xs select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Сумма от:</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={dealsMinAmount}
                      onChange={(e) => {
                        setDealsMinAmount(e.target.value);
                        setDealsPage(1);
                      }}
                      className="w-24 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs text-neutral-800 placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">до:</span>
                    <input
                      type="number"
                      placeholder="999 999"
                      value={dealsMaxAmount}
                      onChange={(e) => {
                        setDealsMaxAmount(e.target.value);
                        setDealsPage(1);
                      }}
                      className="w-24 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs text-neutral-800 placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:bg-white"
                    />
                    <span className="text-neutral-400">₽</span>
                  </div>

                  {/* RESET BUTTON */}
                  {(dealsMinAmount || dealsMaxAmount) && (
                    <button
                      onClick={() => {
                        setDealsMinAmount('');
                        setDealsMaxAmount('');
                        setDealsPage(1);
                      }}
                      className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-800 hover:underline cursor-pointer"
                    >
                      Сбросить сумму
                    </button>
                  )}
                </div>

                {/* ACTIVE CHIP CHURN */}
                {(dealsSearch || dealsFilterStatus !== 'all' || dealsFilterContact !== 'all' || dealsFilterDate !== 'all' || dealsMinAmount || dealsMaxAmount) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-neutral-100 text-xs text-neutral-400">
                    <span className="font-normal text-neutral-400">Активные фильтры:</span>
                    {dealsSearch && (
                      <Badge variant="gray" onRemove={() => { setDealsSearch(''); setDealsPage(1); }}>
                        Поиск: {dealsSearch}
                      </Badge>
                    )}
                    {dealsFilterStatus !== 'all' && (
                      <Badge variant="gray" onRemove={() => { setDealsFilterStatus('all'); setDealsPage(1); }}>
                        Статус: {dealsFilterStatus}
                      </Badge>
                    )}
                    {dealsFilterContact !== 'all' && (() => {
                      const contactName = safeDb.contacts.find(c => c.id === dealsFilterContact)?.name || '...';
                      return (
                        <Badge variant="gray" onRemove={() => { setDealsFilterContact('all'); setDealsPage(1); }}>
                          Контакт: {contactName}
                        </Badge>
                      );
                    })()}
                    {dealsFilterDate !== 'all' && (
                      <Badge variant="gray" onRemove={() => { setDealsFilterDate('all'); setDealsPage(1); }}>
                        Дата: {dealsFilterDate === 'today' ? 'Сегодня' : '7 дней'}
                      </Badge>
                    )}
                    {(dealsMinAmount || dealsMaxAmount) && (
                      <Badge variant="gray" onRemove={() => { setDealsMinAmount(''); setDealsMaxAmount(''); setDealsPage(1); }}>
                        Диапазон сумм
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        setDealsSearch('');
                        setDealsFilterStatus('all');
                        setDealsFilterContact('all');
                        setDealsFilterDate('all');
                        setDealsMinAmount('');
                        setDealsMaxAmount('');
                        setDealsPage(1);
                      }}
                      className="text-[11px] font-bold text-neutral-700 hover:text-neutral-900 cursor-pointer hover:underline transition-all duration-150 ml-1"
                    >
                      Сбросить все
                    </button>
                  </div>
                )}
              </div>

              {/* UNIFIED DATA TABLE FOR DEALS */}
              {filteredDeals.length > 0 ? (
                <div className="space-y-4 font-normal">
                  <DataTable
                    data={paginatedDeals}
                    columns={dealColumns}
                    sortField={dealsSortField}
                    sortDirection={dealsSortDirection}
                    onSort={(field) => {
                      if (dealsSortField === field) {
                        setDealsSortDirection(dealsSortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setDealsSortField(field);
                        setDealsSortDirection('desc');
                      }
                      setDealsPage(1);
                    }}
                    onRowClick={(deal) => openEditDeal(deal)}
                  />
                  <Pagination
                    currentPage={dealsPage}
                    totalCount={filteredDeals.length}
                    pageSize={dealsPageSize}
                    onPageChange={(page) => setDealsPage(page)}
                    onPageSizeChange={(size) => {
                      setDealsPageSize(size);
                      setDealsPage(1);
                    }}
                  />
                </div>
              ) : (
                <EmptyState
                  title="Сделки не найдены"
                  description="В вашей базе данных пока нет открытых или завершенных сделок, соответствующих критериям фильтрации."
                  actionLabel="Создать первую сделку"
                  onAction={openCreateDeal}
                />
              )}
            </motion.div>
          )}



          {currentSection === 'integration' && (
            <motion.div
              key="integration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <PageHeader
                title="Подключение AI-агентов"
                description="Интеграция сторонних ИИ помощников, ботов продаж и лидогенераторов напрямую в CRM через API."
              />

              {/* MCP Keys Management */}
              <div className="bg-white border border-neutral-200/50 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] font-normal space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-neutral-800">Управление ключами доступа</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-lg">Создайте ключи (API Tokens) для ваших AI-агентов. Вы можете выпустить до 10 активных ключей.</p>
                  </div>
                </div>

                {/* Create Key Form */}
                <div className="flex flex-col md:flex-row items-end gap-3 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                  <div className="flex-[2] w-full space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Название ключа</label>
                    <Input
                      value={newMcpKeyName}
                      onChange={(e) => setNewMcpKeyName(e.target.value)}
                      placeholder="Например: Агент поддержки"
                      maxLength={120}
                    />
                  </div>
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Права доступа</label>
                    <Select
                      value={selectedAccessLevel}
                      onChange={(e) => setSelectedAccessLevel(e.target.value)}
                      options={[
                        { value: 'crm:admin', label: 'Администратор (Полный доступ)' },
                        { value: 'crm:read', label: 'Только чтение' },
                        { value: 'crm:read,contacts:write', label: 'Чтение и Запись (Без удаления)' },
                        { value: 'crm:read,crm:write', label: 'Чтение, Запись и Удаление' },
                      ]}
                    />
                  </div>
                  <Button onClick={handleCreateMcpKey} disabled={!newMcpKeyName.trim()} variant="primary" className="w-full md:w-auto h-10">
                    <Plus className="w-4 h-4 mr-2" />
                    Выпустить ключ
                  </Button>
                </div>

                {/* Keys List */}
                {mcpKeyLoading ? (
                  <div className="py-8 text-center text-sm text-neutral-500 animate-pulse">Загрузка ключей...</div>
                ) : mcpKeys.length === 0 ? (
                  <div className="py-8 text-center bg-neutral-50 rounded-lg border border-neutral-100 border-dashed">
                    <ShieldAlert className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-neutral-700">Нет активных ключей</h4>
                    <p className="text-xs text-neutral-500 mt-1">Выпустите первый ключ для подключения AI-агента</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                          <th className="px-4 py-3 font-medium">Название</th>
                          <th className="px-4 py-3 font-medium">Роли / Scopes</th>
                          <th className="px-4 py-3 font-medium">Создан</th>
                          <th className="px-4 py-3 font-medium">Последнее исп.</th>
                          <th className="px-4 py-3 font-medium text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        {mcpKeys.map((k) => (
                          <tr key={k.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-neutral-800">
                              <div className="flex items-center gap-2">
                                <div className={'w-2 h-2 rounded-full ' + (k.is_active ? 'bg-emerald-500' : 'bg-red-500')} />
                                {k.name}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {k.scopes?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {k.scopes.map((s: string) => {
                                    let label = s;
                                    let color = 'bg-blue-50 text-blue-700 border-blue-200';
                                    if (s === 'crm:admin') { label = 'Админ'; color = 'bg-red-50 text-red-700 border-red-200'; }
                                    else if (s === 'crm:read') { label = 'Чтение'; color = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
                                    else if (s === 'crm:write') { label = 'Запись и Удаление'; color = 'bg-amber-50 text-amber-700 border-amber-200'; }
                                    else if (s === 'contacts:write') { label = 'Запись'; color = 'bg-indigo-50 text-indigo-700 border-indigo-200'; }
                                    return (
                                      <span key={s} className={`border text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${color}`}>{label}</span>
                                    );
                                  })}
                                </div>
                              ) : <span className="text-neutral-400 text-xs italic">Полный доступ</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                              {new Date(k.created_at).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                              {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('ru-RU') : 'Никогда'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                onClick={() => handleDeleteMcpKey(k.id)}
                              >
                                Удалить
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* End of Integration UI */}
            </motion.div>
          )}


        </AnimatePresence>
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
      </ResponsiveModal>      {/* CONTACTS CREATE / EDIT VIEW */}
      <ResponsiveModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title={editContactMode === 'create' ? 'Новый контакт' : 'Карточка контакта'}
        className="max-w-2xl"
      >
        {selectedContact && (
          <div className="space-y-5 font-normal text-sm select-none">
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
                      <div key={idx} className="flex items-center justify-between bg-[#F9F9F8] border border-[#EDEDED] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-[#666666]/60 flex-shrink-0" />
                          <span className="text-xs text-[#1A1A1A] font-medium font-mono truncate">{phone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (selectedContact.phones || []).filter((_, i) => i !== idx);
                            setSelectedContact({ ...selectedContact, phones: updated });
                          }}
                          className="p-1 text-[#666666] hover:text-red-500 rounded transition-colors"
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
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]/40" />
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
                      <div key={idx} className="flex items-center justify-between bg-[#F9F9F8] border border-[#EDEDED] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-[#666666]/60 flex-shrink-0" />
                          <span className="text-xs text-[#1A1A1A] font-mono truncate">{email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (selectedContact.emails || []).filter((_, i) => i !== idx);
                            setSelectedContact({ ...selectedContact, emails: updated });
                          }}
                          className="p-1 text-[#666666] hover:text-red-500 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]/40" />
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
                      <div key={idx} className="flex items-center justify-between bg-[#F9F9F8] border border-[#EDEDED] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-[#666666]/60 flex-shrink-0" />
                          <span className="text-xs text-[#1A1A1A] truncate">{addr}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (selectedContact.addresses || []).filter((_, i) => i !== idx);
                            setSelectedContact({ ...selectedContact, addresses: updated });
                          }}
                          className="p-1 text-[#666666] hover:text-red-500 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]/40" />
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
              <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50/50 border border-neutral-200/80 rounded-lg">
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
                  <span className="text-xs text-neutral-400">Нет добавленных тегов</span>
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

            {/* ASSOCIATED DEALS CHIPS */}
            {editContactMode === 'edit' && (
              <div className="space-y-2 select-all pt-2 border-t border-neutral-100">
                <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Связанные сделки</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {safeDb.deals.filter((d) => d.contactId === selectedContact.id).length > 0 ? (
                    safeDb.deals
                      .filter((d) => d.contactId === selectedContact.id)
                      .map((deal) => (
                        <div
                          key={deal.id}
                          onClick={() => handleContactDealClick(deal.id)}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 cursor-pointer transition-all duration-100 group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-neutral-800 truncate block group-hover:text-black">
                              {deal.title}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-medium">
                              {formatMoney(deal.amount)} • {deal.status}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      ))
                  ) : (
                    <span className="text-xs text-neutral-400 italic">Связанных сделок нет.</span>
                  )}
                </div>
              </div>
            )}

            {/* BUTTONS SAVE CANCEL */}
            <div className="flex items-center justify-between gap-3 pt-5 border-t border-neutral-100">
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
                <Button variant="ghost" onClick={() => setContactModalOpen(false)}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={saveContactForm}>
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* DEALS CREATE / EDIT VIEW */}
      <ResponsiveModal
        isOpen={dealModalOpen}
        onClose={() => setDealModalOpen(false)}
        title={editDealMode === 'create' ? 'Создать сделку' : 'Карточка сделки'}
        className="max-w-xl"
      >
        {selectedDeal && (
          <div className="space-y-5 font-normal text-sm select-none">
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
                        className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-5 light:hover:text-black cursor-pointer bg-neutral-50/50 transition-colors duration-100 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 truncate">
                            {contact.name} ({contact.emails[0] || 'Телефон'})
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    );
                  }
                  return <span className="text-xs text-neutral-400">Контакт удален или изменен.</span>;
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
                <Button variant="ghost" onClick={() => setDealModalOpen(false)}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={saveDealForm}>
                  Сохранить
                </Button>
              </div>
            </div>
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
          {pushBanner && (
            <motion.div
              key={pushBanner.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 30 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-[#1A1A1A] border border-neutral-800 text-white p-4 rounded-xl shadow-xl flex items-start gap-3 pointer-events-auto select-none"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-neutral-100 truncate">{pushBanner.title}</span>
                  <button
                    onClick={() => setPushBanner(null)}
                    className="p-0.5 text-neutral-500 hover:text-white rounded-md transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-neutral-300 leading-normal mt-1">{pushBanner.message}</p>
                <div className="text-[8px] text-neutral-500 font-mono mt-2 text-right">
                  сейчас
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
