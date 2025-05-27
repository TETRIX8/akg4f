
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import emailjs from '@emailjs/browser';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendAuthCode = async () => {
    if (!email) {
      toast({
        title: "Ошибка",
        description: "Введите email адрес",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const authCode = generateCode();
    
    try {
      // Сохраняем код в localStorage с временной меткой
      localStorage.setItem('auth_code', authCode);
      localStorage.setItem('auth_email', email);
      localStorage.setItem('auth_code_time', Date.now().toString());

      // Отправляем код через EmailJS
      const templateParams = {
        to_email: email,
        auth_code: authCode,
        from_name: "AkProject"
      };

      // Инициализируем EmailJS с реальными ключами
      emailjs.init("aoak44iftoobsH4Xm");

      await emailjs.send(
        "service_vcaxptx",
        "template_tcl61en",
        templateParams
      );

      toast({
        title: "Код отправлен",
        description: "Проверьте вашу почту и введите код для входа",
      });
      setStep('code');
    } catch (error) {
      console.error('Error sending code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить код. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code) {
      toast({
        title: "Ошибка",
        description: "Введите код из письма",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const savedCode = localStorage.getItem('auth_code');
      const savedEmail = localStorage.getItem('auth_email');
      const codeTime = localStorage.getItem('auth_code_time');

      // Проверяем срок действия кода (10 минут)
      if (!codeTime || Date.now() - parseInt(codeTime) > 10 * 60 * 1000) {
        throw new Error('Код истек');
      }

      if (code !== savedCode || email !== savedEmail) {
        throw new Error('Неверный код');
      }

      // Входим или регистрируем пользователя в Supabase
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) throw error;

      // Очищаем localStorage
      localStorage.removeItem('auth_code');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_code_time');

      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в AkProject!",
      });

      onAuthSuccess();
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Неверный код. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">🚀</span>
                </div>
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              AkProject
            </h1>
            <p className="text-gray-300 mt-2">AI Assistant Platform</p>
          </div>

          {step === 'email' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Вход в систему</h2>
                <p className="text-gray-400 text-sm">
                  Введите ваш email для получения кода авторизации
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    onKeyPress={(e) => e.key === 'Enter' && sendAuthCode()}
                  />
                </div>

                <Button
                  onClick={sendAuthCode}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                >
                  {isLoading ? "Отправляем..." : "Получить код"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Введите код</h2>
                <p className="text-gray-400 text-sm">
                  Мы отправили код на <span className="text-cyan-400">{email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-center text-lg tracking-widest"
                    maxLength={6}
                    onKeyPress={(e) => e.key === 'Enter' && verifyCode()}
                  />
                </div>

                <Button
                  onClick={verifyCode}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isLoading ? "Проверяем..." : "Войти"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  onClick={() => setStep('email')}
                  variant="ghost"
                  className="w-full text-gray-300 hover:text-white"
                >
                  Изменить email
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
