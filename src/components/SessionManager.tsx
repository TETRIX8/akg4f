
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MessageSquare, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SessionManagerProps {
  currentSession: string | null;
  onSessionChange: (sessionId: string | null) => void;
}

interface Session {
  id: string;
  name: string;
  model: string;
  created_at: string;
}

export const SessionManager = ({ currentSession, onSessionChange }: SessionManagerProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const getCurrentUser = async () => {
    // Сначала проверяем Supabase сессию
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return user;
    }

    // Если нет Supabase сессии, проверяем ручную сессию
    const manualSession = localStorage.getItem('manual_auth_session');
    if (manualSession) {
      try {
        const sessionData = JSON.parse(manualSession);
        if (sessionData.expires_at > Date.now()) {
          return sessionData.user;
        } else {
          // Сессия истекла
          localStorage.removeItem('manual_auth_session');
        }
      } catch (error) {
        console.error('Error parsing manual session:', error);
        localStorage.removeItem('manual_auth_session');
      }
    }

    return null;
  };

  const loadSessions = async () => {
    try {
      // Для ручных сессий используем localStorage
      const user = await getCurrentUser();
      if (!user) return;

      // Пытаемся загрузить из Supabase только если есть Supabase пользователь
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } else {
        // Для ручных сессий загружаем из localStorage
        const localSessions = localStorage.getItem(`sessions_${user.id}`);
        if (localSessions) {
          setSessions(JSON.parse(localSessions));
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createNewSession = async () => {
    setIsCreating(true);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Creating session for user:', user);

      // Проверяем, это Supabase пользователь или ручной
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        // Создаем сессию в Supabase
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .insert({
            user_id: supabaseUser.id,
            name: `Чат ${sessions.length + 1}`,
            model: 'gpt-4o-mini'
          })
          .select()
          .single();

        if (error) throw error;

        setSessions(prev => [data, ...prev]);
        onSessionChange(data.id);
      } else {
        // Создаем ручную сессию в localStorage
        const newSession = {
          id: `session_${Date.now()}`,
          name: `Чат ${sessions.length + 1}`,
          model: 'gpt-4o-mini',
          created_at: new Date().toISOString(),
          user_id: user.id
        };

        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        
        // Сохраняем в localStorage
        localStorage.setItem(`sessions_${user.id}`, JSON.stringify(updatedSessions));
        
        onSessionChange(newSession.id);
      }
      
      toast({
        title: "Сессия создана",
        description: "Новая сессия успешно создана"
      });
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать новую сессию",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        // Удаляем из Supabase
        const { error } = await supabase
          .from('ai_chat_sessions')
          .delete()
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        // Удаляем из localStorage
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        localStorage.setItem(`sessions_${user.id}`, JSON.stringify(updatedSessions));
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession === sessionId) {
        onSessionChange(null);
      }
      
      toast({
        title: "Сессия удалена",
        description: "Сессия успешно удалена"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сессию",
        variant: "destructive"
      });
    }
  };

  const currentSessionData = sessions.find(s => s.id === currentSession);

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={createNewSession}
        disabled={isCreating}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Новая сессия
      </Button>

      {sessions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {currentSessionData?.name || "Выберите сессию"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            className="w-64 bg-slate-800/90 backdrop-blur-sm border-white/20"
            align="end"
          >
            {sessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSessionChange(session.id)}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer flex items-center justify-between"
              >
                <div className="flex flex-col items-start flex-1">
                  <div className="font-medium">{session.name}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(session.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => deleteSession(session.id, e)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
