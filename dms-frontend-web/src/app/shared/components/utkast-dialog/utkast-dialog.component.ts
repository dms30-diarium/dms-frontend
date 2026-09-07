import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { catchError, EMPTY, map, tap } from 'rxjs';

import { UserService } from 'app/core/services/users.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiArbetsformedlingenAngularModule, DigiButton } from '@designsystem-se/af-angular';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';

interface Option {
  id: string;
  label: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-utkast-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DigiButton, DigiArbetsformedlingenAngularModule],
  templateUrl: './utkast-dialog.component.html',
})
export class UtkastDialogComponent implements OnInit {
  userService = inject(UserService);
  options = signal<Option[]>([]);
  readonly nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);
  private auth = inject(AuthService);
  organizationOptions: Option[] = [];
  coworkerOptions = signal<Option[]>([]);
  confirmStep = signal(false);
  docId = input.required<string>();
  currentAssignee = input<string | null>(null);
  mode = input<'approval' | 'reassign' | 'changeRequester'>('approval');
  confirmMessage = input<string>('');
  closeDialog = output();
  assignUser = output();

  icon = 'X';

  form = new FormGroup({
    coworker: new FormControl<{ id: string }[]>([], Validators.required),
  });

  ngOnInit() {
    this.userService
      .getcoworkers()
      .pipe(
        map(result => result.map(coworker => ({ label: coworker.displayLabel, id: coworker.id }))),
        tap(options => {
          this.coworkerOptions.set(options);
        })
      )
      .subscribe();
  }

  onAssignUser() {
    const username = this.form.get('coworker')?.value?.[0]?.id;

    if (!username) return;

    if (this.mode() !== 'approval' && !this.confirmStep()) {
      this.confirmStep.set(true);
      return;
    }

    const previousAssignee =
      this.mode() === 'approval' ? (this.currentAssignee() ?? this.auth.username() ?? null) : this.currentAssignee();

    const request$ =
      this.mode() === 'reassign'
        ? this.nuxeoApi.updateResponsibleManager(this.docId(), username)
        : this.mode() === 'changeRequester'
          ? this.nuxeoApi.updateRequester(this.docId(), username)
          : this.nuxeoApi.setResponsibleManager(this.docId(), username, previousAssignee);

    request$
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text:
              this.mode() === 'reassign'
                ? 'Ansvarig handläggare är uppdaterad.'
                : this.mode() === 'changeRequester'
                  ? 'Ansvarig beställare är uppdaterad.'
                  : 'Utkastet är skickat för godkännande.',
          });
          this.assignUser.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text:
              this.mode() === 'reassign'
                ? 'Fel vid uppdatering av ansvarig handläggare.'
                : this.mode() === 'changeRequester'
                  ? 'Fel vid uppdatering av ansvarig beställare.'
                  : 'Fel vid tilldelning av Utkast.',
          });
          return EMPTY;
        })
      )
      .subscribe();
  }

  onCancel() {
    this.confirmStep.set(false);
    this.closeDialog.emit();
  }
}
