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
        const contact = db.contacts.find((c) => c.id === deal.contactId);
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
  );
}
