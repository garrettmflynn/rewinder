import { useState, ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function TabContainer({ tabs, defaultTab }: TabContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex border-b border-white/20 mb-4 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? 'text-white border-white'
                : 'text-white/60 border-transparent hover:text-white/80 hover:border-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeContent}
      </div>
    </div>
  );
}
