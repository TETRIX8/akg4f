
import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ModelSelector } from "@/components/ModelSelector";
import { SessionManager } from "@/components/SessionManager";
import { AuthPage } from "@/components/AuthPage";
import { Bot, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from '@supabase/supabase-js';

const Index = () => {
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Проверяем текущую сессию пользователя
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setCurrentSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы"
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из системы",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="p-6 border-b border-white/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bot className="w-8 h-8 text-cyan-400" />
                <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  AkProject AI
                </h1>
                <p className="text-sm text-gray-400">Powered by Advanced AI Models</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
              <SessionManager 
                currentSession={currentSession}
                onSessionChange={setCurrentSession}
              />
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="text-gray-300 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </header>

        {/* Main Chat Interface */}
        <div className="flex-1 flex">
          <ChatInterface 
            sessionId={currentSession}
            selectedModel={selectedModel}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
