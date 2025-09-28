import { FileItem } from '../types';

interface CodeEditorProps {
  file: FileItem | null;
}

export function CodeEditor({ file }: CodeEditorProps) {
  if (!file || !file.content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Select a file to view its content</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">{file.name}</h3>
        <p className="text-xs text-gray-400">{file.path}</p>
      </div>
      <div className="flex-1 p-4 bg-gray-900">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto h-full">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
}
