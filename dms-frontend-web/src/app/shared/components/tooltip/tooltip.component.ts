import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'nuxeo-tooltip',
  template: `
    <div
      [ngClass]="class"
      class="bg-primary pointer-events-none z-20 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-white opacity-0 shadow-md transition-all duration-400 ease-out">
      {{ text }}
    </div>
  `,
  imports: [CommonModule],
})
export class TooltipComponent {
  @Input() text = '';
  @Input() class = 'opacity-0';
}
