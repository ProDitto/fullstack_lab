import { AuthForm } from '../components/features/auth/AuthForm';

export const AuthPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm />
    </div>
  );
};
