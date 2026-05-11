import React from 'react';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      isActive 
        ? 'border-primary text-primary' 
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`}
  >
    {label}
  </button>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-card rounded-xl border shadow-sm ${className || ''}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'error' | 'info'; className?: string }> = ({ children, variant = 'info', className }) => {
  const variants = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20',
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className || ''}`}>
      {children}
    </span>
  );
};
