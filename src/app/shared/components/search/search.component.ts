import { Component, OnInit, OnDestroy} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AlvaSearchService } from '../../../services/alva_search.service';
import { Message } from '../../../models/alva_search.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LinkIconPipe } from "../../../pipes/link-icon.pipe";

@Component({
  selector: 'app-search',
  imports: [ReactiveFormsModule, CommonModule, LinkIconPipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnInit, OnDestroy {
  query = new FormControl('');
  messages: Message[] = [];
  isGenerating: boolean = false;
  isConnected: boolean = false;
  private resultsSubscription: Subscription | null = null;
  private connectionSubscription: Subscription | null = null;
  private subscriptions = new Subscription();

  constructor(private alvaSearchService: AlvaSearchService, private sanitizer: DomSanitizer) { }

  // **INITIALIZE COMPONENT:**
  ngOnInit() {
    // Subscribe to LLM results (streaming)
    this.resultsSubscription = this.alvaSearchService.getQueryResults().subscribe({
        next: (token: string) => {
            this.isGenerating = true;
            if (token.startsWith('ERROR:')) {
                console.error("Received error from stream:", token);
                this.messages.push({
                  sender: 'ai bot',
                  content: `[System Error: ${token}]`,
                  timestamp: new Date().toISOString()
                });
                this.isGenerating = false; // Stop generating on error
                return;
            }

            if (token === '[DONE]' || token.startsWith('ERROR:')) {
              console.log("Stream finished.");
              this.isGenerating = false;
              return;
            }

            // Add/update AI messages
            if (this.messages.length > 0 && this.messages[this.messages.length - 1].sender === 'ai bot') {
              // Add token to the last AI message
              this.messages[this.messages.length - 1].content += token;
            } else {
              // Create new message if no previous AI message
              this.messages.push({
                sender: 'ai bot',
                content: token, // Start with the first token
                timestamp: new Date().toISOString()
              });
            }
        },
        error: (err) => {
          console.error("Error in results subscription:", err);
          this.isGenerating = false;
        },
        complete: () => {
          console.log("Results stream completed (unexpected for Subject).");
          this.isGenerating = false;
        }
    });
    this.subscriptions.add(this.resultsSubscription);

    // Subscribe to WebSocket connection status
    this.connectionSubscription = this.alvaSearchService.isConnected$.subscribe(status => {
      this.isConnected = status;
      if (!status) {
        this.isGenerating = false;
        console.warn("WebSocket disconnected.");
      } else {
          console.log("WebSocket connection status: Connected");
      }
    });
    this.subscriptions.add(this.connectionSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // **FORMAT AND SANITIZE CONTENT:**
  formatAndSanitize(rawContent: string): SafeHtml {
    console.log(rawContent);
    // 1. Replace **text** to <b>text</b> (o <strong>)
    let formattedContent = rawContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    console.log(formattedContent);
    return this.sanitizer.bypassSecurityTrustHtml(formattedContent);
  }

  sendQuery() {
    const message = this.query.value;
    if (message?.trim() && this.isConnected) {
      this.messages = []
      this.messages.push({ sender: 'user', content: message, timestamp: new Date().toISOString() });
      this.isGenerating = true;

      this.alvaSearchService.sendQueryViaWebSocket(message);

      this.query.reset();
    } else if (!this.isConnected) {
        console.warn("Cannot send query: WebSocket is not connected.");
    }
  }

  // **CHECK IF THERE IS NO AI BOT MESSAGE:**
  hasNoAiBotMessage(): boolean {
    return !this.messages.find(m => m.sender === 'ai bot');
  }
}
