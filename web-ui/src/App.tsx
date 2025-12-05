import { useState } from 'react';
import { TabContainer } from './components/TabContainer';
import { MainInterface } from './components/MainInterface';
import { AdvancedMode } from './components/AdvancedMode';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Console } from './components/Console';

function App() {
  const [consoleOpen, setConsoleOpen] = useState(false);

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
    <div className="h-screen flex overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col p-6 overflow-hidden transition-all duration-300 ${consoleOpen ? 'mr-80' : ''}`}>
        <div className="max-w-6xl mx-auto w-full flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h1 className="text-2xl font-semibold text-white/90">
              Rewinder
            </h1>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <button
                onClick={() => setConsoleOpen(!consoleOpen)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  consoleOpen
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                Console
              </button>
            </div>
          </div>

          <TabContainer tabs={tabs} defaultTab="main" />

          <footer className="py-3 text-center text-white/40 text-xs flex-shrink-0">
            TMC2209 Web Serial Interface
          </footer>
        </div>
      </div>

      {/* Console Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-700 transition-transform duration-300 ${
          consoleOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Console />
      </div>
    </div>
  );
}

export default App;
