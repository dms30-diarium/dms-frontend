import { Component, effect, input, output, signal, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Accordion } from '@models/accordion';
import { DigiExpandableFaq, DigiExpandableFaqItem } from '@designsystem-se/af-angular';

@Component({
  selector: 'nuxeo-accordion',
  imports: [RouterModule, DigiExpandableFaq, DigiExpandableFaqItem],
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AccordionComponent {
  items = input<Accordion[]>([]);
  accordionTitle = input<string>('');
  isExpanded = input<boolean>(false);
  toggled = output<boolean>();

  protected currentExpanded = signal(false);

  constructor() {
    effect(() => {
      this.currentExpanded.set(this.isExpanded());
    });
  }

  handleClick(event: Event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const next = !this.currentExpanded();
    this.currentExpanded.set(next);
    this.toggled.emit(next);
  }
}
