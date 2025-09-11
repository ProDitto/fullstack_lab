import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '../ui/Spinner';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

/**
 * Renders the sign-up form for new user registration.
 * Handles form submission, validation, and displays loading/error states.
 */
export const SignUpForm: React.FC = () => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    try {
        clearError(); // Clear previous errors on new submission
        await registerUser(data.name, data.email, data.password);
    } catch (err) {
        // Error is handled by the authStore
        console.error("Registration failed:", err);
    }
  };
  
  // Clear error when component unmounts
  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  return (
    <Card aria-labelledby="signup-card-title">
      <CardHeader>
        <CardTitle id="signup-card-title">Sign Up</CardTitle>
        <CardDescription>Create a new account to start chatting.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
          <div className="space-y-1">
            <Input
              id="name"
              placeholder="Name"
              {...register('name')}
              disabled={isLoading}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby="name-error"
            />
            {errors.name && <p id="name-error" className="text-sm text-status-error">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Input
              id="email"
              placeholder="Email"
              {...register('email')}
              disabled={isLoading}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby="email-error"
            />
            {errors.email && <p id="email-error" className="text-sm text-status-error">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Input
              id="password"
              type="password"
              placeholder="Password"
              {...register('password')}
              disabled={isLoading}
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby="password-error"
            />
            {errors.password && <p id="password-error" className="text-sm text-status-error">{errors.password.message}</p>}
          </div>
          {error && <p className="text-sm text-status-error text-center" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading} aria-label="Create account">
            {isLoading ? <Spinner size="sm" /> : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
