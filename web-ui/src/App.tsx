import { ConnectionBar } from './components/ConnectionBar';
import { MotionControl } from './components/MotionControl';
import { Console } from './components/Console';

function App() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Rewinder Motor Controller
          </h1>
          <p className="text-white/80 text-lg">TMC2209 Web Serial Interface</p>
        </div>

        <ConnectionBar />
        <MotionControl />
        <Console />

        <footer className="mt-8 text-center text-white/60 text-sm">
          Built with Vite + React + TypeScript + Tailwind CSS
        </footer>
      </div>
    </div>
  );
}

export default App;
