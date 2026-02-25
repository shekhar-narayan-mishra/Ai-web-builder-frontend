import { useState } from 'react';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { FileItem } from '../types';

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem | null) => void;
}

export function FileExplorer({ files, onFileSelect }: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file.path);
      onFileSelect(file);
    } else {
      toggleFolder(file.path);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.path)
        ? <FolderOpen className="w-4 h-4 text-amber-500" />
        : <Folder className="w-4 h-4 text-amber-500" />;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    let color = 'text-gray-400';

    if (ext === 'tsx' || ext === 'ts') color = 'text-blue-500';
    else if (ext === 'jsx' || ext === 'js') color = 'text-yellow-500';
    else if (ext === 'css') color = 'text-purple-500';
    else if (ext === 'html') color = 'text-orange-500';
    else if (ext === 'json') color = 'text-emerald-500';

    return <FileText className={`w-4 h-4 ${color}`} />;
  };

  const renderFileTree = (items: FileItem[], depth: number = 0) => {
    return items.map((file) => {
      const isExpanded = expandedFolders.has(file.path);
      const isSelected = selectedFile === file.path;

      return (
        <div key={file.path}>
          <div
            onClick={() => handleFileClick(file)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${isSelected
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
          >
            {file.type === 'folder' && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </div>
            )}
            {getFileIcon(file)}
            <span className="font-mono text-[13px] truncate">{file.name}</span>
          </div>

          {file.type === 'folder' && isExpanded && file.children && (
            <div>
              {renderFileTree(file.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Files
        </h2>
        <span className="text-xs text-gray-400 font-mono">
          {files.length} {files.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Folder className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No files yet</p>
            <p className="text-gray-300 text-xs mt-1">Files will appear here</p>
          </div>
        ) : (
          renderFileTree(files)
        )}
      </div>
    </div>
  );
}
