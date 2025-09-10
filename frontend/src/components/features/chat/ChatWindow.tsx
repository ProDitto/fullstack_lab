import { Message } from './Message';
import { useAuthStore } from '../../../store/useAuthStore';
import { useChatStore } from '../../../store/useChatStore';
import { useEffect, useRef } from 'react';

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow = ({ chatId }: ChatWindowProps) => {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const messages = useChatStore((state) => state.messagesByChatId[chatId] || []);
  const loadMessages = useChatStore((state) => state.loadMessagesFromDB);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages(chatId);
  }, [chatId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  if (!currentUserId) return null;

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex flex-col space-y-4">
        {messages.map((msg) => (
          <Message key={msg.tempId || msg.id} message={msg} isCurrentUser={msg.senderId === currentUserId} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
