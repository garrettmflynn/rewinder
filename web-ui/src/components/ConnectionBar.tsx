import { useState, useEffect } from 'react';
import { serialService } from '../services/SerialService';

export function ConnectionBar() {
  const [connected, setConnected] = useState(false);
  const [activeMotor, setActiveMotor] = useState(0);
  const [autoReconnectStatus, setAutoReconnectStatus] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    serialService.onStatusChange((status) => {
      setConnected(status);
      if (status) {
        setIsReconnecting(false);
      }
    });

    serialService.onAutoReconnectStatus((status) => {
      setAutoReconnectStatus(status);
    });

    // Attempt auto-reconnect on mount
    const attemptAutoReconnect = async () => {
      setIsReconnecting(true);
      const success = await serialService.autoReconnect();
      if (!success) {
        setIsReconnecting(false);
      }
    };

    attemptAutoReconnect();
  }, []);

  const handleConnect = async () => {
    try {
      if (connected) {
        await serialService.disconnect();
      } else {
        await serialService.connect();
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleMotorChange = (motorId: number) => {
    setActiveMotor(motorId);
    serialService.setActiveMotor(motorId);
  };

  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      <button
        onClick={handleConnect}
        disabled={isReconnecting}
        className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
          connected
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isReconnecting ? 'Reconnecting...' : connected ? 'Disconnect' : 'Connect'}
      </button>

      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isReconnecting
              ? 'bg-yellow-400 animate-pulse'
              : connected
              ? 'bg-green-400 animate-pulse'
              : 'bg-gray-400'
          }`}
        />
        <span className="text-white font-medium">
          {isReconnecting
            ? autoReconnectStatus || 'Reconnecting...'
            : connected
            ? 'Connected @115200'
            : 'Not connected'}
        </span>
      </div>

      {/* Motor Selector - Hidden for now, ready for multi-motor support */}
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 opacity-50" title="Multi-motor support coming soon">
        <span className="text-white font-medium">Motor:</span>
        <select
          value={activeMotor}
          onChange={(e) => handleMotorChange(+e.target.value)}
          disabled={!connected}
          className="bg-white/20 text-white px-3 py-1 rounded border border-white/30 disabled:opacity-50"
        >
          <option value={0}>Motor 0</option>
          <option value={1} disabled>Motor 1 (Future)</option>
          <option value={2} disabled>Motor 2 (Future)</option>
          <option value={3} disabled>Motor 3 (Future)</option>
        </select>
      </div>
    </div>
  );
}
