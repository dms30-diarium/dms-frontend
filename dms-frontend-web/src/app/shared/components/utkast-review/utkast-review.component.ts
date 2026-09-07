import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GeneralStore } from '@app/core/services/general-store.service';
import { UserService } from '@app/core/services/users.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { catchError, EMPTY, tap } from 'rxjs';
import {
  UTKAST_REVIEW_ERROR_MESSAGE,
  UTKAST_REVIEW_SENT_FOR_APPROVAL_MESSAGE,
  UTKAST_REVIEW_SENT_FOR_REVIEW_MESSAGE,
} from '@app/shared/constants/notification-messages';

export interface Option {
  id: string;
  label: string;
}

@Component({
  selector: 'nuxeo-utkast-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DigiArbetsformedlingenAngularModule, ReactiveFormsModule],
  templateUrl: './utkast-review.component.html',
})
export class UtkastReviewComponent implements OnInit {
  workflowModelName = input<string>();
  closeDialog = output();
  reloadDoc = output();
  docId = input.required<string>();
  readonly userService = inject(UserService);
  readonly apiService = inject(NuxeoApiService);
  anvandareSuggestions = signal<Option[] | null>(null);
  private readonly store = inject(GeneralStore);

  ngOnInit(): void {
    this.userService.getcoworkers().subscribe(data => {
      this.anvandareSuggestions.set(data.map(el => ({ id: el.id, label: el.displayLabel })));
    });
  }

  form = new FormGroup({
    anvandare: new FormControl<Option[]>([]),
    beskrivning: new FormControl(''),
    multipel: new FormControl(false),
  });

  onSave() {
    const users = this.form.get('anvandare')?.value?.map(el => el.id);
    const payload = {
      'entity-type': 'workflow',
      workflowModelName: this.workflowModelName(),
      variables: {
        anvandare: users,
        beskrivning: this.form.get('beskrivning')?.value,
        multipel: this.form.get('multipel')?.value,
      },
    };
    this.apiService
      .createWorkflow(this.docId(), payload)
      .pipe(
        tap(() => {
          this.reloadDoc.emit();
          this.closeDialog.emit();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text:
              this.workflowModelName() === 'StickaForGodkannande'
                ? UTKAST_REVIEW_SENT_FOR_REVIEW_MESSAGE
                : UTKAST_REVIEW_SENT_FOR_APPROVAL_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: UTKAST_REVIEW_ERROR_MESSAGE,
          });
          return EMPTY;
        })
      )
      .subscribe();
  }
}
