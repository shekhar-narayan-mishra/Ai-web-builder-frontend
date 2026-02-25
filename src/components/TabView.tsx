import { Code, Eye } from 'lucide-react';

interface TabViewProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={() => onTabChange('code')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'code'
            ? 'text-gray-900 bg-white shadow-sm border border-gray-200'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
      >
        <Code className="w-4 h-4" />
        Code
      </button>
      <button
        onClick={() => onTabChange('preview')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'preview'
            ? 'text-gray-900 bg-white shadow-sm border border-gray-200'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}
