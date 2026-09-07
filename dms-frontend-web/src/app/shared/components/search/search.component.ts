import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { LucideAngularModule, X, Search } from 'lucide-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-search',
  imports: [LucideAngularModule],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  placeholderText = input<string>('Snabbsök…');
  buttonText = input<string>('Sök');

  searchOutput = output<string>();

  iconSearch = Search;
  iconClear = X;
  emit(value: string) {
    this.searchOutput.emit((value ?? '').trim());
  }
}
