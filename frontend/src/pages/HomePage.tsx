import * as React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

/**
 * The main home page for authenticated users.
 * It renders the MainLayout which contains the core application UI.
 */
const HomePage: React.FC = () => {
  return (
    <MainLayout />
  );
};

export default HomePage;
