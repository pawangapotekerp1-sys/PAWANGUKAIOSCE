class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // The Gemini Live API requires 16-bit PCM audio chunks.
    // AudioWorklet inputs are Float32Array (-1.0 to 1.0).
    // We will accumulate chunks until we have a reasonable size (e.g. 2048 or 4096 frames)
    // before sending to avoid spamming postMessage.
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0];
    if (!channelData) return true;

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bytesWritten++] = channelData[i];

      if (this.bytesWritten >= this.bufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    if (this.bytesWritten === 0) return;

    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const int16Buffer = new Int16Array(this.bytesWritten);
    for (let i = 0; i < this.bytesWritten; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Send the Int16Array back to the main thread
    this.port.postMessage(int16Buffer);
    this.bytesWritten = 0;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
