
import { useState, useEffect } from "react";
import { AuthPage } from "@/components/AuthPage";
import { SessionManager } from "@/components/SessionManager";
import { ChatInterface } from "@/components/ChatInterface";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import WebGLLoader from "@/components/WebGLLoader";

const Index = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
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

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  if (showLoader) {
    return <WebGLLoader onComplete={handleLoaderComplete} />;
  }

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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-white">🚀</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent truncate">
                  AkProject
                </h1>
              </div>
              
              <div className="hidden sm:block">
                <SessionManager 
                  currentSession={currentSession}
                  onSessionChange={setCurrentSession}
                />
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-3 flex-wrap">
              <div className="block sm:hidden w-full mb-2">
                <SessionManager 
                  currentSession={currentSession}
                  onSessionChange={setCurrentSession}
                />
              </div>
              
              <div className="hidden sm:block">
                <ModelSelector 
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>
              
              <Link to="/super-chat">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 text-xs sm:text-sm border border-cyan-500/30"
                >
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Супер Чат</span>
                  <span className="sm:hidden">AI</span>
                </Button>
              </Link>
              
              <Link to="/api-docs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">API Docs</span>
                  <span className="sm:hidden">API</span>
                </Button>
              </Link>
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Выйти</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
          
          <div className="block sm:hidden mt-2">
            <ModelSelector 
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
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
