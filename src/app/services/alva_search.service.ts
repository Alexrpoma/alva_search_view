import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AlvaSearchService implements OnDestroy {

  private websocket: WebSocket | null = null;
  private clientId: string;
  private messageSubject = new Subject<string>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectAttempts: number = 5;
  private connectionSubscription: any;

  private readonly AI_SERVER_WS_URL = environment.aiServerWsUrl;
  private readonly COLLECTION_NAME = environment.collectionName;

  public isConnected$ = this.connectionStatusSubject.asObservable();

  constructor() {
    this.clientId = this.generateClientId();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    clearTimeout(this.connectionSubscription); // Clear reconnection timeout
    this.websocket?.close(1000, "Component destroyed"); // Normal closure
    this.connectionStatusSubject.complete();
    this.messageSubject.complete();
  }

  // **AI SERVER:**
  private connectWebSocket(): void {

    if (this.websocket && this.websocket.readyState !== WebSocket.CLOSED) {
        console.warn("WebSocket connection attempt while already open or connecting.");
        return;
    }

    const wsUrl = `${this.AI_SERVER_WS_URL}${this.clientId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('WebSocket connected to Context Server successfully');
      this.connectionStatusSubject.next(true);
    };

    this.websocket.onmessage = (event) => {
      this.messageSubject.next(event.data);
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionStatusSubject.next(false);
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.reason || 'No reason provided', `Code: ${event.code}`);
      this.connectionStatusSubject.next(false);
      this.websocket = null;
      // Reconnect
      console.log(`Attempting reconnect in ${this.reconnectInterval / 1000}s...`);
      this.connectionSubscription = setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
    };
  }

  // **SEND QUERY VIA WEBSOCKET:**
  sendQueryViaWebSocket(query: string): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        console.error("Cannot send query: WebSocket is not open.");
        this.messageSubject.next("ERROR: Connection lost. Please wait or refresh.");
        return;
    }

    const message = {
      type: "search", // Expected by the backend
      query: query,
      collection_name: this.COLLECTION_NAME
    };

    console.log(`Sending query via WebSocket:`, message);
    try {
        this.websocket.send(JSON.stringify(message)); // Send as JSON string
    } catch (e) {
        console.error("Failed to send message via WebSocket:", e);
        this.messageSubject.next("ERROR: Failed to send query. Connection may be closed.");
    }
  }

  getQueryResults(): Observable<string> {
    return this.messageSubject.asObservable();
  }

  reconnect(): void {
      if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
          console.log("Attempting to reconnect WebSocket...");
          this.connectWebSocket();
      } else {
          console.log("WebSocket is already connecting or open.");
      }
  }

  // **GENERATE CLIENT ID:**
  private generateClientId(): string {
    if (typeof self !== 'undefined' && self.crypto && typeof self.crypto.randomUUID === 'function') {
      try {
         const uuid = self.crypto.randomUUID();
         console.log("Using crypto.randomUUID() for Client ID.");
         return uuid;
      } catch (e) {
         console.warn("crypto.randomUUID() failed, likely due to insecure context (HTTP). Using fallback.", e);
      }
    }
    console.warn("Using simple fallback UUID generator.");
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  }

}
