import { Component } from '@angular/core';
import { SearchComponent } from './shared/components/search/search.component';

@Component({
  selector: 'app-root',
  imports: [SearchComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'alva_search_view';
}
