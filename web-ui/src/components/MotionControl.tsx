import { useState } from 'react';
import { connectionService } from '../services/ConnectionService';

export function MotionControl() {
  const [speed, setSpeed] = useState(500);
  const [moveSteps, setMoveSteps] = useState(200);
  const [contSpeed, setContSpeed] = useState(500);
  const [microsteps, setMicrosteps] = useState(16);
  const [current, setCurrent] = useState(600);

  const send = async (command: string) => {
    try {
      await connectionService.send(command);
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">⚙️</span>
        Motion Control
      </h2>

      {/* Enable/Disable & Direction */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => send('ENABLE 1')}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Enable
        </button>
        <button
          onClick={() => send('ENABLE 0')}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Disable
        </button>
        <button
          onClick={() => send('DIR FWD')}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          FWD →
        </button>
        <button
          onClick={() => send('DIR REV')}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          ← REV
        </button>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <label className="text-sm font-medium text-gray-700">Speed (steps/s)</label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
            min="1"
            max="20000"
            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => send(`SPEED ${speed}`)}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
          >
            Set
          </button>
        </div>
      </div>

      {/* Move & Continuous */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <label className="text-sm font-medium text-gray-700">Move steps</label>
          <input
            type="number"
            value={moveSteps}
            onChange={(e) => setMoveSteps(+e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => send(`MOVE ${moveSteps} ${speed}`)}
            className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded font-medium transition-colors"
          >
            MOVE
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <label className="text-sm font-medium text-gray-700">Continuous</label>
          <input
            type="number"
            value={contSpeed}
            onChange={(e) => setContSpeed(+e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => send(`CONT ${contSpeed}`)}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors"
          >
            Start
          </button>
          <button
            onClick={() => send('STOP')}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-medium transition-colors"
          >
            Stop
          </button>
        </div>
      </div>

      {/* Jog & Settings */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            send('DIR REV');
            send(`MOVE 100 ${speed}`);
          }}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Jog -100
        </button>
        <button
          onClick={() => {
            send('DIR FWD');
            send(`MOVE 100 ${speed}`);
          }}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Jog +100
        </button>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <label className="text-sm font-medium text-gray-700">Microsteps</label>
          <input
            type="number"
            value={microsteps}
            onChange={(e) => setMicrosteps(+e.target.value)}
            min="1"
            max="256"
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => send(`MICROSTEPS ${microsteps}`)}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
          >
            Set
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
          <label className="text-sm font-medium text-gray-700">Current (mA)</label>
          <input
            type="number"
            value={current}
            onChange={(e) => setCurrent(+e.target.value)}
            min="100"
            max="2000"
            step="50"
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => send(`CURRENT ${current}`)}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
          >
            Set
          </button>
        </div>

        <button
          onClick={() => send('STATUS')}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          STATUS
        </button>
      </div>
    </div>
  );
}
