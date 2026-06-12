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
        <div className="bg-surface border border-border/80 p-5 rounded-2xl flex flex-col justify-between h-28 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">Всего контактов</span>
            <div className="p-2 rounded-xl bg-surface-secondary text-text-primary">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-text-primary leading-none">{totalContactsCount}</span>
            <p className="text-[10px] text-text-secondary mt-1 leading-none font-medium">Добавлены вручную или по API</p>
          </div>
        </div>

        <div className="bg-surface border border-border/80 p-5 rounded-2xl flex flex-col justify-between h-28 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">Сделок верифицировано</span>
            <div className="p-2 rounded-xl bg-surface-secondary text-text-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-text-primary leading-none">{totalDealsCount}</span>
            <p className="text-[10px] text-text-secondary mt-1 leading-none font-medium">Всего комм. предложений</p>
          </div>
        </div>

        <div className="bg-surface border border-border/80 p-5 rounded-2xl flex flex-col justify-between h-28 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">Объем активных сделок</span>
            <div className="p-2 rounded-xl bg-surface-secondary text-text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-success leading-none">{formatMoney(activeDealsSum)}</span>
            <p className="text-[10px] text-text-secondary mt-1 leading-none font-medium">Исключая статус «Потеряна»</p>
          </div>
        </div>

        <div className="bg-surface border border-border/80 p-5 rounded-2xl flex flex-col justify-between h-28 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">Новые за 7 дней</span>
            <div className="p-2 rounded-xl bg-surface-secondary text-text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-text-primary leading-none">+{newContactsLast7Days}</span>
            <p className="text-[10px] text-text-secondary mt-1 leading-none font-medium">Лидогенерация AI агентами</p>
          </div>
        </div>
      </div>

      {/* Split Feed Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* RECENT CONTACTS */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Последние контакты</h3>
            <button
              onClick={() => router.push('/contacts')}
              className="text-xs text-text-secondary hover:text-text-primary font-bold inline-flex items-center gap-1 transition-colors group"
            >
              <span>Все контакты</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {sortedRecentContactsForDashboard.length > 0 ? (
            <div className="divide-y divide-border">
              {sortedRecentContactsForDashboard.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openEditContact(c)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/40 rounded-xl px-2.5 -mx-2.5 transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-text-primary truncate block">{c.name}</span>
                      <span className="text-[10px] text-text-secondary truncate block font-medium">
                        {c.emails[0] || c.phones[0] || 'Контактов нет'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary flex-shrink-0 font-mono font-bold">
                    {formatDate(c.updatedAt).split(',')[0]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-secondary italic font-medium">Нет добавленных контактов.</div>
          )}
        </div>

        {/* RECENT DEALS */}
        <div className="bg-surface border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Последние сделки</h3>
            <button
              onClick={() => router.push('/deals')}
              className="text-xs text-text-secondary hover:text-text-primary font-bold inline-flex items-center gap-1 transition-colors group"
            >
              <span>Все сделки</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {sortedRecentDealsForDashboard.length > 0 ? (
            <div className="divide-y divide-border">
              {sortedRecentDealsForDashboard.map((d) => (
                <div
                  key={d.id}
                  onClick={() => openEditDeal(d)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/40 rounded-xl px-2.5 -mx-2.5 transition-all duration-150"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-xs font-semibold text-text-primary truncate block">{d.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={getDealStatusBadgeVariant(d.status)} className="text-[10px] px-1.5 py-0">
                        {d.status}
                      </Badge>
                      <span className="text-[11px] text-text-primary font-bold">{formatMoney(d.amount)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary flex-shrink-0 font-mono font-bold">
                    {formatDate(d.updatedAt).split(',')[0]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-secondary italic font-medium">Нет активных сделок.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
