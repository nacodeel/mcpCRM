'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const isMobile = useIsMobile();

  // Guard: Avoid hydration mismatch by waiting for mount if isMobile is undefined
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setMounted(true);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen || !mounted) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-150"
        />

        {isMobile ? (
          /* MOBILE BOTTOM SHEET */
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.2 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] border-t border-border pb-safe select-none',
              className
            )}
          >
            {/* Drag Handle Indicator */}
            <div className="flex justify-center py-3 flex-shrink-0 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 pt-1 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface-secondary/20">
              <h2 className="text-sm font-bold tracking-tight text-text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-surface-secondary/60 text-text-secondary hover:text-text-primary border border-border/40 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
          </motion.div>
        ) : (
          /* DESKTOP CENTRED MODAL */
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className={cn(
              'relative bg-surface border border-border rounded-3xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] z-50 overflow-hidden select-none',
              className
            )}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface-secondary/20">
              <h2 className="text-sm font-bold tracking-tight text-text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-surface-secondary/60 text-text-secondary hover:text-text-primary border border-border/40 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
