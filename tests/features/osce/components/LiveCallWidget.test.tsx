import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiveCallWidget } from '../../../../src/features/osce/components/LiveCallWidget';

// Mock the hook to prevent WebSocket/Media initialization during component render
vi.mock('../../../../src/hooks/use-gemini-live', () => ({
  useGeminiLive: vi.fn().mockReturnValue({
    isConnecting: false,
    isConnected: false,
    isSpeaking: false,
    startCall: vi.fn(),
    endCall: vi.fn(),
  })
}));

describe('LiveCallWidget', () => {
  it('should not crash when config is missing/null (White Screen Prevention)', () => {
    // This will throw if the component doesn't gracefully handle null config
    // resulting in a blank screen in React
    expect(() => {
      render(<LiveCallWidget config={null as any} onTranscriptUpdate={vi.fn()} />);
    }).not.toThrow();
  });
});
