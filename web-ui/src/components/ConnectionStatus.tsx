import { useState, useEffect } from 'react';
import { connectionService } from '../services/ConnectionService';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [autoReconnectStatus, setAutoReconnectStatus] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const unsubStatus = connectionService.onStatusChange((status) => {
      setConnected(status);
      if (status) {
        setIsReconnecting(false);
      }
    });

    const unsubAutoReconnect = connectionService.onAutoReconnectStatus((status) => {
      setAutoReconnectStatus(status);
    });

    // Attempt auto-reconnect on mount
    const attemptAutoReconnect = async () => {
      setIsReconnecting(true);
      const success = await connectionService.autoReconnect();
      if (!success) {
        setIsReconnecting(false);
      }
    };

    attemptAutoReconnect();

    return () => {
      unsubStatus();
      unsubAutoReconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      if (connected) {
        await connectionService.disconnect();
      } else {
        await connectionService.connect();
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isReconnecting
              ? 'bg-yellow-400 animate-pulse'
              : connected
              ? 'bg-green-400'
              : 'bg-gray-400'
          }`}
        />
        <span className="text-white/70 text-sm">
          {isReconnecting
            ? autoReconnectStatus || 'Reconnecting...'
            : connected
            ? 'Connected'
            : 'Disconnected'}
        </span>
      </div>

      <button
        onClick={handleConnect}
        disabled={isReconnecting}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          connected
            ? 'bg-white/10 hover:bg-white/20 text-white/80'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
      >
        {isReconnecting ? '...' : connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
