
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chatDB } from "@/utils/indexedDBUtils";
import { ChatMenu } from "./ChatMenu";

interface SessionManagerProps {
  currentSession: string | null;
  onSessionChange: (sessionId: string | null) => void;
}

interface Session {
  id: string;
  name: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
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
      const user = await getCurrentUser();
      if (!user) return;

      // Всегда используем IndexedDB для хранения сессий
      const localSessions = await chatDB.getSessions();
      setSessions(localSessions);
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

      const newSession = {
        id: `session_${Date.now()}`,
        name: `Чат ${sessions.length + 1}`,
        model: 'gpt-4o-mini',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        user_id: user.id
      };

      // Сохраняем в IndexedDB
      await chatDB.saveSession(newSession);
      
      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      onSessionChange(newSession.id);
      
      toast({
        title: "Сессия создана",
        description: "Новая сессия успешно создана и сохранена локально"
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

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={createNewSession}
        disabled={isCreating}
        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all duration-200 hover:scale-105"
      >
        <Plus className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Новая сессия</span>
        <span className="sm:hidden">Новый</span>
      </Button>

      <ChatMenu
        currentSession={currentSession}
        onSessionChange={onSessionChange}
        onNewSession={createNewSession}
      />
    </div>
  );
};
