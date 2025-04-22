import { Component, OnInit, OnDestroy} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AlvaSearchService } from '../../../services/alva_search.service';
import { Message } from '../../../models/alva_search.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LinkIconPipe } from "../../../pipes/link-icon.pipe";
import { ExtractDomainPipe } from "../../../pipes/extract-domain.pipe";

interface NewsBlock {
  title: string;
  content: string;
  urls: string[];
}

@Component({
  selector: 'app-search',
  imports: [ReactiveFormsModule, CommonModule, LinkIconPipe, ExtractDomainPipe],
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

  estaExpandido = false;

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
    // console.log(rawContent);
    // 1. Replace **text** to <b>text</b> (o <strong>)
    let formattedContent = rawContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // console.log(formattedContent);
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

  getTitles(content: string): any {

    // Extraer títulos
    const titleRegex = /\*\*(.*?)\*\*/g;
    const titles = [...content.matchAll(titleRegex)].map(match => match[1].trim());

    // Dividir en bloques por título
    const parts = content.split(/\*\*(.*?)\*\*/g).filter(part => part.trim() !== '');

    // Extraer todas las URLs posibles:
    // - URL suelta
    // - [URL](URL)
    const urlRegex = /(?:https?:\/\/[^\s)]+)|(?:\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^\)]+)\))/g;
    const allUrls: string[] = [];

    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      // Si es del tipo [url](url), extraemos una sola vez
      if (match[1] && match[2]) {
        allUrls.push(match[1]); // o match[2], son iguales en este caso
      } else {
        allUrls.push(match[0]);
      }
    }

    const result = [];
    let urlIndex = 0;

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];

      // Contenido del bloque correspondiente
      const contentBlock = parts[i * 2 + 1] || "";

      // Buscar urls dentro del bloque (markdown o sueltas)
      const blockUrls = [];
      let blockMatch;
      const blockRegex = /(?:https?:\/\/[^\s)]+)|(?:\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^\)]+)\))/g;

      while ((blockMatch = blockRegex.exec(contentBlock)) !== null) {
        blockUrls.push(blockMatch[1] || blockMatch[0]); // preferimos el texto limpio si existe
      }

      // Si el bloque tiene URLs, las usamos; si no, usamos las siguientes del total
      const urls = blockUrls.length > 0
        ? blockUrls
        : allUrls.slice(urlIndex, urlIndex + 1);

      urlIndex += urls.length;

      result.push({ title, urls });
    }


    return result;
  }

  parseNewsContent(content: any): NewsBlock[] {
    const blocks: NewsBlock[] = [];

    // Extrae todos los títulos con sus contenidos (hasta el siguiente ** o el final)
    const newsRegex = /\*\*(.+?)\*\*\n\n([\s\S]*?)(?=\n\n\*\*|$)/g;
    let match;
  
    while ((match = newsRegex.exec(content)) !== null) {
      const title = match[1].trim();
      let body = match[2].trim();
  
      // Extrae todas las URLs del bloque de contenido
      const urlRegex = /(https?:\/\/[^\s\)\]]+)/g;
      const urls: string[] = [];
  
      let urlMatch;
      while ((urlMatch = urlRegex.exec(body)) !== null) {
        urls.push(urlMatch[1]);
      }
  
      // Elimina las URLs del contenido limpio
      const cleanedContent = body.replace(urlRegex, '').replace(/\*\*URL:\*\*/g, '').trim();
  
      blocks.push({
        title,
        content: cleanedContent,
        urls
      });
    }
  
    return blocks;
  }

}
