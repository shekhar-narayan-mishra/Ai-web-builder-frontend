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
        ? <FolderOpen className="w-4 h-4 text-yellow-500" />
        : <Folder className="w-4 h-4 text-yellow-600" />;
    }
    
    // File type specific colors
    const ext = file.name.split('.').pop()?.toLowerCase();
    let color = 'text-gray-400';
    
    if (ext === 'tsx' || ext === 'ts') color = 'text-blue-400';
    else if (ext === 'jsx' || ext === 'js') color = 'text-yellow-400';
    else if (ext === 'css') color = 'text-purple-400';
    else if (ext === 'html') color = 'text-orange-400';
    else if (ext === 'json') color = 'text-green-400';
    
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
            className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer group transition-colors ${
              isSelected
                ? 'bg-purple-500/20 text-purple-300 border-l-2 border-purple-500'
                : 'hover:bg-gray-800/50 text-gray-400 hover:text-gray-300'
            }`}
          >
            {file.type === 'folder' && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
              </div>
            )}
            {getFileIcon(file)}
            <span className="text-sm font-mono truncate">{file.name}</span>
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
      <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-800/50">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Files
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          {files.length} {files.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Folder className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No files yet</p>
            <p className="text-gray-600 text-xs mt-1">Files will appear here</p>
          </div>
        ) : (
          renderFileTree(files)
        )}
      </div>
    </div>
  );
}
