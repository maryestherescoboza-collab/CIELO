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
  | 'danger'
  | 'orange'
  | 'terracotta'
  | 'info';

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
  let baseClasses = 'inline-flex items-center justify-center rounded-full h-8 px-3 w-fit font-semibold leading-none transition-all duration-200 text-xs border';
  
  if (uppercase) {
    baseClasses += ' uppercase tracking-[0.08em]';
  }

  // Estados y variantes de píldoras usando los tokens de CIELO (Regla 22.5 y 27)
  const variants: Record<CieloPillVariant, string> = {
    primary: 'bg-(--primary) text-white hover:bg-(--primary-hover) font-bold border-transparent shadow-sm', 
    secondary: 'bg-white border-(--border-soft) text-(--text-secondary) hover:bg-(--bg-main) hover:border-(--primary)',
    neutral: 'bg-(--linen) text-(--ink) border-(--border-soft)', 
    selected: 'bg-(--primary) text-white font-bold border-transparent shadow-sm', 
    success: 'bg-(--tag-emerald-bg) text-(--tag-emerald-text) border-emerald-500/20', 
    warning: 'bg-(--tag-amber-bg) text-(--tag-amber-text) border-amber-500/20', 
    error: 'bg-(--tag-rose-bg) text-(--tag-rose-text) border-red-500/20', 
    disabled: 'bg-(--linen) text-(--text-secondary) cursor-not-allowed opacity-50 border-transparent',
    ghost: 'bg-transparent text-(--text-secondary) hover:bg-(--linen) border-transparent',
    danger: 'bg-(--tag-rose-bg) text-(--tag-rose-text) border-red-500/20 hover:bg-opacity-80',
    orange: 'bg-(--tag-orange-bg) text-(--tag-orange-text) border-orange-500/20',
    terracotta: 'bg-(--tag-terracotta-bg) text-(--tag-terracotta-text) border-amber-800/20',
    info: 'bg-(--tag-sky-bg) text-(--tag-sky-text) border-blue-500/20'
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
