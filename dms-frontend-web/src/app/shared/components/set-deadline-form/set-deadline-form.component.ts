import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import { GeneralFormComponent } from '../general-form/general-form.component';
import { FieldConfig } from '../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';

interface CreateDeadlineFormType {
  user?: { id: string }[];
  deadline?: Date[];
  reminder?: Date[];
  description?: string;
}
@Component({
  selector: 'nuxeo-set-deadline-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './set-deadline-form.component.html',
})
export class SetDeadlineComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  dialogClosed = output<NuxeoDocument | null>();
  docId = input.required<string>();
  private readonly store = inject(GeneralStore);

  formConfig = signal<FieldConfig[]>([
    { type: 'dropdown-search', name: 'user', label: 'Användare', validators: [Validators.required] },
    { type: 'input', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    { type: 'datepicker', name: 'deadline', label: 'Deadline', validators: [Validators.required] },
    { type: 'datepicker', name: 'reminder', label: 'Paminnelse' },
  ]);

  ngOnInit(): void {
    this.getUserSuggestion();
  }

  createDeadline(rawEvent: CreateDeadlineFormType) {
    if (!rawEvent?.deadline?.[0] || !rawEvent?.user?.[0]?.id) return;

    this.nuxeoApi
      .setDeadline(
        this.docId(),
        rawEvent?.user?.[0]?.id,
        toISODateOnlyString(rawEvent?.deadline?.[0]),
        rawEvent?.reminder?.[0] ? toISODateOnlyString(rawEvent.reminder[0]) : undefined,
        rawEvent?.description
      )
      .subscribe(() => this.dialogClosed.emit(null));
  }

  getUserSuggestion() {
    this.nuxeoApi
      .getUserSuggestions()
      .subscribe(data =>
        this.formConfig.set(
          this.formConfig().map(el =>
            el.name === 'user' ? { ...el, options: data.map(sugg => ({ id: sugg.id, label: sugg.displayLabel })) } : el
          )
        )
      );
  }
}
