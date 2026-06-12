'use client';

import * as React from 'react';
import { LayoutDashboard, Users, CreditCard, Code2, Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type CRMSection = 'dashboard' | 'contacts' | 'deals' | 'integration';

interface SidebarProps {
  currentSection: CRMSection;
  onSectionChange: (section: CRMSection) => void;
  userName: string;
  userEmail: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSectionChange,
  userName,
  userEmail,
  onLogout
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
      <div className="lg:hidden flex items-center justify-between px-5 py-3 border-b border-border bg-surface sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-background font-bold text-lg tracking-wider">
            C
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm text-text-primary block">Mini CRM</span>
            <p className="text-[9px] font-mono text-text-secondary tracking-widest uppercase">Ассистент</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-surface-secondary rounded-xl text-text-secondary hover:text-text-primary transition-colors border border-border/40"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* MOBILE SIDEBAR DROPDOWN DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Menu Sliding Body */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="relative w-64 bg-surface h-full border-r border-border flex flex-col justify-between shadow-2xl z-50 p-5"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-background font-bold text-lg tracking-wider">
                      C
                    </div>
                    <div>
                      <span className="font-bold tracking-tight text-sm text-text-primary block">Mini CRM</span>
                      <p className="text-[9px] font-mono text-text-secondary tracking-widest uppercase">Ассистент</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMobileOpen(false)} 
                    className="p-2 rounded-xl bg-surface-secondary/60 text-text-secondary hover:text-text-primary border border-border/40 transition-all active:scale-95"
                  >
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
                          'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium tracking-tight transition-all duration-200 outline-none group',
                          isActive
                            ? 'bg-accent text-background shadow-sm shadow-accent/10'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile User Profile Section */}
              <div className="border-t border-border pt-4 space-y-3 bg-surface-secondary/20 p-2 rounded-2xl">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-accent text-background flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-xs text-text-primary block truncate">{userName || 'Пользователь'}</span>
                    <span className="text-[10px] text-text-secondary block truncate">{userEmail || 'email@example.com'}</span>
                  </div>
                </div>
                {onLogout && (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-all duration-200 rounded-xl font-medium border border-border/85"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти из системы</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESKTOP FIXED SIDEBAR */}
      <aside className="hidden lg:flex flex-col justify-between w-64 border-r border-border bg-surface sticky top-0 h-screen p-5 flex-shrink-0 select-none">
        <div className="space-y-7">
          {/* Company Title */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-background font-bold text-lg tracking-wider">
              C
            </div>
            <div>
              <span className="font-bold tracking-tight text-sm text-text-primary block">Mini CRM</span>
              <p className="text-[9px] font-mono text-text-secondary tracking-widest uppercase">Ассистент</p>
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
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium tracking-tight transition-all duration-200 outline-none group',
                    isActive
                      ? 'bg-accent text-background shadow-sm shadow-accent/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile section at the bottom */}
        <div className="border-t border-border pt-4 mt-auto space-y-3 bg-surface-secondary/20 p-3 rounded-2xl">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-accent text-background flex items-center justify-center font-bold text-sm flex-shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-xs text-text-primary block truncate">{userName || 'Пользователь'}</span>
              <span className="text-[10px] text-text-secondary block truncate">{userEmail || 'email@example.com'}</span>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-all duration-200 rounded-xl font-medium border border-border/85"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти из системы</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
