'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-accent text-white hover:bg-accent-hover focus:ring-accent',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
      danger: 'bg-error text-white hover:bg-red-600 focus:ring-error',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-body-sm',
      md: 'px-4 py-2 text-body-sm',
      lg: 'px-6 py-3 text-body',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
