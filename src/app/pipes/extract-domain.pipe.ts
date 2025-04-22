import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'extractDomain'
})
export class ExtractDomainPipe implements PipeTransform {

  transform(value: string): string {
    try {
      const hostname = new URL(value).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

}
