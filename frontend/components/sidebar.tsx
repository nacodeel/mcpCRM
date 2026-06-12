'use client';

import * as React from 'react';
import { LayoutDashboard, Users, CreditCard, Code2, Menu, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type CRMSection = 'dashboard' | 'contacts' | 'deals' | 'integration';

interface SidebarProps {
  currentSection: CRMSection;
  onSectionChange: (section: CRMSection) => void;
  userName: string;
  userEmail: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSectionChange,
  userName,
  userEmail
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard' as CRMSection, label: 'Дашборд', icon: LayoutDashboard },
    { id: 'contacts' as CRMSection, label: 'Контакты', icon: Users },
    { id: 'deals' as CRMSection, label: 'Сделки', icon: CreditCard },
    { id: 'integration' as CRMSection, label: 'Интеграция', icon: Code2 },
  ];

  const handleItemClick = (sectionId: CRMSection) => {
    onSectionChange(sectionId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE HEADER BAR */}
      <div className="lg:hidden flex items-center justify-between px-5 py-3 border-b border-[#EDEDED] bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="w-6 h-6 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
            <span className="text-white text-[10px] font-bold font-mono">C</span>
          </div>
          <span className="font-semibold text-[#1A1A1A] text-sm tracking-tight">Mini CRM</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 px-1.5 hover:bg-[#F5F5F4] rounded-md text-[#666666] hover:text-[#1A1A1A] transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE SIDEBAR DROPDOWN DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-25 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-[#1A1A1A]/10 backdrop-blur-[1px]"
            />

            {/* Menu Sliding Body */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.15 }}
              className="relative w-64 bg-white h-full border-r border-[#EDEDED] flex flex-col justify-between shadow-xl z-10 p-5"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold font-mono">C</span>
                    </div>
                    <span className="font-semibold text-[#1A1A1A] text-sm tracking-tight">Mini CRM</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="p-1 text-[#666666] hover:text-[#1A1A1A] rounded-md">
                     <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 rounded-md',
                          isActive
                            ? 'bg-[#F5F5F4] text-[#1A1A1A] font-medium border-l-2 border-[#1A1A1A] rounded-l-none'
                            : 'text-[#666666] hover:bg-[#F5F5F4] hover:text-[#1A1A1A]'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', isActive ? 'text-[#1A1A1A] opacity-80' : 'text-[#666666] opacity-50')} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP FIXED SIDEBAR */}
      <aside className="hidden lg:flex flex-col justify-between w-60 border-r border-[#EDEDED] bg-white sticky top-0 h-screen p-5 flex-shrink-0 select-none">
        <div className="space-y-7">
          {/* Company Title */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
              <span className="text-white text-[10px] font-bold font-mono">C</span>
            </div>
            <div>
              <span className="font-semibold text-[#1A1A1A] text-sm tracking-tight block">Mini CRM</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 rounded-md',
                    isActive
                      ? 'bg-[#F5F5F4] text-[#1A1A1A] font-medium border-l-2 border-[#1A1A1A] rounded-l-none'
                      : 'text-[#666666] hover:bg-[#F5F5F4] hover:text-[#1A1A1A]'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-[#1A1A1A] opacity-80' : 'text-[#666666] opacity-50')} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
