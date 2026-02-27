import { useState, useEffect } from 'react';
import { connectionService } from '../services/ConnectionService';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [autoReconnectStatus, setAutoReconnectStatus] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [emulated, setEmulated] = useState((connectionService as any).isEmulated as boolean);

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

    // Check for ?emulate URL flag — auto-enable emulator without a button
    const params = new URLSearchParams(window.location.search);
    if (params.has('emulate') && !(connectionService as any).isEmulated) {
      const proxy = connectionService as any;
      proxy.setEmulatorMode(true).then(() => {
        setEmulated(true);
        connectionService.connect();
      });
      return () => { unsubStatus(); unsubAutoReconnect(); };
    }

    // Attempt auto-reconnect on mount (only for real device)
    const attemptAutoReconnect = async () => {
      if ((connectionService as any).isEmulated) return;
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
              ? emulated
                ? 'bg-blue-400'
                : 'bg-green-400'
              : 'bg-gray-400'
          }`}
        />
        <span className="text-white/70 text-sm">
          {isReconnecting
            ? autoReconnectStatus || 'Reconnecting...'
            : connected
            ? emulated
              ? 'Emulated'
              : 'Connected'
            : 'Disconnected'}
        </span>
      </div>

      {!emulated && (
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
      )}
    </div>
  );
}
