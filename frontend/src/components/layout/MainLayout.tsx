import * as React from 'react';
import { Sidebar } from '../chat/Sidebar';
import { useChatStore } from '@/store/chatStore';
import { MessageSquare, Menu } from 'lucide-react'; // Added Menu icon
import { ChatView } from '../chat/ChatView';
import { SettingsDialog } from '../shared/SettingsDialog';
import { CreateChatDialog } from '../chat/CreateChatDialog';
import { Button } from '../ui/Button'; // Assuming Button is a UI component

export const MainLayout: React.FC = () => {
    const activeChatId = useChatStore((state) => state.activeChatId);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isCreateChatOpen, setIsCreateChatOpen] = React.useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 768); // Start open on desktop

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    // Close sidebar on navigation on mobile
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(true);
            } else {
                // On mobile, if a chat is active, close sidebar. Otherwise, keep current state.
                if (activeChatId) setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeChatId]); // Re-evaluate when activeChatId changes

    return (
        <>
            <div className="flex h-screen w-full bg-background-primary text-text-primary">
                {/* Mobile sidebar toggle button */}
                <div className="md:hidden absolute top-2 left-2 z-30">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleSidebar}
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <Menu className="h-6 w-6" /> 
                    </Button>
                </div>

                {/* Left Panel: Sidebar - Responsive behavior */}
                <aside className={`h-full flex flex-col border-r border-border bg-background-secondary 
                                  md:relative fixed top-0 left-0 w-80 z-20 transition-transform duration-300 ease-in-out
                                  ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                    <Sidebar 
                        onNewChat={() => { setIsCreateChatOpen(true); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        onSettings={() => { setIsSettingsOpen(true); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                        onCloseSidebar={() => setIsSidebarOpen(false)} // For mobile close button
                    />
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 h-full flex flex-col md:ml-0 transition-all duration-300 ease-in-out overflow-hidden">
                    {activeChatId ? (
                        <ChatView key={activeChatId} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-text-secondary p-4" role="status">
                            <MessageSquare size={48} className="mb-4" aria-hidden="true" />
                            <h2 className="text-2xl font-semibold text-center">Welcome to QuikChat</h2>
                            <p className="text-center">Select a conversation to start messaging.</p>
                        </div>
                    )}
                </main>
            </div>
            
            <SettingsDialog isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
            <CreateChatDialog isOpen={isCreateChatOpen} onOpenChange={setIsCreateChatOpen} />
        </>
    );
};
