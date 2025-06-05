import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage } from "./ChatMessage";
import { FileUpload } from "./FileUpload";
import { chatDB } from "@/utils/indexedDBUtils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface UploadedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

interface ChatInterfaceProps {
  sessionId: string | null;
  selectedModel: string;
}

export const ChatInterface = ({ sessionId, selectedModel }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
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
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      // Загружаем из IndexedDB
      const dbMessages = await chatDB.getSessionMessages(sessionId);
      
      setMessages(dbMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })));
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    if (!sessionId) return;

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Сохраняем сообщение в IndexedDB
      await chatDB.saveMessage({
        id: messageId,
        session_id: sessionId,
        role,
        content,
        created_at: now
      });

      // Обновляем сессию с новым временем и счетчиком
      const sessions = await chatDB.getSessions();
      const currentSession = sessions.find(s => s.id === sessionId);
      
      if (currentSession) {
        await chatDB.saveSession({
          ...currentSession,
          updated_at: now,
          message_count: (currentSession.message_count || 0) + 1
        });
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !uploadedFile) || !sessionId) {
      if (!sessionId) {
        toast({
          title: "Создайте сессию",
          description: "Сначала создайте новую сессию для начала чата",
          variant: "destructive"
        });
      }
      return;
    }

    // Формируем сообщение с файлом, если он есть
    let messageContent = inputMessage;
    if (uploadedFile) {
      messageContent = `${inputMessage}\n\n[Файл: ${uploadedFile.name}]\n\`\`\`\n${uploadedFile.content}\n\`\`\``;
    }

    const userMessage: Message = {
      role: "user",
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage("user", messageContent);
    
    const messageToSend = messageContent;
    setInputMessage("");
    setUploadedFile(null);
    setIsLoading(true);

    try {
      const sessionResponse = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          settings: {
            model: selectedModel,
            temperature: 0.7
          }
        })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        throw new Error("Failed to create API session");
      }

      const response = await fetch(`${API_BASE}/sessions/${sessionData.session_id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: messageToSend
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        await saveMessage("assistant", data.response);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
  };

  const handleFileRemoved = () => {
    setUploadedFile(null);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
      {/* Chat Messages */}
      <div className="flex-1 mb-6">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-4 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Начните новый разговор
                </h3>
                <p className="text-gray-400">
                  Задайте любой вопрос, отправьте файл или получите ответ от AI-ассистента
                </p>
                <div className="mt-4 text-sm text-cyan-400">
                  💾 Все сообщения сохраняются локально
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="animate-fade-in">
                  <ChatMessage
                    message={message}
                    isBot={message.role === "assistant"}
                  />
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-400 animate-fade-in">
                <Bot className="w-6 h-6" />
                <div className="flex items-center space-x-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI думает...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 animate-fade-in">
        <FileUpload 
          onFileUploaded={handleFileUploaded}
          onFileRemoved={handleFileRemoved}
          uploadedFile={uploadedFile}
        />
        
        <div className="flex space-x-4">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите ваше сообщение..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl transition-all duration-200 focus:bg-white/15"
            disabled={isLoading || !sessionId}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || (!inputMessage.trim() && !uploadedFile) || !sessionId}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl px-6 transition-all duration-200 hover:scale-105"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!sessionId && (
          <p className="text-sm text-yellow-400 mt-2 flex items-center animate-pulse">
            ⚠️ Создайте сессию для начала чата
          </p>
        )}
      </div>
    </div>
  );
};
