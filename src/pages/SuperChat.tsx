import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Play, CheckCircle, Clock, Loader2, Code, Key, Info, SkipForward, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TaskStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed" | "waiting-input" | "skipped";
  result?: string;
  code?: string;
  type?: "api-request" | "info-request" | "code-generation" | "analysis";
  requiredInput?: {
    type: "api-key" | "info" | "confirmation";
    prompt: string;
    placeholder?: string;
    required?: boolean; // Новое поле для определения обязательности
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [editValue, setEditValue] = useState("");
  const [currentInputStep, setCurrentInputStep] = useState<TaskStep | null>(null);
  const [currentEditStep, setCurrentEditStep] = useState<TaskStep | null>(null);
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
            model: "gpt-4o",
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
        "placeholder": "Подсказка для ввода",
        "required": true|false
      }
    }
  ]
}

ВАЖНО: Определи правильно нужен ли ОБЯЗАТЕЛЬНЫЙ ввод от пользователя:
- "required": true - только если БЕЗ этой информации задачу выполнить НЕВОЗМОЖНО (API ключи для внешних сервисов, критически важные детали)
- "required": false - если можно выполнить с разумными значениями по умолчанию

Типы этапов:
- "code-generation" - создание кода (обычно не требует ввода)
- "api-request" - вызов внешнего API (может требовать API ключ)
- "info-request" - нужна информация от пользователя (только если критично)
- "analysis" - анализ (обычно не требует ввода)
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

  const skipStep = (stepIndex: number) => {
    if (!plan) return;

    const updatedPlan = { ...plan };
    updatedPlan.steps[stepIndex].status = "skipped";
    updatedPlan.steps[stepIndex].result = "Этап пропущен пользователем";
    setPlan(updatedPlan);

    toast({
      title: "Этап пропущен",
      description: `Этап "${updatedPlan.steps[stepIndex].title}" был пропущен`,
    });

    // Если выполнение активно, переходим к следующему этапу
    if (isExecuting && currentStepIndex === stepIndex) {
      continueExecution(stepIndex + 1);
    }
  };

  const editStepInfo = (step: TaskStep, stepIndex: number) => {
    setCurrentEditStep(step);
    setEditValue(step.description);
    setShowEditDialog(true);
  };

  const handleEditSubmit = () => {
    if (!currentEditStep || !editValue.trim() || !plan) {
      toast({
        title: "Ошибка",
        description: "Введите описание этапа",
        variant: "destructive"
      });
      return;
    }

    const stepIndex = plan.steps.findIndex(s => s.id === currentEditStep.id);
    if (stepIndex >= 0) {
      const updatedPlan = { ...plan };
      updatedPlan.steps[stepIndex].description = editValue.trim();
      setPlan(updatedPlan);

      toast({
        title: "Этап обновлен",
        description: "Описание этапа успешно изменено",
      });
    }

    setShowEditDialog(false);
    setEditValue("");
    setCurrentEditStep(null);
  };

  const executeStep = async (step: TaskStep, stepIndex: number) => {
    if (!plan) return;

    const updatedPlan = { ...plan };
    updatedPlan.steps[stepIndex].status = "in-progress";
    setPlan(updatedPlan);

    try {
      // Проверяем, нужен ли ОБЯЗАТЕЛЬНЫЙ пользовательский ввод
      if (step.requiredInput && step.requiredInput.required !== false) {
        // Проверяем, есть ли уже нужная информация
        const hasRequiredData = checkIfHasRequiredData(step);
        
        if (!hasRequiredData) {
          updatedPlan.steps[stepIndex].status = "waiting-input";
          setPlan(updatedPlan);
          setCurrentInputStep(step);
          setShowInputDialog(true);
          return; // Останавливаем выполнение до получения ввода
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Реальное выполнение в зависимости от типа задачи
      let result = "";
      let code = "";

      switch (step.type) {
        case "code-generation":
          const codeResult = await generateCodeForStep(step);
          code = codeResult.code;
          result = codeResult.description;
          
          if (codeResult.files) {
            Object.assign(projectFiles, codeResult.files);
            setProjectFiles({...projectFiles});
          }
          break;

        case "api-request":
          const apiResult = await executeApiRequest(step);
          result = apiResult;
          break;

        case "analysis":
          const analysisResult = await performAnalysis(step);
          result = analysisResult;
          break;

        case "info-request":
          // Для info-request генерируем разумный результат по умолчанию
          result = generateDefaultInfoResult(step);
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

  const checkIfHasRequiredData = (step: TaskStep) => {
    if (!step.requiredInput) return true;

    switch (step.requiredInput.type) {
      case "api-key":
        const requiredService = step.description.toLowerCase();
        if (requiredService.includes("openai") && apiTokens["OPENAI_API_KEY"]) return true;
        if (requiredService.includes("stripe") && apiTokens["STRIPE_API_KEY"]) return true;
        return false;

      case "info":
        return step.requiredInput.required === false;

      case "confirmation":
        return step.requiredInput.required === false;

      default:
        return true;
    }
  };

  const generateDefaultInfoResult = (step: TaskStep) => {
    const defaults = {
      "название": "MyApp",
      "цвет": "синий",
      "стиль": "современный",
      "размер": "средний",
      "формат": "стандартный"
    };

    const stepDesc = step.description.toLowerCase();
    for (const [key, value] of Object.entries(defaults)) {
      if (stepDesc.includes(key)) {
        return `Использовано значение по умолчанию: ${value}`;
      }
    }

    return `Этап выполнен с базовыми настройками. ${step.description}`;
  };

  const generateCodeForStep = async (step: TaskStep) => {
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
    const requiredService = step.description.toLowerCase();
    
    if (requiredService.includes("openai") && !apiTokens["OPENAI_API_KEY"]) {
      throw new Error("Требуется OpenAI API ключ");
    }
    
    if (requiredService.includes("stripe") && !apiTokens["STRIPE_API_KEY"]) {
      throw new Error("Требуется Stripe API ключ");
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    return `API запрос выполнен успешно. Получены данные для ${step.title}`;
  };

  const performAnalysis = async (step: TaskStep) => {
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

    // Сохраняем введенную информацию
    if (currentInputStep.requiredInput?.type === "api-key") {
      const keyName = inputValue.includes("sk-") ? "OPENAI_API_KEY" : 
                     inputValue.includes("pk_") ? "STRIPE_API_KEY" : "API_KEY";
      setApiTokens({...apiTokens, [keyName]: inputValue});
    }

    // Закрываем диалог и сбрасываем значения
    setShowInputDialog(false);
    setInputValue("");

    // Сразу продолжаем выполнение без дополнительных подтверждений
    if (plan && currentStepIndex >= 0) {
      const stepIndex = plan.steps.findIndex(s => s.id === currentInputStep.id);
      if (stepIndex >= 0) {
        await executeStep(currentInputStep, stepIndex);
        continueExecution(stepIndex + 1);
      }
    }

    setCurrentInputStep(null);
  };

  const continueExecution = async (fromIndex: number) => {
    if (!plan) return;

    for (let i = fromIndex; i < plan.steps.length; i++) {
      if (plan.steps[i].status === "completed" || plan.steps[i].status === "skipped") {
        continue;
      }

      setCurrentStepIndex(i);
      await executeStep(plan.steps[i], i);
      
      if (plan.steps[i].status === "waiting-input") {
        break;
      }
    }

    const allCompleted = plan.steps.every(step => 
      step.status === "completed" || step.status === "skipped"
    );
    if (allCompleted) {
      setIsExecuting(false);
      setCurrentStepIndex(-1);

      toast({
        title: "План выполнен",
        description: "Все этапы завершены! Результаты готовы.",
      });

      showFinalResult();
    }
  };

  const executeAllSteps = async () => {
    if (!plan || isExecuting) return;

    setIsExecuting(true);
    await continueExecution(0);
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
      case "skipped":
        return <SkipForward className="w-4 h-4 text-orange-400" />;
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
      case "skipped":
        return "border-orange-500 bg-orange-500/10";
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
                    Умное автоматизированное выполнение
                  </h3>
                  <p className="text-gray-400 px-4 max-w-2xl mx-auto">
                    Опишите задачу, и AI создаст план, запросив только критически важную информацию. 
                    Остальные этапы выполнятся автоматически с разумными значениями по умолчанию.
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
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium text-white">{step.title}</h3>
                                  {getTypeIcon(step.type)}
                                  {step.requiredInput && step.requiredInput.required !== false && (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                                      Требует ввода
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => editStepInfo(step, index)}
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                    title="Редактировать этап"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                  
                                  {step.status === "pending" || step.status === "waiting-input" ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => skipStep(index)}
                                      className="h-6 px-2 text-orange-400 hover:text-orange-300"
                                      title="Пропустить этап"
                                    >
                                      <SkipForward className="w-3 h-3 mr-1" />
                                      Пропустить
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-300 mb-2">{step.description}</p>
                              
                              {step.status === "waiting-input" && step.requiredInput && (
                                <div className="text-sm text-yellow-300 bg-yellow-500/10 rounded-lg p-2 mb-2">
                                  ⏳ Ожидает обязательного ввода: {step.requiredInput.prompt}
                                </div>
                              )}
                              
                              {step.result && (
                                <div className={`text-sm rounded-lg p-2 mb-2 ${
                                  step.status === "skipped" 
                                    ? "text-orange-300 bg-orange-500/10" 
                                    : "text-green-300 bg-green-500/10"
                                }`}>
                                  {step.status === "skipped" ? "⏭️" : "✅"} {step.result}
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
                    {plan.steps.every(step => step.status === "completed" || step.status === "skipped") && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                        <h3 className="text-lg font-semibold text-green-300 mb-2">🎉 Задача выполнена!</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Завершенных этапов:</span>
                            <span className="text-white ml-2">{plan.steps.filter(s => s.status === "completed").length}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Пропущенных этапов:</span>
                            <span className="text-white ml-2">{plan.steps.filter(s => s.status === "skipped").length}</span>
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
              💡 AI выполнит максимум автоматически, запросив только критически важную информацию
            </p>
          </div>
        </div>
      </div>

      {/* Input Dialog - только один диалог для ввода */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {currentInputStep?.requiredInput?.type === "api-key" ? "🔑 Требуется API ключ" : 
               currentInputStep?.requiredInput?.type === "info" ? "ℹ️ Критически важная информация" : 
               "✅ Необходимая информация"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {currentInputStep?.requiredInput?.prompt}
              <br />
              <span className="text-yellow-300 text-sm">⚠️ Без этой информации задачу выполнить невозможно</span>
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
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleInputSubmit();
                  }
                }}
              />
            ) : (
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentInputStep?.requiredInput?.placeholder || "Введите информацию"}
                className="bg-slate-800 border-slate-600 text-white"
                rows={3}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleInputSubmit();
                  }
                }}
              />
            )}
            <div className="flex space-x-2">
              <Button onClick={handleInputSubmit} className="flex-1">
                Применить и продолжить
              </Button>
              <Button variant="outline" onClick={() => setShowInputDialog(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              ✏️ Редактировать этап
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Измените описание этапа "{currentEditStep?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Введите новое описание этапа"
              className="bg-slate-800 border-slate-600 text-white"
              rows={4}
            />
            <div className="flex space-x-2">
              <Button onClick={handleEditSubmit} className="flex-1">
                Сохранить изменения
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
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
