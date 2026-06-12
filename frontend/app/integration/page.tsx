'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Plus, ShieldAlert, KeyRound, Check, Info } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { useCRM } from '@/context/crm-context';
import { ResponsiveModal } from '@/components/modal';
import { CrmApiClient } from '@/lib/api';

// Clean Switch component for toggle settings
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-accent' : 'bg-border'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default function IntegrationPage() {
  const {
    mcpKeys,
    mcpKeyLoading,
    setNewRawToken,
    handleDeleteMcpKey,
    fetchMcpKeys
  } = useCRM();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  
  // Scopes local state
  const [isAdmin, setIsAdmin] = React.useState(true);
  const [scopes, setScopes] = React.useState({
    read: true,
    write: true,
    contactsWrite: false
  });

  const [isCreating, setIsCreating] = React.useState(false);

  // Sync sub-scopes when admin is toggled
  React.useEffect(() => {
    if (isAdmin) {
      setScopes({ read: true, write: true, contactsWrite: false });
    }
  }, [isAdmin]);

  const handleToggleScope = (key: 'read' | 'write' | 'contactsWrite') => {
    setScopes(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // If any specific scope changes, turn off general Admin toggle if it doesn't align
      if (isAdmin) {
        setIsAdmin(false);
      }
      return next;
    });
  };

  const handleOpenModal = () => {
    setNewKeyName('');
    setIsAdmin(true);
    setScopes({ read: true, write: true, contactsWrite: false });
    setIsModalOpen(true);
  };

  const handleCreateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      // Build scopes list based on toggles
      let scopesList: string[] = [];
      if (isAdmin) {
        scopesList = ['crm:admin'];
      } else {
        if (scopes.read) scopesList.push('crm:read');
        if (scopes.write) scopesList.push('crm:write');
        if (scopes.contactsWrite) scopesList.push('contacts:write');
      }

      if (scopesList.length === 0) {
        scopesList = ['crm:read']; // fallback default
      }

      const res = await CrmApiClient.createMcpKey(newKeyName.trim(), scopesList);
      if (res.success && res.data) {
        setNewRawToken(res.data.raw_token);
        setIsModalOpen(false);
        fetchMcpKeys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      <PageHeader
        title="Подключение AI-агентов"
        description="Интеграция сторонних ИИ помощников, ботов продаж и лидогенераторов напрямую в CRM через API."
        actions={
          <Button variant="primary" onClick={handleOpenModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Выпустить API-ключ
          </Button>
        }
      />

      {/* MCP Keys Management */}
      <div className="bg-surface border border-border/80 rounded-2xl p-6 shadow-sm space-y-6 select-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Управление ключами доступа</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-lg font-medium">Ключи доступа (API Tokens) позволяют подключить AI-агентов. Вы можете выпустить до 10 активных ключей.</p>
          </div>
        </div>

        {/* Keys List */}
        {mcpKeyLoading ? (
          <div className="py-8 text-center text-xs text-text-secondary font-semibold animate-pulse">Загрузка ключей...</div>
        ) : mcpKeys.length === 0 ? (
          <div className="py-8 text-center bg-surface-secondary/20 rounded-2xl border border-border border-dashed p-6">
            <ShieldAlert className="w-8 h-8 text-text-secondary/50 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Нет активных ключей</h4>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Выпустите первый ключ для подключения AI-агента</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm scrollbar-none">
            <table className="w-full text-left border-collapse text-xs table-auto">
              <thead>
                <tr className="bg-surface-secondary/40 border-b border-border text-[10px] font-bold text-text-secondary uppercase tracking-wider select-none">
                  <th className="px-5 py-3.5 font-bold">Название</th>
                  <th className="px-5 py-3.5 font-bold">Роли / Scopes</th>
                  <th className="px-5 py-3.5 font-bold">Создан</th>
                  <th className="px-5 py-3.5 font-bold">Последнее исп.</th>
                  <th className="px-5 py-3.5 font-bold text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {mcpKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-text-primary">
                      <div className="flex items-center gap-2.5">
                        <div className={'w-2 h-2 rounded-full ' + (k.is_active ? 'bg-success' : 'bg-danger')} />
                        {k.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {k.scopes?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s: string) => {
                            let label = s;
                            let color = 'bg-accent/10 text-text-primary border-border';
                            if (s === 'crm:admin') { label = 'Админ'; color = 'bg-danger/10 text-danger border-danger/20'; }
                            else if (s === 'crm:read') { label = 'Чтение'; color = 'bg-success/10 text-success border-success/20'; }
                            else if (s === 'crm:write') { label = 'Запись и Удаление'; color = 'bg-warning/10 text-warning border-warning/20'; }
                            else if (s === 'contacts:write') { label = 'Запись'; color = 'bg-accent/10 text-text-primary border-border'; }
                            return (
                              <span key={s} className={`border text-[9px] font-bold px-2 py-0.5 rounded-xl uppercase ${color}`}>{label}</span>
                            );
                          })}
                        </div>
                      ) : <span className="text-text-secondary font-medium text-xs italic">Полный доступ</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-text-secondary font-mono font-semibold whitespace-nowrap">
                      {new Date(k.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-5 py-4 text-xs text-text-secondary font-mono font-semibold whitespace-nowrap">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('ru-RU') : 'Никогда'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger hover:bg-danger/10 px-3 py-1.5 h-auto rounded-xl"
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

      {/* CREATE API KEY MODAL */}
      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Выпустить новый API-ключ доступа"
        className="max-w-md"
      >
        <form onSubmit={handleCreateKeySubmit} className="space-y-5 select-none font-normal">
          <Input
            label="Название ключа"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Например: Ассистент продаж Telegram"
            required
            maxLength={120}
          />

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Права доступа (Scopes)</label>
            
            {/* Scopes Toggles Group */}
            <div className="space-y-2 border border-border/80 rounded-2xl p-3 bg-surface-secondary/25">
              
              {/* ADMIN Switch Option */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-secondary/40 rounded-xl transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-primary block">Администратор (Полный доступ)</span>
                  <span className="text-[10px] text-text-secondary font-medium">Полные права на просмотр, запись и удаление</span>
                </div>
                <Switch checked={isAdmin} onChange={setIsAdmin} />
              </div>

              {/* READ Switch Option */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-secondary/40 rounded-xl transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-primary block">Просмотр CRM (crm:read)</span>
                  <span className="text-[10px] text-text-secondary font-medium">Доступ к чтению контактов, сделок и дашборда</span>
                </div>
                <Switch checked={isAdmin || scopes.read} onChange={() => handleToggleScope('read')} disabled={isAdmin} />
              </div>

              {/* WRITE CRM Switch Option */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-secondary/40 rounded-xl transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-primary block">Редактирование воронки (crm:write)</span>
                  <span className="text-[10px] text-text-secondary font-medium">Создание, обновление и удаление сделок и контактов</span>
                </div>
                <Switch checked={isAdmin || scopes.write} onChange={() => handleToggleScope('write')} disabled={isAdmin} />
              </div>

              {/* WRITE CONTACTS Switch Option */}
              <div className="flex items-center justify-between p-2 hover:bg-surface-secondary/40 rounded-xl transition-colors">
                <div>
                  <span className="text-xs font-bold text-text-primary block">Запись контактов (contacts:write)</span>
                  <span className="text-[10px] text-text-secondary font-medium">Только добавление новых клиентов без удаления</span>
                </div>
                <Switch checked={isAdmin ? false : scopes.contactsWrite} onChange={() => handleToggleScope('contactsWrite')} disabled={isAdmin} />
              </div>

            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" loading={isCreating} disabled={!newKeyName.trim()}>
              Выпустить токен
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </motion.div>
  );
}
