interface TabViewProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div className="flex border-b border-gray-700 bg-gray-800">
      <button
        onClick={() => onTabChange('code')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'code'
            ? 'text-white bg-gray-700 border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Code
      </button>
      <button
        onClick={() => onTabChange('preview')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'preview'
            ? 'text-white bg-gray-700 border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Preview
      </button>
    </div>
  );
}
