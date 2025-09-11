import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';

/**
 * The main authentication page component.
 * It uses tabs to switch between the Login and Sign Up forms.
 */
export const AuthPage: React.FC = () => {
  return (
    <Tabs defaultValue="login" className="w-full" aria-label="Authentication forms">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login" aria-controls="login-form-content">Login</TabsTrigger>
        <TabsTrigger value="signup" aria-controls="signup-form-content">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login" id="login-form-content">
        <LoginForm />
      </TabsContent>
      <TabsContent value="signup" id="signup-form-content">
        <SignUpForm />
      </TabsContent>
    </Tabs>
  );
};
