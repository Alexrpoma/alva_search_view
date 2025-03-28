import { Component, OnInit} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AlvaSearchService } from '../../services/alva_search.service';
import { Message } from '../../models/alva_search.model';

@Component({
  selector: 'app-search',
  imports: [ReactiveFormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {
  query = new FormControl('');
  messages: Message[] = [];

  constructor(private alvaSearchService: AlvaSearchService) { }

  ngOnInit() {
    this.alvaSearchService.getQueryResults().subscribe((response: string) => {
      if (this.messages.length > 0 && this.messages[this.messages.length - 1].sender === 'ai bot') {
        this.messages[this.messages.length - 1].content += response;
      } else {
        this.messages.push({
          sender: 'ai bot',
          content: response,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  sendQuery() {
    const message = this.query.value;
    if (message?.trim()) {
      this.messages.push({ sender: 'user', content: message, timestamp: new Date().toISOString() });
      this.alvaSearchService.sendQuery(message);
      this.query.reset();
    }
  }
}
