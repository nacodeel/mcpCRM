'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, User, FileText, Wallet, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { useCRM } from '@/context/crm-context';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const {
    db,
    isWithinLast7Days,
    formatMoney,
    formatDate,
    getDealStatusBadgeVariant,
    openEditContact,
    openEditDeal
  } = useCRM();

  if (!db) return null;

  // Analytics calculator
  const totalContactsCount = db.contacts.length;
  const totalDealsCount = db.deals.length;
  
  const activeDealsSum = db.deals
    .filter(d => d.status !== 'Потеряна')
    .reduce((sum, d) => sum + d.amount, 0);

  const newContactsLast7Days = db.contacts.filter(c => isWithinLast7Days(c.updatedAt)).length;

  const sortedRecentContactsForDashboard = [...db.contacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const sortedRecentDealsForDashboard = [...db.deals]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <motion.div
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
        {/* RECENT CONTACTS */}
        <div className="bg-white border border-[#EDEDED] rounded-lg p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDED]">
            <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Последние контакты</h3>
            <button
              onClick={() => router.push('/contacts')}
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

        {/* RECENT DEALS */}
        <div className="bg-white border border-[#EDEDED] rounded-lg p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDED]">
            <h3 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">Последние сделки</h3>
            <button
              onClick={() => router.push('/deals')}
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
  );
}
