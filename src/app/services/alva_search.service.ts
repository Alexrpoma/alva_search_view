import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AlvaSearchService implements OnDestroy {

  private websocket: WebSocket | null = null;
  private clientId: string;
  private messageSubject = new Subject<string>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  private readonly CONTEXT_SERVER_WS_URL = environment.contextServerWsUrl;
  private readonly QDRANT_SERVICE_HTTP_URL = environment.qdrantServiceHttpUrl;

  public isConnected$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient) { // Inject HttpClient
    this.clientId = crypto.randomUUID();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.websocket?.close();
  }

  // **CONTEXT SERVER:**
  private connectWebSocket(): void {
    const wsUrl = `${this.CONTEXT_SERVER_WS_URL}${this.clientId}`;
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
    };
  }

  // **QDRANT SERVICE:**
  initiateQuery(query: string): Observable<any> {
    if (!this.connectionStatusSubject.value) {
        console.error("Cannot initiate query: WebSocket is not connected.");
        return new Observable(observer => observer.error("WebSocket not connected"));
    }

    const payload = {
      collection_name: environment.collectionName,
      query: query,
      client_id: this.clientId
    };

    console.log(`Sending query to qdrant_service (${this.QDRANT_SERVICE_HTTP_URL}):`, payload);
    return this.http.post<any>(this.QDRANT_SERVICE_HTTP_URL, payload);
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
}
