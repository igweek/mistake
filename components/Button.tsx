
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  fullWidth,
  className = '', 
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-semibold tracking-tight transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm border border-transparent",
    secondary: "bg-white text-blue-600 border border-blue-100 hover:border-blue-400 hover:bg-blue-50/30",
    danger: "bg-white text-red-500 border border-red-100 hover:bg-red-50 hover:border-red-200",
    ghost: "bg-transparent text-slate-400 hover:text-blue-600",
    glass: "bg-blue-50/40 backdrop-blur-sm text-blue-700 border border-blue-100 hover:bg-white hover:shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[11px]",
    md: "px-5 py-2.5 text-xs",
    lg: "px-8 py-3.5 text-sm",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2">
           <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      ) : null}
      {children}
    </button>
  );
};
