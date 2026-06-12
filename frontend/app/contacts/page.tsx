'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Trash2, Edit3, X } from 'lucide-react';
import { useToast, Button, Badge, CustomDropdown } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { DataTable, Column, Pagination, EmptyState } from '@/components/data-table';
import { useCRM } from '@/context/crm-context';
import { Contact } from '@/lib/crm-db';

export default function ContactsPage() {
  const {
    db,
    formatDate,
    openCreateContact,
    openEditContact,
    initiateDeleteContact,
    isToday,
    isWithinLast7Days,

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
    setContactsFilterDate
  } = useCRM();

  if (!db) return null;

  // CONTACTS DATATABLE FILTERING LOGIC
  const getFilteredContacts = () => {
    let result = [...db.contacts];

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
  const paginatedContacts = filteredContacts.slice(
    (contactsPage - 1) * contactsPageSize,
    contactsPage * contactsPageSize
  );

  const getUniqueContactTags = () => {
    const tags = new Set<string>();
    db.contacts.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
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

  return (
    <motion.div
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
                setContactsPage(1);
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
  );
}
