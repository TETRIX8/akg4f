
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Github, Code, Send, Copy, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ApiDocs = () => {
  const [testPrompt, setTestPrompt] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  const handleTest = async () => {
    if (!testPrompt.trim()) {
      toast.error("Введите промпт для тестирования");
      return;
    }

    setIsLoading(true);
    try {
      // Здесь будет реальный вызов API
      // Пока симулируем ответ
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResponse(`Тестовый ответ на промпт: "${testPrompt}"\n\nЭто пример ответа от AkGPT API. В реальной реализации здесь будет ответ от вашего API.`);
      toast.success("Тест выполнен успешно");
    } catch (error) {
      toast.error("Ошибка при тестировании API");
      setTestResponse("Ошибка: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    toast.success("Код скопирован в буфер обмена");
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const codeExamples = {
    curl: `curl -X POST https://api.akgpt.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "akgpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Привет! Как дела?"
      }
    ],
    "max_tokens": 150
  }'`,
    javascript: `const response = await fetch('https://api.akgpt.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'akgpt-4',
    messages: [
      {
        role: 'user',
        content: 'Привет! Как дела?'
      }
    ],
    max_tokens: 150
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
    python: `import requests

url = "https://api.akgpt.com/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}
data = {
    "model": "akgpt-4",
    "messages": [
        {
            "role": "user",
            "content": "Привет! Как дела?"
        }
    ],
    "max_tokens": 150
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result["choices"][0]["message"]["content"])`
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  AkGPT API
                </h1>
              </div>
            </div>
            <a
              href="https://github.com/TETRIX8/Akgptapi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="text-white">GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            AkGPT API Документация
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Мощный API для интеграции искусственного интеллекта в ваши приложения. 
            Простой в использовании, быстрый и надежный.
          </p>
          <div className="flex justify-center space-x-4">
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50">
              v1.0.0
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              REST API
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              OpenAI Compatible
            </Badge>
          </div>
        </div>

        {/* API Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-cyan-400">🚀 Быстрый старт</CardTitle>
              <CardDescription className="text-gray-300">
                Начните использовать API за несколько минут
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Получите API ключ и отправьте первый запрос уже сегодня</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-purple-400">⚡ Высокая производительность</CardTitle>
              <CardDescription className="text-gray-300">
                Низкая задержка и высокая пропускная способность
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Оптимизированная инфраструктура для максимальной скорости</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-green-400">🔧 Легкая интеграция</CardTitle>
              <CardDescription className="text-gray-300">
                Совместимость с OpenAI API
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Замените URL и начните использовать существующий код</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Documentation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/5">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="examples">Примеры</TabsTrigger>
            <TabsTrigger value="test">Тестирование</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Базовая информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Base URL</h3>
                  <code className="bg-black/30 px-3 py-1 rounded text-sm">https://api.akgpt.com/v1</code>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Аутентификация</h3>
                  <p>Используйте Bearer токен в заголовке Authorization:</p>
                  <code className="bg-black/30 px-3 py-1 rounded text-sm block mt-1">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Поддерживаемые модели</h3>
                  <div className="space-y-2">
                    <Badge variant="outline" className="mr-2">akgpt-4</Badge>
                    <Badge variant="outline" className="mr-2">akgpt-3.5-turbo</Badge>
                    <Badge variant="outline" className="mr-2">akgpt-instruct</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Chat Completions</CardTitle>
                <CardDescription className="text-gray-300">
                  Основной endpoint для генерации ответов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mr-2">POST</Badge>
                  <code className="text-cyan-400">/chat/completions</code>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-white font-semibold">Параметры запроса:</h4>
                  <div className="bg-black/30 p-4 rounded space-y-2 text-sm">
                    <div><span className="text-cyan-400">model</span> (string): Модель для использования</div>
                    <div><span className="text-cyan-400">messages</span> (array): Массив сообщений</div>
                    <div><span className="text-cyan-400">max_tokens</span> (integer): Максимальное количество токенов</div>
                    <div><span className="text-cyan-400">temperature</span> (float): Температура генерации (0-2)</div>
                    <div><span className="text-cyan-400">stream</span> (boolean): Потоковая передача ответа</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Примеры кода</h2>
              
              <Tabs defaultValue="curl" className="space-y-4">
                <TabsList className="bg-white/5">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>

                {Object.entries(codeExamples).map(([lang, code]) => (
                  <TabsContent key={lang} value={lang}>
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white capitalize">{lang} Example</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code, lang)}
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedCode === lang ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-black/30 p-4 rounded overflow-x-auto text-sm">
                          <code className="text-gray-300">{code}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Тестирование API</CardTitle>
                <CardDescription className="text-gray-300">
                  Попробуйте API прямо здесь
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-white font-medium">Ваш промпт:</label>
                  <Textarea
                    placeholder="Введите ваш вопрос или запрос..."
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="bg-black/30 border-white/20 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleTest}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Обработка...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Send className="w-4 h-4" />
                      <span>Отправить запрос</span>
                    </div>
                  )}
                </Button>

                {testResponse && (
                  <div className="space-y-2">
                    <label className="text-white font-medium">Ответ API:</label>
                    <div className="bg-black/30 border border-white/20 rounded p-4 text-gray-300 whitespace-pre-wrap">
                      {testResponse}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiDocs;
