import * as React from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuthPage } from '@/components/auth/AuthPage';

/**
 * Renders the login page by wrapping the AuthPage component with the AuthLayout.
 * This is the primary entry point for unauthenticated users.
 */
const LoginPage: React.FC = () => {
  return (
    <AuthLayout>
      <AuthPage />
    </AuthLayout>
  );
};

export default LoginPage;
