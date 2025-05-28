
import { useState, useEffect } from "react";
import { AuthPage } from "@/components/AuthPage";
import { SessionManager } from "@/components/SessionManager";
import { ChatInterface } from "@/components/ChatInterface";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Code } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const { toast } = useToast();

  const checkUserSession = async () => {
    console.log('Checking user session...');
    
    // Сначала проверяем Supabase сессию
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      console.log('Found Supabase session:', session.user);
      setUser(session.user);
    } else {
      // Проверяем ручную сессию в localStorage
      const manualSession = localStorage.getItem('manual_auth_session');
      if (manualSession) {
        try {
          const sessionData = JSON.parse(manualSession);
          console.log('Found manual session:', sessionData);
          
          // Проверяем, не истекла ли сессия
          if (sessionData.expires_at > Date.now()) {
            setUser(sessionData.user);
          } else {
            console.log('Manual session expired');
            localStorage.removeItem('manual_auth_session');
          }
        } catch (error) {
          console.error('Error parsing manual session:', error);
          localStorage.removeItem('manual_auth_session');
        }
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    checkUserSession();

    // Слушаем изменения авторизации в Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session?.user) {
        setUser(session.user);
        // Удаляем ручную сессию если есть Supabase сессия
        localStorage.removeItem('manual_auth_session');
      } else {
        // Проверяем ручную сессию если нет Supabase сессии
        const manualSession = localStorage.getItem('manual_auth_session');
        if (manualSession) {
          try {
            const sessionData = JSON.parse(manualSession);
            if (sessionData.expires_at > Date.now()) {
              setUser(sessionData.user);
            } else {
              setUser(null);
              localStorage.removeItem('manual_auth_session');
            }
          } catch (error) {
            setUser(null);
            localStorage.removeItem('manual_auth_session');
          }
        } else {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    console.log('Auth success callback triggered');
    // Перезагружаем состояние пользователя
    checkUserSession();
  };

  const handleLogout = async () => {
    try {
      // Выходим из Supabase
      await supabase.auth.signOut();
      
      // Удаляем ручную сессию
      localStorage.removeItem('manual_auth_session');
      
      setUser(null);
      setCurrentSession(null);
      
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы"
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">🚀</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  AkProject
                </h1>
              </div>
              
              <SessionManager 
                currentSession={currentSession}
                onSessionChange={setCurrentSession}
              />
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/api-docs">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  <Code className="w-4 h-4 mr-2" />
                  API Docs
                </Button>
              </Link>
              
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ChatInterface 
          sessionId={currentSession}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
};

export default Index;
