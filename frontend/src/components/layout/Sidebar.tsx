interface ChatItem {
  id: string;
  name: string;
  lastMessage?: string;
}

interface SidebarProps {
  chats: ChatItem[];
  onSelectChat: (id: string) => void;
  activeChatId?: string;
}

export const Sidebar = ({ chats, onSelectChat, activeChatId }: SidebarProps) => {
  return (
    <div className="w-full md:w-1/4 bg-background-secondary border-r border-border flex-col hidden md:flex">
      <div className="p-4 border-b border-border">
        <input
          type="text"
          placeholder="Search chats"
          className="w-full bg-background-primary rounded-full px-4 py-2"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 cursor-pointer hover:bg-background-primary ${
              activeChatId === chat.id ? 'bg-primary-accent/20' : ''
            }`}
          >
            <p className="font-bold">{chat.name}</p>
            {chat.lastMessage && <p className="text-sm text-text-secondary truncate">{chat.lastMessage}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
