
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { file, upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: () => void;
  uploadedFile: UploadedFile | null;
}

export const FileUpload = ({ onFileUploaded, onFileRemoved, uploadedFile }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const supportedTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'text/xml',
    'application/xml'
  ];

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!supportedTypes.includes(file.type) && !file.name.match(/\.(txt|md|json|html|css|js|xml|csv)$/i)) {
      toast({
        title: "Неподдерживаемый тип файла",
        description: "Поддерживаются только текстовые файлы (txt, md, json, html, css, js, xml, csv)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB limit
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла: 1MB",
        variant: "destructive"
      });
      return;
    }

    setIsReading(true);
    try {
      const content = await readFileContent(file);
      const uploadedFile: UploadedFile = {
        name: file.name,
        content,
        type: file.type,
        size: file.size
      };
      onFileUploaded(uploadedFile);
      toast({
        title: "Файл загружен",
        description: `${file.name} готов для отправки`
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Ошибка чтения файла",
        description: "Не удалось прочитать содержимое файла",
        variant: "destructive"
      });
    } finally {
      setIsReading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <file className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
              <p className="text-xs text-cyan-400">{formatFileSize(uploadedFile.size)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFileRemoved}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 h-6 w-6"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-4 mb-3 transition-all duration-200 cursor-pointer
        ${isDragging 
          ? 'border-cyan-400 bg-cyan-500/10' 
          : 'border-white/20 hover:border-cyan-400/50 hover:bg-white/5'
        }
        ${isReading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.json,.html,.css,.js,.xml,.csv"
        onChange={handleInputChange}
      />
      
      <div className="text-center">
        <upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300 mb-1">
          {isReading ? 'Чтение файла...' : 'Перетащите файл или нажмите для выбора'}
        </p>
        <p className="text-xs text-gray-500">
          Поддерживаются: txt, md, json, html, css, js, xml, csv (до 1MB)
        </p>
      </div>
    </div>
  );
};
