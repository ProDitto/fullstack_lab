import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useChatStore } from '../../../store/useChatStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { connectionService } from '../../../services/ConnectionService';

interface MessageInputProps {
  chatId: string;
}

export const MessageInput = ({ chatId }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const addMessage = useChatStore((state) => state.addMessage);
  const currentUser = useAuthStore((state) => state.user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;
    
    const tempId = crypto.randomUUID();
    const newMessage = {
        id: '', // Server will assign
        tempId,
        chatId,
        senderId: currentUser.id,
        recipientId: chatId, // Assuming chatId is recipientId for 1-to-1
        content: content.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
    }

    addMessage(chatId, newMessage, true);
    connectionService.sendMessage({
      type: 'NEW_MESSAGE',
      payload: {
        tempId: newMessage.tempId,
        recipientId: newMessage.recipientId,
        content: newMessage.content,
      },
    });

    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-background-secondary border-t border-border">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-background-primary border border-border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary-accent"
          maxLength={500}
        />
        <Button type="submit" variant="primary" className="rounded-full p-3">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
};
