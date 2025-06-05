
import { Bot, User, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageContent } from "@/utils/markdownUtils";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return "";
    return timestamp.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={cn(
      "flex items-start space-x-2 sm:space-x-3 animate-fade-in group",
      isBot ? "justify-start" : "justify-end flex-row-reverse space-x-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg",
        isBot 
          ? "bg-gradient-to-r from-cyan-500 to-purple-500" 
          : "bg-gradient-to-r from-purple-500 to-pink-500"
      )}>
        {isBot ? (
          <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        ) : (
          <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl backdrop-blur-sm relative",
        isBot 
          ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/30 shadow-lg" 
          : "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-lg"
      )}>
        {/* Copy button for bot messages */}
        {isBot && (
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/30"
            title="Скопировать сообщение"
          >
            {copied ? (
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-300" />
            )}
          </button>
        )}

        <div className={cn(
          "px-3 py-2 sm:px-4 sm:py-3",
          isBot ? "pr-8 sm:pr-12" : "pr-3 sm:pr-4" // Extra padding for copy button
        )}>
          <div className="prose prose-invert prose-sm max-w-none text-sm sm:text-base">
            {isBot ? (
              <div className="space-y-2">
                {formatMessageContent(message.content)}
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words text-white">
                {message.content}
              </div>
            )}
          </div>
        </div>
        
        {message.timestamp && (
          <div className={cn(
            "px-3 pb-2 sm:px-4 sm:pb-2 text-xs opacity-60",
            isBot ? "text-slate-400" : "text-slate-300"
          )}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};
