import { Code, Eye } from 'lucide-react';

interface TabViewProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-[#0a0a0a] border-b border-gray-800/50">
      <button
        onClick={() => onTabChange('code')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          activeTab === 'code'
            ? 'text-white bg-[#1a1a1a] shadow-sm'
            : 'text-gray-500 hover:text-gray-300 hover:bg-[#151515]'
        }`}
      >
        <Code className="w-4 h-4" />
        Code
      </button>
      <button
        onClick={() => onTabChange('preview')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          activeTab === 'preview'
            ? 'text-white bg-[#1a1a1a] shadow-sm'
            : 'text-gray-500 hover:text-gray-300 hover:bg-[#151515]'
        }`}
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}
