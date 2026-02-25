import { FileItem } from '../types';
import { FileText } from 'lucide-react';

interface CodeEditorProps {
  file: FileItem | null;
}

export function CodeEditor({ file }: CodeEditorProps) {
  if (!file || !file.content) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <FileText className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-gray-400 text-sm">Select a file to view its content</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700">{file.name}</h3>
        <span className="text-xs text-gray-400 font-mono">— {file.path}</span>
      </div>
      <div className="flex-1 p-4 bg-[#fafbfc] overflow-auto">
        <pre className="text-[13px] text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
}
