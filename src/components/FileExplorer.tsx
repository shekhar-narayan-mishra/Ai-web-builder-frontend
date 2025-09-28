import { useState } from 'react';
import { FileText, Folder } from 'lucide-react';
import { FileItem } from '../types';

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem | null) => void;
}

export function FileExplorer({ files, onFileSelect }: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file.path);
      onFileSelect(file);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4 text-white">File Explorer</h2>
      <div className="space-y-1">
        {files.length === 0 ? (
          <div className="text-gray-400 text-sm">No files generated yet</div>
        ) : (
          files.map((file) => (
            <div
              key={file.path}
              onClick={() => handleFileClick(file)}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedFile === file.path
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              {file.type === 'folder' ? (
                <Folder className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="text-sm">{file.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
