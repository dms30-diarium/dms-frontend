import { ChangeDetectionStrategy, Component, effect, inject, input, signal, WritableSignal } from '@angular/core';
import { ArendeTypOption } from '@app/pages/case-page/case-types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';
import { map, tap } from 'rxjs';

@Component({
  selector: 'nuxeo-arendetyp-autocomplete',
  imports: [DigiArbetsformedlingenAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arendetyp-autocomplete.component.html',
})
export class ArendetypAutocompleteComponent {
  private readonly api = inject(NuxeoApiService);
  docType = input.required<'Arende' | 'Handling'>();
  parentRef = input.required<string>();
  fieldName = input<string>();
  required = input<boolean>(false);
  isSubmited = input<boolean>(false);
  tableFields = input.required<WritableSignal<ArendeTypOption[]>>();
  value = this.tableFields;
  options = signal<ArendeTypOption[] | null>(null);

  constructor() {
    effect(() => {
      const parentRef = this.parentRef();
      if (!parentRef) {
        this.options.set([]);
        return;
      }
      this.getNewOptions('');
    });
  }

  onDropdownInputChange(event: DigiFormSelectFilterCustomEvent<string>) {
    if (!this.parentRef()) {
      this.options.set([]);
      return;
    }
    this.getNewOptions(event.detail);
  }

  getNewOptions(searchTerm: string) {
    if (!this.parentRef()) {
      this.options.set([]);
      return;
    }
    this.api
      .DMSDocumentSuggestion(this.parentRef(), 'Klass', this.docType(), searchTerm)
      .pipe(
        map(result => result.entries.map(el => ({ label: el.title, id: el.uid, path: el.path, value: el.uid }))),
        tap(options => this.options.set(options))
      )
      .subscribe();
  }

  onSelect(event: DigiFormSelectFilterCustomEvent<ArendeTypOption[]>) {
    this.value().set(event.detail);
  }
}
