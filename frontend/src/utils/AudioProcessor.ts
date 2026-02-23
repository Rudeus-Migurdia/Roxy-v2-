/**
 * Audio Processor - Handles audio playback and lip-sync
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;

  // Lip-sync parameters
  private mouthParam = 0; // 0.0 - 1.0
  private onMouthParamChange?: (value: number) => void;

  constructor(onMouthParamChange?: (value: number) => void) {
    this.onMouthParamChange = onMouthParamChange;
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: 24000, // Match TTS sample rate
      });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.1;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Decode base64 audio data
   */
  private async decodeAudio(base64Audio: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Remove data URL prefix if present
    const base64Data = base64Audio.includes(',')
      ? base64Audio.split(',')[1]
      : base64Audio;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return await this.audioContext.decodeAudioData(bytes.buffer);
  }

  /**
   * Play audio with lip-sync
   */
  async play(base64Audio: string): Promise<void> {
    await this.init();

    // Stop current audio if playing
    this.stop();

    try {
      const audioBuffer = await this.decodeAudio(base64Audio);

      // Create source and connect to analyser
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser!);
      this.analyser!.connect(this.audioContext!.destination);

      this.currentSource = source;
      this.isPlaying = true;

      // Start playback
      source.start();

      // Start lip-sync animation
      this.updateLipSync();

      // Cleanup when playback ends
      source.onended = () => {
        this.stop();
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      this.stop();
    }
  }

  /**
   * Update lip-sync parameters based on audio analysis
   */
  private updateLipSync(): void {
    if (!this.isPlaying || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume in frequency range relevant to speech
    let sum = 0;
    const speechRange = dataArray.slice(0, 30); // Lower frequencies for speech
    for (const value of speechRange) {
      sum += value;
    }
    const average = sum / speechRange.length;

    // Map to mouth parameter (0.0 - 1.0)
    const targetMouthParam = Math.min(average / 100, 1);

    // Smooth transition
    this.mouthParam += (targetMouthParam - this.mouthParam) * 0.3;

    // Clamp value
    this.mouthParam = Math.max(0, Math.min(1, this.mouthParam));

    // Notify callback
    this.onMouthParamChange?.(this.mouthParam);

    // Continue animation
    if (this.isPlaying) {
      requestAnimationFrame(() => this.updateLipSync());
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        // Disconnect the source to prevent memory leaks
        this.currentSource.disconnect();
      } catch {
        // Source already stopped or disconnected
      }
      this.currentSource = null;
    }

    this.isPlaying = false;
    this.mouthParam = 0;
    this.onMouthParamChange?.(0);
  }

  /**
   * Get current mouth parameter value
   */
  getMouthParam(): number {
    return this.mouthParam;
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop any playing audio
    this.stop();

    // Disconnect analyser from destination before cleanup
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Already disconnected
      }
      this.analyser = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Already closed
      }
      this.audioContext = null;
    }
  }
}
