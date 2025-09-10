import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, label, error, ...props }, ref) => {
  const id = props.id || props.name;
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>}
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-background-primary px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-status-error focus-visible:ring-status-error',
          className
        )}
        ref={ref}
        id={id}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
