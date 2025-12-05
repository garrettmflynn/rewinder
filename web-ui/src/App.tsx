import { TabContainer } from './components/TabContainer';
import { MainInterface } from './components/MainInterface';
import { AdvancedMode } from './components/AdvancedMode';
import { ConnectionStatus } from './components/ConnectionStatus';

function App() {
  const tabs = [
    {
      id: 'main',
      label: 'Main',
      content: <MainInterface />,
    },
    {
      id: 'advanced',
      label: 'Advanced',
      content: <AdvancedMode />,
    },
  ];

  return (
    <div className="h-screen flex flex-col p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full overflow-hidden">
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h1 className="text-2xl font-semibold text-white/90">
            Rewinder
          </h1>
          <ConnectionStatus />
        </div>

        <TabContainer tabs={tabs} defaultTab="main" />

        <footer className="py-3 text-center text-white/40 text-xs flex-shrink-0">
          TMC2209 Web Serial Interface
        </footer>
      </div>
    </div>
  );
}

export default App;
