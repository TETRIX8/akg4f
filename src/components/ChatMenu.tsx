
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Menu, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Settings,
  Clock,
  Archive
} from "lucide-react";
import { chatDB } from "@/utils/indexedDBUtils";
import { StorageInfo } from "./StorageInfo";
import { useToast } from "@/hooks/use-toast";

interface ChatSession {
  id: string;
  name: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ChatMenuProps {
  currentSession: string | null;
  onSessionChange: (sessionId: string | null) => void;
  onNewSession: () => void;
}

export const ChatMenu = ({ currentSession, onSessionChange, onNewSession }: ChatMenuProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadSessions = async () => {
    try {
      const loadedSessions = await chatDB.getSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    
    try {
      await chatDB.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession === sessionId) {
        onSessionChange(null);
      }
      
      toast({
        title: "Сессия удалена",
        description: "Чат и все сообщения были удалены"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сессию",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString("ru-RU", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit"
      });
    }
  };

  const currentSessionData = sessions.find(s => s.id === currentSession);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
        >
          <Menu className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">
            {currentSessionData?.name || "Меню чатов"}
          </span>
          <span className="sm:hidden">Меню</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 bg-slate-800/95 backdrop-blur-md border-white/20 shadow-2xl"
        align="end"
      >
        {/* Заголовок */}
        <div className="p-3 border-b border-slate-600/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center">
              <Archive className="w-4 h-4 mr-2 text-cyan-400" />
              История чатов
            </h3>
            <Button
              size="sm"
              onClick={onNewSession}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-7 px-3"
            >
              <Plus className="w-3 h-3 mr-1" />
              Новый
            </Button>
          </div>
        </div>

        {/* Информация о хранилище */}
        <div className="p-2">
          <StorageInfo onDataCleared={loadSessions} />
        </div>

        <DropdownMenuSeparator className="bg-slate-600/30" />

        {/* Список сессий */}
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет сохраненных чатов</p>
            </div>
          ) : (
            sessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSessionChange(session.id)}
                className={`
                  m-1 p-3 rounded-lg cursor-pointer transition-all duration-200
                  hover:bg-white/10 focus:bg-white/10
                  ${currentSession === session.id ? 'bg-cyan-500/20 border border-cyan-500/30' : ''}
                `}
              >
                <div className="flex items-center justify-between w-full group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <MessageSquare className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="font-medium text-white text-sm truncate">
                        {session.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(session.updated_at)}</span>
                      <span>•</span>
                      <span>{session.message_count} сообщений</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {session.model}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteSession(session.id, e)}
                    disabled={isLoading}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 h-6 w-6"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <style jsx>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #475569 transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #475569;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #64748b;
          }
        `}</style>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
