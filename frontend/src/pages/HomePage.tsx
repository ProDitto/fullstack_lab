import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatWindow } from '../components/features/chat/ChatWindow';
import { MessageInput } from '../components/features/chat/MessageInput';

const mockChats = [
  { id: '1', name: 'General', lastMessage: 'Hey everyone!' },
  { id: '2', name: 'Alice', lastMessage: 'See you tomorrow.' },
  { id: '3', name: 'Project X', lastMessage: 'Meeting at 3 PM.' },
];

export const HomePage = () => {
  const [activeChatId, setActiveChatId] = useState<string | undefined>('1');

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar chats={mockChats} onSelectChat={setActiveChatId} activeChatId={activeChatId} />
        <main className="flex-1 flex flex-col">
          {activeChatId ? (
            <>
              <div className="p-4 border-b border-border bg-background-secondary">
                <h2 className="text-xl font-bold">{mockChats.find(c => c.id === activeChatId)?.name}</h2>
              </div>
              <ChatWindow chatId={activeChatId} />
              <MessageInput chatId={activeChatId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              Select a chat to start messaging
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
