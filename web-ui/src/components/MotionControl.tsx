import { useState } from 'react';
import { serialService } from '../services/SerialService';

export function MotionControl() {
  const [speed, setSpeed] = useState(500);
  const [moveSteps, setMoveSteps] = useState(200);
  const [contSpeed, setContSpeed] = useState(500);
  const [microsteps, setMicrosteps] = useState(16);
  const [current, setCurrent] = useState(600);

  const send = async (command: string) => {
    try {
      await serialService.send(command);
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const sendAll = async (command: string) => {
    try {
      // Send command with ALL prefix for synchronized control
      const encoder = new TextEncoder();
      const writer = (serialService as any).writer;
      if (writer) {
        await writer.write(encoder.encode(`ALL ${command}\n`));
        console.log(`Sending to ALL motors: ALL ${command}`);
      }
    } catch (error) {
      console.error('Send all error:', error);
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

      {/* Synchronized Multi-Motor Control */}
      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-xl">🔄</span>
          Synchronized Multi-Motor Test
        </h3>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            Control all motors simultaneously with the ALL command prefix
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => sendAll('ENABLE 1')}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Enable All
            </button>
            <button
              onClick={() => sendAll('ENABLE 0')}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Disable All
            </button>
            <button
              onClick={() => sendAll(`SPEED ${speed}`)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Set All Speed ({speed})
            </button>
            <button
              onClick={() => sendAll(`MOVE ${moveSteps} ${speed}`)}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Sync Move All ({moveSteps} steps)
            </button>
            <button
              onClick={() => sendAll('DIR FWD')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              All FWD →
            </button>
            <button
              onClick={() => sendAll('DIR REV')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              All ← REV
            </button>
            <button
              onClick={() => sendAll('STOP')}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Stop All
            </button>
            <button
              onClick={() => sendAll('STATUS')}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              Status All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
