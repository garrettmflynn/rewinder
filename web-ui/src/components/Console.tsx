import { useState, useEffect, useRef } from 'react';
import { serialService } from '../services/SerialService';
import type { SerialMessage } from '../types';

export function Console() {
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [rawCommand, setRawCommand] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    serialService.onMessage((content) => {
      setMessages((prev) => [
        ...prev,
        { direction: 'received', content, timestamp: new Date() },
      ]);
    });
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!rawCommand.trim()) return;

    try {
      // Display the command as it will be sent (with motor prefix if needed)
      const motorId = serialService.getActiveMotor();
      const displayCommand = motorId === 0 ? rawCommand : `M${motorId} ${rawCommand}`;

      await serialService.send(rawCommand);
      setMessages((prev) => [
        ...prev,
        { direction: 'sent', content: displayCommand, timestamp: new Date() },
      ]);
      setRawCommand('');
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">💬</span>
        Console
      </h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={rawCommand}
          onChange={(e) => setRawCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type raw command e.g. STATUS or M1 ENABLE 1"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSend}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Send
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          Clear
        </button>
      </div>

      <div
        ref={logRef}
        className="h-64 overflow-auto bg-gray-900 rounded-lg p-4 font-mono text-sm"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-1 ${
              msg.direction === 'sent' ? 'text-cyan-400' : 'text-green-400'
            }`}
          >
            <span className="text-gray-500 mr-2">
              {msg.timestamp.toLocaleTimeString()}
            </span>
            <span className="text-gray-400 mr-2">
              {msg.direction === 'sent' ? '→' : '←'}
            </span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
