import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { SvgCacheService } from './svg-cache-service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-svg-icon',
  standalone: true,
  template: `<div [innerHTML]="svgContent()"></div>`,
})
export class SvgIconComponent {
  private svgCache = inject(SvgCacheService);
  private sanitizer = inject(DomSanitizer);

  src = input('');
  size = input('1em');
  svgContent = signal<SafeHtml>('');

  private requestId = 0;

  constructor() {
    effect(onCleanup => {
      const src = this.src();
      const size = this.size();
      const currentRequestId = ++this.requestId;

      this.svgContent.set('');

      if (!src) {
        return;
      }

      const subscription = this.svgCache.getSvg(src).subscribe({
        next: svg => {
          if (currentRequestId !== this.requestId) {
            // Another request was made -- ignore result since it's outdated
            return;
          }

          this.svgContent.set(this.processSvg(svg, size));
        },
        error: () => {
          if (currentRequestId !== this.requestId) {
            // Another request was made -- ignore result since it's outdated
            return;
          }

          this.svgContent.set('');
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  processSvg(svg: string, size: string): SafeHtml {
    const processed = svg.replace(/<svg([^>]*)>/, (_, attrs) => {
      const cleanedAttrs = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');

      return `<svg${cleanedAttrs} width="${size}" height="${size}">`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(processed);
  }
}
