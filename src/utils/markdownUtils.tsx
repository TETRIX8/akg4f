
import React from 'react';

export const formatMessageContent = (content: string) => {
  // Разбиваем контент на части для обработки различных элементов
  const parts = content.split(/(\`\`\`[\s\S]*?\`\`\`|\`[^`]+\`|\*\*[^*]+\*\*|\*[^*]+\*|#{1,6}\s[^\n]+|^\d+\.\s|^-\s)/gm);
  
  return parts.map((part, index) => {
    // Блоки кода
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim();
      const lines = code.split('\n');
      const language = lines[0];
      const codeContent = lines.slice(1).join('\n') || lines[0];
      
      return (
        <div key={index} className="my-4">
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg overflow-hidden">
            {language && !codeContent.includes('\n') ? null : (
              <div className="px-3 py-2 bg-slate-700/30 border-b border-slate-600/30 text-xs text-slate-300 font-medium">
                {language || 'code'}
              </div>
            )}
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm text-slate-200 font-mono leading-relaxed">
                {codeContent.includes('\n') ? codeContent : code}
              </code>
            </pre>
          </div>
        </div>
      );
    }
    
    // Инлайн код
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-2 py-1 bg-slate-700/50 text-cyan-300 rounded text-sm font-mono border border-slate-600/30">
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // Жирный текст
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    
    // Курсив
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={index} className="italic text-slate-200">{part.slice(1, -1)}</em>;
    }
    
    // Заголовки
    if (part.match(/^#{1,6}\s/)) {
      const level = part.match(/^#{1,6}/)?.[0].length || 1;
      const text = part.replace(/^#{1,6}\s/, '');
      const sizes = {
        1: 'text-xl font-bold text-white mt-4 mb-2',
        2: 'text-lg font-bold text-white mt-3 mb-2',
        3: 'text-base font-semibold text-white mt-3 mb-1',
        4: 'text-sm font-semibold text-slate-200 mt-2 mb-1',
        5: 'text-sm font-medium text-slate-200 mt-2 mb-1',
        6: 'text-xs font-medium text-slate-300 mt-1 mb-1'
      };
      
      return React.createElement(
        `h${level}`,
        { key: index, className: sizes[level as keyof typeof sizes] },
        text
      );
    }
    
    // Нумерованные списки
    if (part.match(/^\d+\.\s/)) {
      return (
        <div key={index} className="flex items-start my-1">
          <span className="text-cyan-400 font-medium mr-2 mt-0.5 text-sm">
            {part.match(/^\d+/)?.[0]}.
          </span>
          <span className="text-slate-200 leading-relaxed">
            {part.replace(/^\d+\.\s/, '')}
          </span>
        </div>
      );
    }
    
    // Маркированные списки
    if (part.match(/^-\s/)) {
      return (
        <div key={index} className="flex items-start my-1">
          <span className="text-cyan-400 mr-2 mt-2">•</span>
          <span className="text-slate-200 leading-relaxed">
            {part.replace(/^-\s/, '')}
          </span>
        </div>
      );
    }
    
    // Обычный текст с переносами строк
    return (
      <span key={index} className="text-slate-200 leading-relaxed">
        {part.split('\n').map((line, lineIndex, lines) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  });
};
