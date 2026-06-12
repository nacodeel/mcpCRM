'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Plus, ShieldAlert } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { useCRM } from '@/context/crm-context';

export default function IntegrationPage() {
  const {
    mcpKeys,
    newMcpKeyName,
    setNewMcpKeyName,
    selectedAccessLevel,
    setSelectedAccessLevel,
    mcpKeyLoading,
    handleCreateMcpKey,
    handleDeleteMcpKey
  } = useCRM();

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
      />

      {/* MCP Keys Management */}
      <div className="bg-white border border-neutral-200/50 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] font-normal space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-800">Управление ключами доступа</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-lg">Создайте ключи (API Tokens) для ваших AI-агентов. Вы можете выпустить до 10 active-ключей.</p>
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
    </motion.div>
  );
}
