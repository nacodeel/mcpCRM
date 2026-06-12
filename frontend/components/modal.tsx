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
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/10 backdrop-blur-[1px] transition-all duration-150"
        />

        {isMobile ? (
          /* MOBILE BOTTOM SHEET */
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.2 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[92vh] border-t border-neutral-200/60 pb-safe',
              className
            )}
          >
            {/* Drag Handle Indicator */}
            <div className="flex justify-center py-2.5 flex-shrink-0 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 pt-1 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 px-1.5 text-xs text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 flex items-center justify-center transition-all duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>
          </motion.div>
        ) : (
          /* DESKTOP DESK CENTRED MODAL */
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
            className={cn(
              'relative bg-white rounded-xl shadow-xl border border-neutral-100 max-w-xl w-full flex flex-col max-h-[85vh] z-50 overflow-hidden',
              className
            )}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0 bg-neutral-50/50">
              <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-all duration-150"
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
