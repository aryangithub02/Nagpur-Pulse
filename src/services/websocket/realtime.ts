type RealtimeListener = (event: string, data: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isConnected: boolean = false;
  private pollInterval: number | null = null;
  private wsUrl: string = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';

  public connect(): void {
    if (this.ws || this.isConnected) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[Realtime] WebSocket connected to Nagpur Pulse backend');
        this.isConnected = true;
        this.emit('connected', { timestamp: new Date().toISOString() });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.emit(payload.event || 'message', payload.data || payload);
        } catch (e) {
          console.error('[Realtime] Message parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Realtime] WebSocket connection error. Polling fallback active.', err);
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log('[Realtime] WebSocket closed. Retrying connection in 10s...');
        this.isConnected = false;
        this.ws = null;
        setTimeout(() => this.connect(), 10000);
      };
    } catch (e) {
      console.warn('[Realtime] Could not establish WebSocket. Using polling mode.');
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(event: string, data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[Realtime] Error in event listener:', err);
      }
    });
  }

  public startPollingFallback(onPoll: () => void, intervalMs: number = 15000): () => void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = window.setInterval(() => {
      onPoll();
    }, intervalMs);

    return () => {
      if (this.pollInterval) clearInterval(this.pollInterval);
    };
  }
}

export const realtimeService = new RealtimeService();
