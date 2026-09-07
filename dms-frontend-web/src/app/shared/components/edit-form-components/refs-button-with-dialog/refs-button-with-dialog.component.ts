import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { map, tap } from 'rxjs';
import { Option } from '@app/shared/commonTypes';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';
import { Direction } from '@app/shared/api/nuxeo-api.types';

export interface ArendeRefOption {
  caseRef?: string | null;
  type?: string | null;
  comment?: string | null;
  displayType?: string;
  displayCase?: string;
}
export interface Ref {
  id: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-refs-button-with-dialog',
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './refs-button-with-dialog.component.html',
})
export class RefsButtonWithDialogComponent implements OnInit {
  isContactDialogOpen = signal(false);
  addContact = output<Partial<ArendeRefOption>>();
  heading = input<string>();
  refType = input.required<'Handling' | 'Arende'>();
  parentRef = input.required<string>();
  typeOptions = signal<Direction[]>([]);
  caseOptions = signal<Option[]>([]);
  apiService = inject(NuxeoApiService);

  form = new FormGroup({
    caseRef: new FormControl<Ref[] | null>(null),
    type: new FormControl<Ref[] | null>(null),
    comment: new FormControl(''),
  });

  ngOnInit(): void {
    this.getReferenstypSuggestions();
    this.getSuggestions();
  }

  getReferenstypSuggestions() {
    this.apiService
      .getDirectorySuggestions('Referenstyp')
      .pipe(
        tap(options => {
          this.typeOptions.set(options);
        })
      )
      .subscribe();
  }

  updateRefs(event: DigiFormSelectFilterCustomEvent<string>) {
    this.getSuggestions(event.detail);
  }

  setContact() {
    this.addContact.emit({
      ...this.form.value,
      type: this.form.get('type')?.value?.[0]?.id,
      caseRef: this.form.get('caseRef')?.value?.[0]?.id,
    });
  }

  getSuggestions(searchTerm?: string) {
    this.apiService
      .DMSDocumentSuggestion(this.parentRef(), this.refType(), 'Handling', searchTerm)
      .pipe(
        map(result => result.entries.map(el => ({ label: el.title, id: el.uid, path: el.path }))),
        tap(options => {
          this.caseOptions.set(options);
        })
      )
      .subscribe();
  }
}
