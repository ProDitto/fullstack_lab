import type { Message as MessageType } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { API_BASE_URL } from '../../../api/client';

interface MessageProps {
  message: MessageType;
  isCurrentUser: boolean;
}

const MessageStatusIcon = ({ status }: { status: MessageType['status'] }) => {
    switch (status) {
        case 'pending':
            return <Clock className="h-3 w-3" />;
        case 'sent':
            return <Check className="h-3 w-3" />;
        case 'delivered':
            return <CheckCheck className="h-3 w-3" />;
        case 'seen':
            return <CheckCheck className="h-3 w-3 text-blue-400" />;
        default:
            return null;
    }
}

export const Message = ({ message, isCurrentUser }: MessageProps) => {
  const alignment = isCurrentUser ? 'justify-end' : 'justify-start';
  const bubbleColor = isCurrentUser ? 'bg-primary-accent text-white' : 'bg-background-secondary text-text-primary';
  const user = { profilePictureUrl: null, email: 'guest'} // Mock user for avatar

  return (
    <div className={`flex items-end gap-2 ${alignment}`}>
      {!isCurrentUser && <Avatar src={user.profilePictureUrl ? `${API_BASE_URL}${user.profilePictureUrl}` : undefined} alt={user.email} size={8} />}
      <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${bubbleColor}`}>
        <p className="text-sm break-words">{message.content}</p>
        <div className="flex items-center justify-end gap-1 text-xs opacity-70 mt-1">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isCurrentUser && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
};
