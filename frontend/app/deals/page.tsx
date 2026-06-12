'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Trash2, Edit3, X } from 'lucide-react';
import { Button, Badge, CustomDropdown } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column, Pagination, EmptyState } from '@/components/data-table';
import { useCRM } from '@/context/crm-context';
import { Deal } from '@/lib/crm-db';

export default function DealsPage() {
  const {
    db,
    formatDate,
    formatMoney,
    openCreateDeal,
    openEditDeal,
    initiateDeleteDeal,
    getDealStatusBadgeVariant,
    handleDealContactClick,
    isToday,
    isWithinLast7Days,

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
  } = useCRM();

  if (!db) return null;

  // DEALS DATATABLE FILTERING LOGIC
  const getFilteredDeals = () => {
    let result = [...db.deals];

    // 1. Search in title, description, or linked contact's name!
    if (dealsSearch.trim() !== '') {
      const term = dealsSearch.toLowerCase();
      result = result.filter(d => {
        const linkedContact = db.contacts.find(c => c.id === d.contactId);
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
  const paginatedDeals = filteredDeals.slice(
    (dealsPage - 1) * dealsPageSize,
    dealsPage * dealsPageSize
  );

  // Deals columns configuration
  const dealColumns: Column<Deal>[] = [
    {
      key: 'title',
      header: 'Название сделки',
      sortable: true,
      render: (deal) => (
        <div className="flex flex-col">
          <span className="font-bold text-text-primary hover:text-accent leading-normal transition-colors">{deal.title}</span>
          {deal.description && (
            <span className="text-[10px] text-text-secondary truncate max-w-[220px] font-medium leading-normal mt-0.5">
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
        const contact = db.contacts.find((c) => c.id === deal.contactId);
        if (contact) {
          return (
            <div className="flex items-center gap-1.5 hover:underline" onClick={(e) => { e.stopPropagation(); handleDealContactClick(deal.contactId); }}>
              <span className="text-xs text-text-primary hover:text-accent font-semibold truncate max-w-[120px] transition-colors">
                {contact.name}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-danger font-medium">Удален или отсутствует</span>;
      }
    },
    {
      key: 'amount',
      header: 'Сумма',
      sortable: true,
      render: (deal) => (
        <span className="font-bold text-text-primary">
          {formatMoney(deal.amount)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (deal) => (
        <Badge variant={getDealStatusBadgeVariant(deal.status)} className="font-bold text-[10px]">
          {deal.status}
        </Badge>
      )
    },
    {
      key: 'updatedAt',
      header: 'Обновлена',
      sortable: true,
      render: (deal) => (
        <span className="text-xs text-text-secondary font-mono font-semibold">
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
            <Edit3 className="w-3.5 h-3.5 text-text-secondary hover:text-text-primary" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Удалить"
            className="hover:text-danger hover:bg-danger/10"
            onClick={(e) => initiateDeleteDeal(deal.id, e)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <motion.div
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
      <div className="bg-surface border border-border/80 rounded-2xl p-4 space-y-3 shadow-sm select-none">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
            <input
              type="text"
              placeholder="Поиск по названию сделки, КП, описанию или клиенту..."
              value={dealsSearch}
              onChange={(e) => {
                setDealsSearch(e.target.value);
                setDealsPage(1);
              }}
              className="w-full bg-surface border border-border/80 rounded-xl pl-9 pr-10 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent font-medium transition-colors"
            />
            {dealsSearch && (
              <button
                onClick={() => {
                  setDealsSearch('');
                  setDealsPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
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
                ...db.contacts.map((c) => ({ value: c.id, label: c.name }))
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
            <span className="text-text-secondary font-medium">Сумма от:</span>
            <input
              type="number"
              placeholder="0"
              value={dealsMinAmount}
              onChange={(e) => {
                setDealsMinAmount(e.target.value);
                setDealsPage(1);
              }}
              className="w-24 bg-surface border border-border/80 rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary font-medium">до:</span>
            <input
              type="number"
              placeholder="999 999"
              value={dealsMaxAmount}
              onChange={(e) => {
                setDealsMaxAmount(e.target.value);
                setDealsPage(1);
              }}
              className="w-24 bg-surface border border-border/80 rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent font-medium"
            />
            <span className="text-text-secondary font-semibold">₽</span>
          </div>

          {/* RESET BUTTON */}
          {(dealsMinAmount || dealsMaxAmount) && (
            <button
              onClick={() => {
                setDealsMinAmount('');
                setDealsMaxAmount('');
                setDealsPage(1);
              }}
              className="text-[10px] font-bold text-text-secondary hover:text-text-primary hover:underline cursor-pointer uppercase tracking-wider ml-1"
            >
              Сбросить сумму
            </button>
          )}
        </div>

        {/* ACTIVE CHIP CHURN */}
        {(dealsSearch || dealsFilterStatus !== 'all' || dealsFilterContact !== 'all' || dealsFilterDate !== 'all' || dealsMinAmount || dealsMaxAmount) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border text-xs text-text-secondary font-medium">
            <span className="font-semibold text-text-secondary">Активные фильтры:</span>
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
              const contactName = db.contacts.find(c => c.id === dealsFilterContact)?.name || '...';
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
              className="text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer hover:underline transition-all duration-150 ml-1.5 uppercase tracking-wider"
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
  );
}
