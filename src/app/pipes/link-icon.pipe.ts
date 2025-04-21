import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'linkIcon'
})
export class LinkIconPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return value;

    // Regex para detectar URLs
    // const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s\]\)]+)/g;

    // Reemplazar cada URL por un ícono con link
    return value.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" class="btn btn-sm rounded-circle" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${url}" style="text-decoration:none;white-space: normal; background: #d3e3fd;">
                <i class="bi bi-link-45deg"></i>
              </a>`;
    });
  }
}
