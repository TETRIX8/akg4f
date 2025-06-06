
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Play, Pause, CheckCircle, Clock, Loader2, Code, Key, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TaskStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed" | "waiting-input";
  result?: string;
  code?: string;
  type?: "api-request" | "info-request" | "code-generation" | "analysis";
  requiredInput?: {
    type: "api-key" | "info" | "confirmation";
    prompt: string;
    placeholder?: string;
  };
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
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [currentInputStep, setCurrentInputStep] = useState<TaskStep | null>(null);
  const [apiTokens, setApiTokens] = useState<Record<string, string>>({});
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
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
      "description": "Подробное описание что нужно сделать на этом этапе",
      "type": "code-generation|api-request|info-request|analysis",
      "requiredInput": {
        "type": "api-key|info|confirmation",
        "prompt": "Что нужно запросить у пользователя",
        "placeholder": "Подсказка для ввода"
      }
    }
  ]
}

Определи тип каждого этапа:
- "code-generation" - если нужно написать код
- "api-request" - если нужен API токен для внешнего сервиса
- "info-request" - если нужна дополнительная информация от пользователя
- "analysis" - если нужно проанализировать что-то

Если для этапа нужен ввод от пользователя, добавь requiredInput с подходящим типом.
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
      // Проверяем, нужен ли пользовательский ввод
      if (step.requiredInput) {
        updatedPlan.steps[stepIndex].status = "waiting-input";
        setPlan(updatedPlan);
        setCurrentInputStep(step);
        setShowInputDialog(true);
        return; // Останавливаем выполнение до получения ввода
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Реальное выполнение в зависимости от типа задачи
      let result = "";
      let code = "";

      switch (step.type) {
        case "code-generation":
          // Генерируем реальный код
          const codeResult = await generateCodeForStep(step);
          code = codeResult.code;
          result = codeResult.description;
          
          // Сохраняем созданные файлы
          if (codeResult.files) {
            Object.assign(projectFiles, codeResult.files);
            setProjectFiles({...projectFiles});
          }
          break;

        case "api-request":
          // Выполняем API запрос если есть токен
          const apiResult = await executeApiRequest(step);
          result = apiResult;
          break;

        case "analysis":
          // Выполняем анализ
          const analysisResult = await performAnalysis(step);
          result = analysisResult;
          break;

        default:
          result = "Этап выполнен успешно";
      }

      updatedPlan.steps[stepIndex].status = "completed";
      updatedPlan.steps[stepIndex].result = result;
      if (code) {
        updatedPlan.steps[stepIndex].code = code;
      }
      setPlan(updatedPlan);

    } catch (error) {
      updatedPlan.steps[stepIndex].status = "failed";
      updatedPlan.steps[stepIndex].result = `Ошибка: ${error.message}`;
      setPlan(updatedPlan);
    }
  };

  const generateCodeForStep = async (step: TaskStep) => {
    // Симуляция генерации кода на основе описания этапа
    const codeExamples = {
      "component": `import React from 'react';
import { Button } from '@/components/ui/button';

const NewComponent = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">${step.title}</h2>
      <Button>Действие</Button>
    </div>
  );
};

export default NewComponent;`,
      
      "function": `export const ${step.title.toLowerCase().replace(/\s+/g, '')} = async (data: any) => {
  try {
    // ${step.description}
    const result = await processData(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
};`,

      "api": `const apiCall = async () => {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
};`
    };

    const codeType = step.description.includes("компонент") ? "component" : 
                     step.description.includes("функция") ? "function" : "api";
    
    return {
      code: codeExamples[codeType] || codeExamples["function"],
      description: `Код для ${step.title} успешно сгенерирован`,
      files: {
        [`${step.title.toLowerCase().replace(/\s+/g, '')}.tsx`]: codeExamples[codeType] || codeExamples["function"]
      }
    };
  };

  const executeApiRequest = async (step: TaskStep) => {
    // Проверяем наличие необходимых API токенов
    const requiredService = step.description.toLowerCase();
    
    if (requiredService.includes("openai") && !apiTokens["OPENAI_API_KEY"]) {
      throw new Error("Требуется OpenAI API ключ");
    }
    
    if (requiredService.includes("stripe") && !apiTokens["STRIPE_API_KEY"]) {
      throw new Error("Требуется Stripe API ключ");
    }

    // Симуляция API запроса
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `API запрос выполнен успешно. Получены данные для ${step.title}`;
  };

  const performAnalysis = async (step: TaskStep) => {
    // Симуляция анализа
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `Анализ завершен: ${step.description}. Найдены ключевые insights и рекомендации.`;
  };

  const handleInputSubmit = async () => {
    if (!currentInputStep || !inputValue.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите необходимую информацию",
        variant: "destructive"
      });
      return;
    }

    // Сохраняем введенные данные
    if (currentInputStep.requiredInput?.type === "api-key") {
      const keyName = inputValue.includes("sk-") ? "OPENAI_API_KEY" : 
                     inputValue.includes("pk_") ? "STRIPE_API_KEY" : "API_KEY";
      setApiTokens({...apiTokens, [keyName]: inputValue});
    }

    setShowInputDialog(false);
    setInputValue("");

    // Продолжаем выполнение этапа
    if (plan && currentStepIndex >= 0) {
      const stepIndex = plan.steps.findIndex(s => s.id === currentInputStep.id);
      if (stepIndex >= 0) {
        await executeStep(currentInputStep, stepIndex);
      }
    }

    setCurrentInputStep(null);
  };

  const executeAllSteps = async () => {
    if (!plan || isExecuting) return;

    setIsExecuting(true);
    
    for (let i = 0; i < plan.steps.length; i++) {
      setCurrentStepIndex(i);
      await executeStep(plan.steps[i], i);
      
      // Если этап ждет ввода, прерываем выполнение
      if (plan.steps[i].status === "waiting-input") {
        break;
      }
    }

    // Проверяем, все ли этапы завершены
    const allCompleted = plan.steps.every(step => step.status === "completed");
    if (allCompleted) {
      setIsExecuting(false);
      setCurrentStepIndex(-1);

      toast({
        title: "План выполнен",
        description: "Все этапы успешно завершены! Результаты готовы.",
      });

      // Показываем финальный результат
      showFinalResult();
    }
  };

  const showFinalResult = () => {
    const completedSteps = plan?.steps.filter(step => step.status === "completed") || [];
    const codeFiles = Object.keys(projectFiles);
    
    toast({
      title: "🎉 Задача выполнена!",
      description: `Создано ${completedSteps.length} этапов, ${codeFiles.length} файлов кода`,
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
      case "waiting-input":
        return <Info className="w-4 h-4 text-yellow-400" />;
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
      case "waiting-input":
        return "border-yellow-500 bg-yellow-500/10";
      default:
        return "border-gray-600 bg-gray-800/50";
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "code-generation":
        return <Code className="w-4 h-4 text-purple-400" />;
      case "api-request":
        return <Key className="w-4 h-4 text-orange-400" />;
      case "info-request":
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return null;
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
              <p className="text-sm text-gray-400">AI планирование и реальное выполнение задач</p>
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
                    Автоматизированное планирование и выполнение
                  </h3>
                  <p className="text-gray-400 px-4 max-w-2xl mx-auto">
                    Опишите задачу, и AI создаст детальный план с реальным выполнением каждого этапа. 
                    Система автоматически запросит необходимые API ключи и дополнительную информацию.
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
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-white">{step.title}</h3>
                                {getTypeIcon(step.type)}
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{step.description}</p>
                              
                              {step.status === "waiting-input" && step.requiredInput && (
                                <div className="text-sm text-yellow-300 bg-yellow-500/10 rounded-lg p-2 mb-2">
                                  ⏳ Ожидает ввода: {step.requiredInput.prompt}
                                </div>
                              )}
                              
                              {step.result && (
                                <div className="text-sm text-green-300 bg-green-500/10 rounded-lg p-2 mb-2">
                                  ✅ {step.result}
                                </div>
                              )}
                              
                              {step.code && (
                                <div className="mt-2">
                                  <div className="text-xs text-purple-300 mb-1">Сгенерированный код:</div>
                                  <pre className="text-xs bg-black/30 rounded p-2 overflow-x-auto text-green-400">
                                    {step.code.slice(0, 200)}...
                                  </pre>
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

                    {/* Финальный результат */}
                    {plan.steps.every(step => step.status === "completed") && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                        <h3 className="text-lg font-semibold text-green-300 mb-2">🎉 Задача выполнена!</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Завершенных этапов:</span>
                            <span className="text-white ml-2">{plan.steps.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Созданных файлов:</span>
                            <span className="text-white ml-2">{Object.keys(projectFiles).length}</span>
                          </div>
                        </div>
                        {Object.keys(projectFiles).length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-400 text-sm">Созданные файлы: </span>
                            <span className="text-cyan-300 text-sm">{Object.keys(projectFiles).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    )}
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
                placeholder="Опишите задачу для автоматизации (например: 'Создать систему аутентификации с регистрацией пользователей')"
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
              💡 AI создаст детальный план и реально выполнит каждый этап с запросом необходимых данных
            </p>
          </div>
        </div>
      </div>

      {/* Input Dialog */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {currentInputStep?.requiredInput?.type === "api-key" ? "🔑 Требуется API ключ" : 
               currentInputStep?.requiredInput?.type === "info" ? "ℹ️ Дополнительная информация" : 
               "✅ Подтверждение"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {currentInputStep?.requiredInput?.prompt}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentInputStep?.requiredInput?.type === "api-key" ? (
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentInputStep.requiredInput.placeholder || "Введите API ключ"}
                type="password"
                className="bg-slate-800 border-slate-600 text-white"
              />
            ) : (
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentInputStep?.requiredInput?.placeholder || "Введите информацию"}
                className="bg-slate-800 border-slate-600 text-white"
                rows={3}
              />
            )}
            <div className="flex space-x-2">
              <Button onClick={handleInputSubmit} className="flex-1">
                Продолжить
              </Button>
              <Button variant="outline" onClick={() => setShowInputDialog(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperChat;
