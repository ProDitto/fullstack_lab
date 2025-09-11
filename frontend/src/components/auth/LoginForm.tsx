import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '../ui/Spinner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Renders the login form, including email/password fields and quick login buttons.
 * Handles form submission, validation, and displays loading/error states.
 */
export const LoginForm: React.FC = () => {
  const { login, quickLogin, isLoading, error, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  
  const quickLoginUsers = useLiveQuery(
    () => db.users.where('email').anyOf('alice@quikchat.dev', 'bob@quikchat.dev', 'charlie@quikchat.dev', 'diana@quikchat.dev').toArray(), []
  ) as User[] | undefined;


  const onSubmit = async (data: LoginFormValues) => {
    try {
        clearError(); // Clear previous errors on new submission
        await login(data.email, data.password);
    } catch (err) {
        // Error is handled by the authStore, no need to do anything here except console log
        console.error("Login attempt failed:", err);
    }
  };
  
  // Clear error when component unmounts
  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  return (
    <Card aria-labelledby="login-card-title">
      <CardHeader>
        <CardTitle id="login-card-title">Login</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-live="polite">
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
          <Button type="submit" className="w-full" disabled={isLoading} aria-label="Login">
            {isLoading ? <Spinner size="sm" /> : 'Login'}
          </Button>
        </form>
        <div className="mt-4" role="group" aria-label="Quick login options">
          <p className="text-center text-sm text-text-secondary mb-2">Or quick login as:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickLoginUsers?.map(user => (
              <Button key={user.id} variant="outline" onClick={() => quickLogin(user.id)} disabled={isLoading} aria-label={`Quick login as ${user.name}`}>
                {user.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
