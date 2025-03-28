import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AlvaSearchService {

  private websocket: WebSocket;

  constructor() {
    this.websocket = new WebSocket('ws://localhost:8000/api/search/ws');
    this.websocket.onopen = () => {
      console.log('Websocket connected');
    }
  }

  sendQuery(query: string) {
    this.websocket.send(query);
  }

  getQueryResults(): Observable<string> {
    return new Observable(observer => {
      this.websocket.onmessage = (event) => {
        observer.next(event.data);
      }
    });
  }
}
