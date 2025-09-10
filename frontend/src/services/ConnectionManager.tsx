import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { connectionService } from './ConnectionService';

// This is a component that lives at the top level of the authenticated app
// to manage the lifecycle of the connection service.
export const ConnectionManager = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (accessToken) {
      console.log('Access token found, initializing connection service.');
      connectionService.initialize(accessToken);
    }

    return () => {
      console.log('ConnectionManager unmounting, cleaning up connection service.');
      connectionService.cleanup();
    };
  }, [accessToken]);

  return null; // This component doesn't render anything
};
