import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useAuthStore } from '../../../store/useAuthStore';
import { toast } from 'react-hot-toast';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onRegisterSuccess: () => void;
}

export const RegisterForm = ({ onRegisterSuccess }: RegisterFormProps) => {
  const registerUser = useAuthStore((state) => state.register);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await registerUser(data);
      toast.success('Registration successful! Please log in.');
      onRegisterSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Email"
        {...register('email')}
        error={errors.email?.message}
        type="email"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        {...register('password')}
        error={errors.password?.message}
        type="password"
        placeholder="Minimum 8 characters"
      />
      <div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </div>
    </form>
  );
};
