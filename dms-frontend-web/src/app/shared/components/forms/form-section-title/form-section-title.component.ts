import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-form-section-title',
  standalone: true,
  template: `<h3 class="mb-2 text-lg font-semibold">{{ title() }}</h3>`,
})
export class FormSectionTitleComponent {
  title = input<string>('');
}
