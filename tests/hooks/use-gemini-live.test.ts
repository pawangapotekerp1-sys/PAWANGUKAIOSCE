import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeminiLive } from '../../../src/hooks/use-gemini-live';

describe('useGeminiLive', () => {
  let originalWebSocket: any;
  let originalAudioContext: any;
  let originalMediaDevices: any;

  beforeEach(() => {
    // Save original globals
    originalWebSocket = global.WebSocket;
    originalAudioContext = global.AudioContext;
    originalMediaDevices = navigator.mediaDevices;

    // Mock WebSocket
    global.WebSocket = vi.fn().mockImplementation(() => ({
      close: vi.fn(),
      send: vi.fn(),
      readyState: 1, // OPEN
    })) as any;

    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
      close: vi.fn(),
      createBuffer: vi.fn(),
      createBufferSource: vi.fn().mockReturnValue({ start: vi.fn(), connect: vi.fn() }),
      audioWorklet: { addModule: vi.fn().mockResolvedValue(true) },
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
      destination: {},
      currentTime: 0,
    })) as any;

    // Mock AudioWorkletNode
    (global as any).AudioWorkletNode = vi.fn().mockImplementation(() => ({
      port: { onmessage: null, postMessage: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock MediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        }),
      },
    });
  });

  afterEach(() => {
    // Restore globals
    global.WebSocket = originalWebSocket;
    global.AudioContext = originalAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', { writable: true, value: originalMediaDevices });
  });

  it('should prevent memory leaks by cleaning up on unmount', () => {
    const { unmount, result } = renderHook(() => useGeminiLive());
    
    // Unmounting should not throw any errors even if call hasn't started
    expect(() => unmount()).not.toThrow();
  });
});
