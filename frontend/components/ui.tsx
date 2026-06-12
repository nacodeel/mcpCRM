'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
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
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]',
          {
            // Primary: solid accent color (usually dark/black in light mode, white in dark mode)
            'bg-accent text-background hover:opacity-90 border border-transparent':
              variant === 'primary',
            // Secondary: clean, light border with text-primary and surface/surface-secondary hover
            'bg-surface text-text-primary border border-border/80 hover:bg-surface-secondary':
              variant === 'secondary',
            // Danger: danger red colored button (soft bg)
            'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20':
              variant === 'danger',
            // Accent: soft success green colored button
            'bg-success/10 text-success border border-success/20 hover:bg-success/20':
              variant === 'accent',
            // Ghost: completely transparent
            'bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary':
              variant === 'ghost',
          },
          {
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4.5 py-2.5 text-xs': size === 'md',
            'px-5.5 py-3 text-sm': size === 'lg',
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
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full bg-surface border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent font-medium transition-colors',
            error ? 'border-danger' : 'border-border/80',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-danger mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// TEXTAREA
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full bg-surface border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent font-medium transition-colors resize-y min-h-[80px]',
            error ? 'border-danger' : 'border-border/80',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-danger mt-0.5">{error}</p>
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
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full bg-surface border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-all duration-150 appearance-none cursor-pointer pr-10 font-medium',
              error ? 'border-danger' : 'border-border/80',
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
          <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {error && (
          <p className="text-[10px] text-danger mt-0.5">{error}</p>
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
          'w-full flex items-center justify-between bg-surface border border-border/80 rounded-xl px-3.5 py-2.5 text-xs text-text-primary hover:bg-surface-secondary focus:outline-none focus:border-accent transition-all duration-150 appearance-none cursor-pointer select-none text-left min-h-[34px] font-medium shadow-sm',
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
            <span className="text-text-secondary/60">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-secondary transition-transform duration-150 flex-shrink-0 ml-2', isOpen && 'transform rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 bg-surface border border-border shadow-lg rounded-xl z-50 py-1 max-h-60 overflow-y-auto scrollbar-none"
          >
            {options.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-text-secondary italic">Нет доступных опций</div>
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
                      'w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-surface-secondary transition-colors flex items-center justify-between gap-2',
                      isSelected && 'bg-accent/10 text-accent font-semibold',
                      opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                  >
                    <span className="truncate flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[3.5] flex-shrink-0" />}
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full select-none transition-colors duration-150 border',
        {
          'bg-surface-secondary text-text-secondary border-border/40': variant === 'gray',
          'bg-success/10 text-success border-success/20': variant === 'emerald',
          'bg-warning/10 text-warning border-warning/20': variant === 'amber',
          'bg-accent-soft text-text-primary border-border/50': variant === 'blue',
          'bg-danger/10 text-danger border-danger/20': variant === 'red',
          'bg-purple-500/10 text-purple-600 border-purple-500/20': variant === 'purple',
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
            'animate-pulse bg-surface-secondary rounded-xl h-4 w-full',
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
                'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-xs font-semibold bg-surface border-border'
              )}
            >
              <div className="flex-shrink-0">
                {t.type === 'success' && (
                  <div className="w-5 h-5 rounded-full bg-accent text-background flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {t.type === 'error' && (
                  <div className="w-5 h-5 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                {t.type === 'info' && (
                  <div className="w-5 h-5 rounded-full bg-surface-secondary text-text-secondary flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
              <p className="flex-1 text-text-primary">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-text-secondary hover:text-text-primary focus:outline-none p-0.5 rounded-xl hover:bg-surface-secondary transition-colors duration-150"
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
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-150"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className="relative bg-surface border border-border rounded-3xl shadow-2xl max-w-sm w-full p-6 overflow-hidden z-50"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-2 rounded-xl flex-shrink-0',
                  variant === 'danger' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-surface-secondary text-text-secondary border border-border/80'
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-text-primary">{title}</h3>
                <p className="mt-1.5 text-xs text-text-secondary font-medium leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
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
