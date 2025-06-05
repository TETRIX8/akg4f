
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Play, Pause, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TaskStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  result?: string;
}

interface Plan {
  title: string;
  description: string;
  steps: TaskStep[];
}

const SuperChat = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const API_BASE = "https://akgptapi.vercel.app/api";

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [plan, currentStepIndex]);

  const generatePlan = async () => {
    if (!userPrompt.trim()) {
      toast({
        title: "Введите задачу",
        description: "Пожалуйста, опишите задачу для планирования",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPlan(true);
    try {
      // Создаем сессию для планирования
      const sessionResponse = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          settings: {
            model: "gpt-4o-mini",
            temperature: 0.3
          }
        })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        throw new Error("Failed to create planning session");
      }

      const planningPrompt = `
Создай детальный план выполнения следующей задачи: "${userPrompt}"

Ответь СТРОГО в формате JSON:
{
  "title": "Название плана",
  "description": "Краткое описание того, что будет сделано",
  "steps": [
    {
      "id": "step_1",
      "title": "Название этапа",
      "description": "Подробное описание что нужно сделать на этом этапе"
    }
  ]
}

Создай от 3 до 8 логических этапов. Каждый этап должен быть конкретным и выполнимым.
`;

      const response = await fetch(`${API_BASE}/sessions/${sessionData.session_id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: planningPrompt
        })
      });

      const data = await response.json();

      if (data.success) {
        try {
          const planData = JSON.parse(data.response);
          const formattedPlan: Plan = {
            title: planData.title,
            description: planData.description,
            steps: planData.steps.map((step: any) => ({
              ...step,
              status: "pending" as const
            }))
          };
          setPlan(formattedPlan);
          setCurrentStepIndex(-1);
        } catch (parseError) {
          throw new Error("Не удалось обработать план от AI");
        }
      } else {
        throw new Error("Не удалось получить план");
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать план. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const executeStep = async (step: TaskStep, stepIndex: number) => {
    if (!plan) return;

    const updatedPlan = { ...plan };
    updatedPlan.steps[stepIndex].status = "in-progress";
    setPlan(updatedPlan);

    try {
      // Имитация выполнения задачи (в реальности здесь будет вызов AI)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Симуляция результата
      const mockResults = [
        "Задача выполнена успешно",
        "Создан необходимый контент",
        "Данные обработаны и сохранены",
        "Анализ завершен, результаты готовы",
        "Конфигурация настроена корректно"
      ];

      updatedPlan.steps[stepIndex].status = "completed";
      updatedPlan.steps[stepIndex].result = mockResults[Math.floor(Math.random() * mockResults.length)];
      setPlan(updatedPlan);

    } catch (error) {
      updatedPlan.steps[stepIndex].status = "failed";
      updatedPlan.steps[stepIndex].result = "Произошла ошибка при выполнении";
      setPlan(updatedPlan);
    }
  };

  const executeAllSteps = async () => {
    if (!plan || isExecuting) return;

    setIsExecuting(true);
    
    for (let i = 0; i < plan.steps.length; i++) {
      setCurrentStepIndex(i);
      await executeStep(plan.steps[i], i);
    }

    setIsExecuting(false);
    setCurrentStepIndex(-1);

    toast({
      title: "План выполнен",
      description: "Все этапы успешно завершены!",
    });
  };

  const getStatusIcon = (status: TaskStep["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />;
      case "in-progress":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <div className="w-4 h-4 rounded-full bg-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TaskStep["status"]) => {
    switch (status) {
      case "pending":
        return "border-gray-600 bg-gray-800/50";
      case "in-progress":
        return "border-blue-500 bg-blue-500/10";
      case "completed":
        return "border-green-500 bg-green-500/10";
      case "failed":
        return "border-red-500 bg-red-500/10";
      default:
        return "border-gray-600 bg-gray-800/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к чату
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                🚀 Супер Чат - Автоматизация
              </h1>
              <p className="text-sm text-gray-400">AI планирование и автоматическое выполнение задач</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-6xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden px-4 pt-4 pb-2">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-6 pr-4">
              {!plan ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    Автоматизированное планирование
                  </h3>
                  <p className="text-gray-400 px-4 max-w-2xl mx-auto">
                    Опишите задачу, и AI создаст детальный план с автоматическим выполнением каждого этапа
                  </p>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {/* План */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-white mb-2">{plan.title}</h2>
                        <p className="text-gray-300">{plan.description}</p>
                      </div>
                      <Button
                        onClick={executeAllSteps}
                        disabled={isExecuting}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Выполняется...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Запустить план
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Этапы */}
                    <div className="space-y-3">
                      {plan.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`border rounded-xl p-4 transition-all duration-300 ${getStatusColor(step.status)} ${
                            currentStepIndex === index ? 'ring-2 ring-blue-400' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getStatusIcon(step.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white mb-1">{step.title}</h3>
                              <p className="text-sm text-gray-300 mb-2">{step.description}</p>
                              {step.result && (
                                <div className="text-sm text-green-300 bg-green-500/10 rounded-lg p-2">
                                  ✅ {step.result}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {index + 1}/{plan.steps.length}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex space-x-4">
              <Input
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Опишите задачу для автоматизации (например: 'Создать план маркетинговой кампании для нового продукта')"
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl"
                disabled={isGeneratingPlan || isExecuting}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generatePlan();
                  }
                }}
              />
              <Button
                onClick={generatePlan}
                disabled={isGeneratingPlan || isExecuting || !userPrompt.trim()}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl px-6"
              >
                {isGeneratingPlan ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Создать план"
                )}
              </Button>
            </div>
            
            <p className="text-xs text-gray-400 mt-2">
              💡 AI создаст детальный план и автоматически выполнит каждый этап
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperChat;
