import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { useAuthStore } from './store/useAuthStore';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ConnectionManager } from './services/ConnectionManager';

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const App = () => {
  const { loadUser, accessToken } = useAuthStore((state) => ({ loadUser: state.loadUser, accessToken: state.accessToken }));

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {accessToken && <ConnectionManager />}
        <Layout>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <HomePage />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
};

export default App;
