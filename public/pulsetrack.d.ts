export {};

declare global {
  interface PulseTrack {
    track(eventName: string, properties?: Record<string, unknown>): void;
    identify(userId: string, traits?: Record<string, unknown>): void;
    trackError(error: { type?: string; message?: string; stack?: string }): void;
    flush(): void;
    readonly sessionId: string;
  }

  interface Window {
    pulsetrack?: PulseTrack;
  }
}
