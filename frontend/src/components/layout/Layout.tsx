import type { ReactNode } from 'react';

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="h-screen w-screen bg-background-primary text-text-primary font-sans">
      {children}
    </div>
  );
};
