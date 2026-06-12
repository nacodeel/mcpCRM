'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, Copy, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = 'secondary', size = 'md', loading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:pointer-events-none select-none',
          {
            // Primary: neutral dark charcoal color (graphite vibe)
            'bg-[#1A1A1A] text-white hover:bg-[#333333] border border-transparent':
              variant === 'primary',
            // Secondary: clean, light border with subtle gray text and neutral bg
            'bg-white text-[#1A1A1A] border border-[#EDEDED] hover:bg-[#F5F5F4]':
              variant === 'secondary',
            // Danger: soft warning / deletion red
            'bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] hover:bg-[#FEE2E2]':
              variant === 'danger',
            // Accent: slate gray moss look
            'bg-[#E7F5EF] text-[#059669] border border-[#D1FAE5] hover:bg-[#D1FAE5]':
              variant === 'accent',
            // Ghost: completely transparent
            'bg-transparent text-[#666666] hover:bg-[#F5F5F4] hover:text-[#1A1A1A]':
              variant === 'ghost',
          },
          {
            'px-2.5 py-1 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-5 py-2.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// INPUT
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full bg-white border border-[#EDEDED] rounded-md px-3 py-1.5 text-sm text-[#1A1A1A] placeholder-[#666666]/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] transition-all duration-150',
            {
              'border-red-300 focus:ring-red-400 focus:border-red-400': !!error,
            },
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// TEXTAREA
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'w-full bg-white border border-[#EDEDED] rounded-md px-3 py-1.5 text-sm text-[#1A1A1A] placeholder-[#666666]/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] transition-all duration-150 resize-y min-h-[80px]',
            {
              'border-red-300 focus:ring-red-400 focus:border-red-400': !!error,
            },
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// SELECT
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'w-full bg-white border border-[#EDEDED] rounded-md px-3 py-1.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] transition-all duration-150 appearance-none cursor-pointer',
            {
              'border-red-300 focus:ring-red-400 focus:border-red-400': !!error,
            },
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

// CUSTOM DROPDOWN SELECT WITH ANIMATION
export interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  options: CustomDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  className,
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div id={id} ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between bg-white border border-[#EDEDED] rounded-md px-3 py-1.5 text-xs text-[#1A1A1A] hover:bg-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] transition-all duration-150 appearance-none cursor-pointer select-none text-left min-h-[34px]',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-neutral-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#1A1A1A]/50 transition-transform duration-150 flex-shrink-0 ml-2', isOpen && 'transform rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-1 bg-white border border-[#EDEDED] rounded-md shadow-lg z-50 py-1 max-h-[220px] overflow-y-auto scrollbar-none"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-400 italic">Нет доступных опций</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs text-[#1A1A1A] hover:bg-[#F5F5F4] transition-colors flex items-center justify-between gap-2',
                      isSelected && 'bg-neutral-50 font-semibold',
                      opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-neutral-800 stroke-[3.5] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// BADGE / TAG
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gray' | 'emerald' | 'amber' | 'blue' | 'red' | 'purple';
  className?: string;
  onClick?: () => void;
  onRemove?: () => void;
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  className,
  onClick,
  onRemove,
  id
}) => {
  return (
    <span
      id={id}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full select-none transition-colors duration-150',
        {
          'bg-[#F5F5F5] text-[#666666] border border-transparent': variant === 'gray',
          'bg-[#E7F5EF] text-[#059669] border border-transparent': variant === 'emerald',
          'bg-[#FFF7ED] text-[#EA580C] border border-transparent': variant === 'amber',
          'bg-[#EFF6FF] text-[#1E40AF] border border-transparent': variant === 'blue',
          'bg-[#FEF2F2] text-[#991B1B] border border-transparent': variant === 'red',
          'bg-[#F5F3FF] text-[#5B21B6] border border-transparent': variant === 'purple',
          'cursor-pointer hover:brightness-95': !!onClick,
        },
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded-full hover:bg-black/5 text-current/80 flex items-center justify-center transition-colors duration-150"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
};

// SKELETON
export const Skeleton: React.FC<{ className?: string; count?: number }> = ({ className, count = 1 }) => {
  return (
    <div className="w-full space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            'animate-pulse bg-neutral-100 rounded-md h-4 w-full',
            className
          )}
        />
      ))}
    </div>
  );
};

// TOAST NOTIFICATIONS SYSTEM
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Area */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 rounded-lg border shadow-sm text-sm font-medium bg-white border-neutral-200'
              )}
            >
              <div className="flex-shrink-0">
                {t.type === 'success' && (
                  <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {t.type === 'error' && (
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                {t.type === 'info' && (
                  <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
              <p className="flex-1 text-neutral-800">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-neutral-400 hover:text-neutral-600 focus:outline-none p-0.5 rounded-md hover:bg-neutral-50 transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// CONFIRM DIALOG
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/10 backdrop-blur-[1px] transition-all duration-150"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative bg-white border border-[#EDEDED] rounded-lg shadow-xl max-w-sm w-full p-6 overflow-hidden z-10"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-neutral-150 text-neutral-700'
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
                <p className="mt-1.5 text-sm text-neutral-500 font-normal leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button size="sm" variant="ghost" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
