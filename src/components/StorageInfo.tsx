
import { useState, useEffect } from "react";
import { Database, HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { chatDB } from "@/utils/indexedDBUtils";
import { useToast } from "@/hooks/use-toast";

interface StorageInfoProps {
  onDataCleared?: () => void;
}

export const StorageInfo = ({ onDataCleared }: StorageInfoProps) => {
  const [storageInfo, setStorageInfo] = useState({
    sessions: 0,
    messages: 0,
    total: 0
  });
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadStorageInfo = async () => {
    try {
      const info = await chatDB.getStorageSize();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  useEffect(() => {
    loadStorageInfo();
    
    // Обновляем информацию каждые 5 секунд
    const interval = setInterval(loadStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await chatDB.clearAllData();
      await loadStorageInfo();
      onDataCleared?.();
      
      toast({
        title: "Данные очищены",
        description: "Все сохраненные чаты были удалены",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось очистить данные",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const maxStorage = 50 * 1024 * 1024; // 50MB лимит
  const usagePercent = Math.min((storageInfo.total / maxStorage) * 100, 100);

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
      <div className="flex items-center space-x-2">
        <HardDrive className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Локальное хранилище</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">Использовано</span>
          <span className="text-white font-medium">
            {formatBytes(storageInfo.total)} / {formatBytes(maxStorage)}
          </span>
        </div>

        <Progress 
          value={usagePercent} 
          className="h-2 bg-slate-700"
        />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Database className="w-3 h-3" />
            <span>Сессии: {formatBytes(storageInfo.sessions)}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Database className="w-3 h-3" />
            <span>Сообщения: {formatBytes(storageInfo.messages)}</span>
          </div>
        </div>

        {storageInfo.total > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearData}
            disabled={isClearing}
            className="w-full"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            {isClearing ? "Очистка..." : "Очистить данные"}
          </Button>
        )}
      </div>
    </div>
  );
};
