
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Model {
  id: string;
  name: string;
  description: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const API_BASE = "http://185.232.204.20:5000/api";

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`);
      const data = await response.json();
      
      if (data.success) {
        setModels(data.models);
      } else {
        throw new Error("Failed to fetch models");
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список моделей",
        variant: "destructive"
      });
      
      // Fallback models if API fails
      setModels([
        { id: "gpt-4o-mini", name: "GPT-4O Mini", description: "Fast and efficient" },
        { id: "gpt-4", name: "GPT-4", description: "Advanced reasoning" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Quick responses" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
          disabled={isLoading}
        >
          <Cpu className="w-4 h-4 mr-2" />
          {selectedModelData?.name || selectedModel}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-64 bg-slate-800/90 backdrop-blur-sm border-white/20"
        align="end"
      >
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <div className="font-medium">{model.name}</div>
              <div className="text-sm text-gray-400">{model.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
