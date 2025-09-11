import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { seedDatabase } from './lib/db';
import { useAuthStore } from './store/authStore';
import { Spinner } from './components/ui/Spinner';
import { useWebSocketSim } from './hooks/useWebSocketSim';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { useChatStore } from './store/chatStore';
import { useWorldStore } from './store/worldStore'; // Import useWorldStore
import { useTheme } from './hooks/useTheme'; // Import the useTheme hook
// import type Dexie from 'dexie';
import type { Transaction } from 'dexie';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const OpenWorldPage = React.lazy(() => import('./pages/OpenWorldPage'));
const WorldInstancePage = React.lazy(() => import('./pages/WorldInstancePage'));


/**
 * A component to handle protected routes.
 * If the user is authenticated, it renders the child routes (Outlet).
 * Otherwise, it navigates the user to the login page.
 */
const ProtectedRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    
    // If authenticated, render the nested routes. If not, redirect to login.
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

/**
 * A component to handle public routes for unauthenticated users.
 * If the user is authenticated, it redirects them to the home page.
 * Otherwise, it renders the child routes (Outlet).
 */
const PublicRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // If authenticated, redirect to home. If not, render the public route (e.g., login page).
    return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

/**
 * A component that listens for real-time message updates from Dexie
 * and syncs them with the Zustand store.
 * This ensures messages added by the simulation or other tabs are reflected.
 */
const RealtimeMessageSync = () => {
    const addIncomingMessage = useChatStore(state => state.addIncomingMessage);
    const addWorldMessage = useWorldStore(state => state.addWorldMessage); // For world chat sync
    
    useEffect(() => {
        // Hook into Dexie's creating event for messages
        const creatingHook = (primKey: any, obj: any, trans: Transaction) => {
            const currentUser = useAuthStore.getState().currentUser;
            // Only process if the message is from another user or system
            if (obj.senderId !== currentUser?.id) {
                // Determine if it's a regular chat message or a world message
                // This assumes worldId is used as chatId for world messages
                const currentWorld = useWorldStore.getState().currentWorld;
                const isWorldMessage = !!currentWorld && obj.chatId === currentWorld.id;

                if (isWorldMessage) {
                    addWorldMessage(obj);
                } else {
                    addIncomingMessage(obj);
                }
            }
        };

        db.messages.hook('creating', creatingHook);

        return () => {
            // Remove the hook when the component unmounts
            db.messages.hook('creating').unsubscribe(creatingHook);
        };
    }, [addIncomingMessage, addWorldMessage]);

    return null; // This component does not render anything
};

/**
 * The main application component.
 * It sets up routing, handles session checking, and displays a loading state
 * while the session is being verified. It also initializes global hooks.
 */
const App: React.FC = () => {
  const { checkSession, isLoading, isAuthenticated } = useAuthStore();

  // Initialize the WebSocket simulation hook. It will manage its own lifecycle.
  useWebSocketSim();
  // Initialize theme hook to apply theme on load and manage custom themes.
  useTheme();

  useEffect(() => {
    // Seed the database on initial load if it's empty.
    seedDatabase().catch(console.error);
    // Check for an existing session.
    checkSession();
  }, [checkSession]);

  // Display a global spinner while checking the session.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary" role="status" aria-label="Loading application">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
        {/* Only mount the real-time sync when authenticated */}
        {isAuthenticated && <RealtimeMessageSync />}
        <React.Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background-primary" role="status" aria-label="Loading content">
                <Spinner size="lg" />
            </div>
        }>
            <Routes>
                {/* Routes for unauthenticated users */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* Routes for authenticated users */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/open-world" element={<OpenWorldPage />} />
                    <Route path="/open-world/:worldId" element={<WorldInstancePage />} />
                </Route>
                
                {/* Fallback route - if no other route matches */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </React.Suspense>
    </Router>
  );
};

export default App;
