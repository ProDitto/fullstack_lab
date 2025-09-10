import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  const handleSwitchToLogin = () => setIsLogin(true);

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-background-secondary rounded-lg shadow-lg">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold font-heading text-text-primary">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </h2>
      </div>
      {isLogin ? <LoginForm /> : <RegisterForm onRegisterSuccess={handleSwitchToLogin}/>}
      <p className="mt-2 text-center text-sm text-text-secondary">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="font-medium text-primary-accent hover:text-opacity-80 ml-1"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
};
