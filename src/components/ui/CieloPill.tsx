import React from 'react';

export type CieloPillVariant = 
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'selected'
  | 'success'
  | 'warning'
  | 'error'
  | 'disabled'
  | 'ghost'
  | 'danger';

interface CieloPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CieloPillVariant;
  children: React.ReactNode;
  uppercase?: boolean;
  as?: 'button' | 'span' | 'div';
}

export const CieloPill: React.FC<CieloPillProps> = ({ 
  variant = 'neutral', 
  children, 
  uppercase = false,
  as: Component = 'span',
  className = '',
  ...props 
}) => {
  // Configuración base de geometría y texto (Reglas 22.2, 22.3 y 22.4)
  let baseClasses = 'inline-flex items-center justify-center rounded-full h-9 px-4 w-fit font-semibold leading-none transition-all duration-200 text-sm';
  
  if (uppercase) {
    baseClasses += ' uppercase tracking-[0.08em]';
  }

  // Estados y variantes de píldoras usando los tokens de CIELO (Regla 22.5 y 27)
  const variants: Record<CieloPillVariant, string> = {
    primary: 'bg-[var(--primary)] text-black hover:bg-[var(--primary-hover)]', 
    secondary: 'bg-white border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:border-[var(--primary)]',
    neutral: 'bg-[var(--tag-sky-bg)] text-[var(--tag-sky-text)] border border-[var(--tag-sky-bg)]', 
    selected: 'bg-[var(--paper)] border-[2px] border-[var(--primary)] text-[var(--primary)]', 
    success: 'bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] border border-[#D1FAE5]', 
    warning: 'bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)] border border-[#FEF3C7]', 
    error: 'bg-[var(--tag-rose-bg)] text-[var(--tag-rose-text)] border border-[#FFE4E6]', 
    disabled: 'bg-[var(--sidebar)] text-[var(--text-secondary)] cursor-not-allowed opacity-70 border border-transparent',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--tag-sky-bg)] border border-transparent',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
  };

  const variantClasses = variants[variant] || variants.neutral;

  return React.createElement(
    Component,
    {
      className: `${baseClasses} ${variantClasses} ${className}`,
      ...props
    },
    children
  );
};
