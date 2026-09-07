import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { UserService, UserSuggestion } from 'app/core/services/users.service';
import { OrganizationSuggestion } from '@app/shared/api/nuxeo-api.types';
import { DropdownField } from '@app/shared/models/dropdown';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { DropdownFieldComponent } from '../dropdown-field/dropdown-field.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import { ImageButtonComponent } from '../image-button/image-button.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import {
  ASSIGN_USER_ERROR_MESSAGE,
  ASSIGN_USER_LOAD_ERROR_MESSAGE,
  ASSIGN_USER_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

export interface Option {
  id: string;
  label: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-assign-user-modal',
  standalone: true,
  imports: [
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    DropdownFieldComponent,
    ImageButtonComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './assign-user-modal.component.html',
})
export class AssignUserModalComponent implements OnInit {
  userService = inject(UserService);
  item = input<string>();
  apiService = inject(NuxeoApiService);
  hideButtons = input(false);
  caseId: string | undefined;
  handlaggarePresent = signal(false);
  titleSig = signal('');
  blueButtonTextSig = signal('');
  closeDialog = output();
  private store = inject(GeneralStore);
  private destroyRef = inject(DestroyRef);
  showConfirmation = signal<boolean>(false);

  organizationOptions: Option[] = [];
  coworkerOptions: Option[] = [];
  medhandlaggareOptions: Option[] = [];

  medhandlaggareArray = new FormArray<FormControl<string | null>>([]);
  private organizationCoworkersById = new Map<string, Option[]>();
  private organizationsLoaded = false;
  private selectedOrganizationId: string | null = null;

  assignCaseFormGroup = new FormGroup<{
    organization: FormControl<string | null>;
    coworker: FormControl<string | null>;
    medhandlaggare: FormArray<FormControl<string | null>>;
  }>({
    organization: new FormControl<string | null>('', Validators.required),
    coworker: new FormControl<string | null>(''),
    medhandlaggare: this.medhandlaggareArray,
  });

  controllers = signal<DropdownField[]>([]);
  coworkerControllers = signal<DropdownField[]>([]);

  constructor() {
    this.registerOrganizationChangeHandler();
    effect(() => {
      const nextCaseId = this.item();
      if (!nextCaseId) {
        this.resetAssignmentState();
        return;
      }
      if (this.caseId === nextCaseId) {
        return;
      }
      this.caseId = nextCaseId;
      this.startLoadForCase();
    });
  }

  ngOnInit() {
    this.updateLabels();
  }

  private startLoadForCase() {
    if (!this.caseId) return;

    this.resetAssignmentState(true);
    forkJoin({
      orgs: this.userService.getOrganizations(this.caseId).pipe(catchError(() => of([]))),
      coworkers: this.userService.getcoworkers().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ orgs, coworkers }) => {
        this.handleOrganizationsLoaded(orgs, coworkers);
      });

    this.loadCurrentAssignment();
    this.updateLabels();
  }

  private resetAssignmentState(keepCaseId = false) {
    if (!keepCaseId) {
      this.caseId = undefined;
    }
    this.handlaggarePresent.set(false);
    this.organizationsLoaded = false;
    this.selectedOrganizationId = null;
    this.organizationOptions = [];
    this.coworkerOptions = [];
    this.medhandlaggareOptions = [];
    this.organizationCoworkersById = new Map();
    this.controllers.set([]);
    this.coworkerControllers.set([]);
    this.assignCaseFormGroup.patchValue({ organization: '', coworker: '' }, { emitEvent: false });
    this.medhandlaggareArray.clear();
    this.updateLabels();
  }

  updateDropdownOptions() {
    const orgCtrl = this.assignCaseFormGroup.controls.organization;
    const coworkerCtrl = this.assignCaseFormGroup.controls.coworker;

    if (!orgCtrl || !coworkerCtrl) return;

    this.controllers.set([
      {
        title: 'Ansvarig organisatorisk enhet',
        controller: orgCtrl,
        options: this.organizationOptions.map(organizationOption => ({
          value: organizationOption.id,
          label: organizationOption.label,
        })),
        isRequired: true,
        placeholder: 'Välj organisation',
      },
      {
        title: 'Ansvarig Handläggare',
        controller: coworkerCtrl,
        options: this.coworkerOptions.map(coworkerOption => ({
          value: coworkerOption.id,
          label: coworkerOption.label,
        })),
        isRequired: false,
        placeholder: 'Välj handläggare',
      },
    ]);
  }

  private updateLabels() {
    this.titleSig.set(this.handlaggarePresent() ? 'Hantera handläggare' : 'Tilldela ansvarig handläggare');
    this.blueButtonTextSig.set(this.handlaggarePresent() ? 'Spara' : 'Tilldela');
  }

  private loadCurrentAssignment(): void {
    if (!this.caseId) return;

    this.apiService.getDocumentById(String(this.caseId)).subscribe({
      next: doc => {
        this.updateHandlaggareFlag(doc);
        this.prefillForm(doc);
        this.updateLabels();
      },
      error: () => {
        this.store.notification.set({ show: true, variation: 'danger', text: ASSIGN_USER_LOAD_ERROR_MESSAGE });
      },
    });
  }

  private updateHandlaggareFlag(doc: NuxeoDocument) {
    const handlaggareValue = doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
    const handlaggareId = handlaggareValue === null || handlaggareValue === undefined ? '' : String(handlaggareValue);
    this.handlaggarePresent.set(handlaggareId !== '' && handlaggareId !== 'skna');
  }

  private prefillForm(doc: NuxeoDocument) {
    const organizationCtrl = this.assignCaseFormGroup.controls.organization;
    const organizationRef = doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet];
    const orgId = organizationRef === null || organizationRef === undefined ? null : String(organizationRef);
    if (orgId) {
      organizationCtrl.setValue(orgId, { emitEvent: false });
      organizationCtrl.removeValidators(Validators.required);
    } else {
      organizationCtrl.addValidators(Validators.required);
    }
    organizationCtrl.updateValueAndValidity({ emitEvent: false });
    this.applyOrganizationFilter(orgId);

    const handlerRef = doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare];
    const handlerId = handlerRef === null || handlerRef === undefined ? null : String(handlerRef);
    if (handlerId) {
      this.assignCaseFormGroup.patchValue({ coworker: handlerId });
    }

    const medhandlaggareValues = doc.properties?.[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare] ?? [];
    const medhandlaggare = medhandlaggareValues.map(value => String(value));
    this.setMedhandlaggare(medhandlaggare);
  }

  private setMedhandlaggare(values: string[] | undefined) {
    this.medhandlaggareArray.clear();

    (values ?? []).forEach(value => {
      const control = new FormControl(value ?? '');
      this.medhandlaggareArray.push(control);
    });

    this.syncMedhandlaggareControllers();
  }

  private syncMedhandlaggareControllers() {
    const controllers = this.medhandlaggareArray.controls.map(control => ({
      title: 'Medhandläggare',
      controller: control,
      options: this.buildMedhandlaggareOptionsForControl(control).map(medhandlaggareOption => ({
        value: medhandlaggareOption.id,
        label: medhandlaggareOption.label,
      })),
      placeholder: '',
    }));

    this.coworkerControllers.set(controllers);
  }

  onAssignUser() {
    const organizationLabel = this.assignCaseFormGroup.get('organization')?.value;
    const coworkerLabel = this.assignCaseFormGroup.get('coworker')?.value;
    if (!organizationLabel) return;

    const medhandlaggare = this.medhandlaggareArray.controls
      .map(control => control.value)
      .filter((value): value is string => !!value);

    this.apiService
      .updateAssignees(String(this.caseId), organizationLabel, coworkerLabel || null, medhandlaggare)
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: ASSIGN_USER_SUCCESS_MESSAGE,
          });
          this.closeDialog.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ASSIGN_USER_ERROR_MESSAGE,
          });
        },
      });
  }

  onCancel() {
    this.closeDialog.emit();
  }

  addCoworkerColumn(initialValue: string | null = null) {
    const control = new FormControl(initialValue ?? '');
    this.medhandlaggareArray.push(control);
    this.syncMedhandlaggareControllers();
  }

  removeCoworkerColumn(index: number) {
    this.medhandlaggareArray.removeAt(index);
    this.syncMedhandlaggareControllers();
  }

  private registerOrganizationChangeHandler() {
    const orgCtrl = this.assignCaseFormGroup.controls.organization;
    const initialOrgValue = orgCtrl.value ?? '';
    this.selectedOrganizationId = initialOrgValue === '' ? null : initialOrgValue;

    orgCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.applyOrganizationFilter(value);
    });
  }

  private handleOrganizationsLoaded(orgs: OrganizationSuggestion[], coworkers: UserSuggestion[]) {
    this.organizationOptions = orgs.map(org => ({ id: org.id, label: org.label }));

    const coworkerLookup = this.buildCoworkerLookup(coworkers);
    this.medhandlaggareOptions = Array.from(coworkerLookup.values());

    this.organizationCoworkersById = new Map(
      orgs.map(org => [org.id, this.resolveOrganizationParticipants(org.participants, coworkerLookup)])
    );

    this.coworkerOptions = [...this.medhandlaggareOptions];

    this.organizationsLoaded = true;
    this.updateDropdownOptions();
    this.syncMedhandlaggareControllers();

    const orgControl = this.assignCaseFormGroup.controls.organization;
    const rawOrgValue = orgControl.value ?? '';
    const fallbackOrgId = this.selectedOrganizationId ?? (rawOrgValue === '' ? null : rawOrgValue);

    this.applyOrganizationFilter(fallbackOrgId);
  }

  private applyOrganizationFilter(value: string | null | undefined) {
    const orgId = value === '' || value === null || value === undefined ? null : value;
    this.selectedOrganizationId = orgId;

    if (!this.organizationsLoaded) {
      return;
    }

    const nextOptions = orgId
      ? [...(this.organizationCoworkersById.get(orgId) ?? [])]
      : [...this.medhandlaggareOptions];
    this.coworkerOptions = nextOptions;

    this.resetInvalidSelections(nextOptions);
    this.updateDropdownOptions();
  }

  private resetInvalidSelections(options: Option[]) {
    const coworkerCtrl = this.assignCaseFormGroup.controls.coworker;
    const coworkerValue = coworkerCtrl.value === '' || coworkerCtrl.value === null ? null : coworkerCtrl.value;

    if (coworkerValue && !options.some(option => option.id === coworkerValue)) {
      coworkerCtrl.setValue('', { emitEvent: false });
    }
  }

  private buildCoworkerLookup(coworkers: UserSuggestion[]): Map<string, Option> {
    const map = new Map<string, Option>();
    coworkers.forEach(user => {
      const id = user.username ?? user.id;
      if (!id) return;
      const label = user.displayLabel ?? user.username ?? user.id;
      map.set(id, { id, label });
    });
    return map;
  }

  private resolveOrganizationParticipants(
    participants: OrganizationSuggestion['participants'],
    coworkerLookup: Map<string, Option>
  ): Option[] {
    return participants.map(participant => {
      const option = coworkerLookup.get(participant.id);
      if (option) return option;
      return { id: participant.id, label: participant.label };
    });
  }
  private buildMedhandlaggareOptionsForControl(control: FormControl<string | null>): Option[] {
    const selectedIds = this.getSelectedMedhandlaggareIds(control);

    return this.medhandlaggareOptions.filter(option => {
      if (option.id === control.value) {
        return true;
      }
      return !selectedIds.includes(option.id);
    });
  }

  private getSelectedMedhandlaggareIds(excludeControl?: FormControl<string | null>): string[] {
    return this.medhandlaggareArray.controls
      .filter(control => control !== excludeControl)
      .map(control => control.value)
      .filter((value): value is string => !!value);
  }
}
