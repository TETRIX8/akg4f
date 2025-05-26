
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatMessageProps {
  message: Message;
  isBot: boolean;
}

export const ChatMessage = ({ message, isBot }: ChatMessageProps) => {
  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return "";
    return timestamp.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className={cn(
      "flex items-start space-x-3 animate-fade-in",
      isBot ? "justify-start" : "justify-end flex-row-reverse space-x-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isBot 
          ? "bg-gradient-to-r from-cyan-500 to-purple-500" 
          : "bg-gradient-to-r from-purple-500 to-pink-500"
      )}>
        {isBot ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-3 backdrop-blur-sm",
        isBot 
          ? "bg-white/10 border border-white/20 text-white" 
          : "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white"
      )}>
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {message.timestamp && (
          <div className={cn(
            "text-xs mt-2 opacity-60",
            isBot ? "text-gray-300" : "text-gray-200"
          )}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};
