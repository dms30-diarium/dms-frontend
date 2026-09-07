import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';
import { DigiButton, DigiDialog } from '@designsystem-se/af-angular';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { GeneralStore } from '@app/core/services/general-store.service';
import {
  buildOrganizationUpdatedMessage,
  buildOrganizationUpdateErrorMessage,
  ORGANIZATION_CREATE_ERROR_MESSAGE,
  ORGANIZATION_CREATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { SearchService } from '@app/core/services/search.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, OrganisationsdelProperties, UserSuggestion } from '@app/shared/api/nuxeo-api.types';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { AddButtonComponent } from '@app/shared/components/add-button/add-button.component';
import { SelectCaseComponent } from '@app/shared/components/select-case-popup/select-case-popup.component';
import { EntityOverviewComponent } from '@app/shared/components/entity-overview/entity-overview.component';
import { SortOrder } from '@app/core/services/table-sort.service';

@Component({
  selector: 'nuxeo-organization-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CaseListTableComponent,
    NavigationBreadComponent,
    GeneralFormComponent,
    DigiButton,
    DigiDialog,
    AddButtonComponent,
    SelectCaseComponent,
    EntityOverviewComponent,
  ],
  templateUrl: './organization-page.component.html',
})
export class OrganizationPageComponent {
  @ViewChild('editForm') editForm!: GeneralFormComponent;
  @ViewChild('createForm') createForm!: GeneralFormComponent;

  private readonly store = inject(GeneralStore);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);

  document = input.required<NuxeoDocument<OrganisationsdelProperties>>();
  tableData = input<TableItem[]>([]);
  total = input<number>(0);
  tableConfig = input.required<TableColumn[]>();
  defaultColumnOptions = input.required<TableColOption[]>();
  sortBy = input<string>('');
  sortOrder = input<SortOrder>('desc');
  documentUpdated = output<NuxeoDocument>();
  organizationCreated = output<void>();
  sortChange = output<{ sortBy: string; sortOrder: SortOrder }>();

  props = computed(() => this.document().properties);
  canEdit = computed(() => this.store.navigationPanelContext() !== 'browse');
  isSubOrganization = computed(() => this.document().type === 'Organisationsdel');
  editHeading = computed(() => (this.isSubOrganization() ? 'Redigera Organisationsdel' : 'Redigera Organisation'));
  isEditOpen = signal(false);
  isSaving = signal(false);
  isDialogOpened = signal(false);
  isCreateDialogOpen = signal(false);
  userOptions = signal<Option[]>([]);
  createFormConfig = computed((): FieldConfig[] => [
    {
      type: 'textarea',
      name: 'description',
      label: this.store.getValue('label.description') ?? 'Beskrivning',
    },
    {
      type: 'input',
      name: 'code',
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'shortName',
      label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'name',
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      validators: [Validators.required],
    },
    {
      type: 'dropdown-search',
      name: 'ansvarig',
      label: 'Ansvarig',
      props: { optionsSignal: this.userOptions },
    },
    {
      type: 'dropdown-search',
      name: 'anvandare',
      label: 'Användare',
      multiple: true,
      props: { optionsSignal: this.userOptions },
    },
  ]);
  editConfig = computed((): FieldConfig[] => {
    const document = this.document();
    const organizationProperties = this.props();
    if (!this.isSubOrganization()) {
      return [
        {
          type: 'input',
          name: 'title',
          label: this.store.getValue('label.dublincore.title') ?? 'Titel',
          defaultValue: document.title,
          validators: [Validators.required],
        },
        {
          type: 'textarea',
          name: 'description',
          label: this.store.getValue('label.description') ?? 'Beskrivning',
          defaultValue: organizationProperties[NUXEO_SCHEMA_FIELDS.dc.description],
        },
      ];
    }

    const ansvarig = organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig];
    const anvandare = organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare] ?? [];
    return [
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: organizationProperties[NUXEO_SCHEMA_FIELDS.dc.description],
      },
      {
        type: 'input',
        name: 'code',
        label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
        defaultValue: organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.kod],
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'shortName',
        label: this.store.getValue('label.ui.schema.cv.kortnamn') ?? 'Kortnamn',
        defaultValue: organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn],
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'name',
        label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
        defaultValue: organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.namn],
        validators: [Validators.required],
      },
      {
        type: 'dropdown-search',
        name: 'ansvarig',
        label: 'Ansvarig',
        defaultValue: ansvarig ? [{ id: ansvarig, label: ansvarig }] : [],
        props: { optionsSignal: this.userOptions },
      },
      {
        type: 'dropdown-search',
        name: 'anvandare',
        label: 'Användare',
        multiple: true,
        defaultValue: anvandare.map(username => ({ id: username, label: username })),
        props: { optionsSignal: this.userOptions },
      },
    ];
  });

  openCreate(): void {
    this.userOptions.set([]);
    this.loadUserSuggestions('');
    this.isCreateDialogOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateDialogOpen.set(false);
  }

  openEdit(): void {
    if (this.isSubOrganization()) {
      this.userOptions.set(this.getSelectedUserOptionsFromDocument(this.document()));
      this.loadUserSuggestions('');
    }
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
  }

  submitCreate(): void {
    this.createForm?.submit();
  }

  submitEdit(): void {
    this.editForm?.submit();
  }

  updateDropdownValues(event: { fieldName: string; value: unknown }): void {
    if (!['ansvarig', 'anvandare'].includes(event.fieldName)) {
      return;
    }
    this.loadUserSuggestions(this.searchService.extractTerm(event.value));
  }

  saveCreate(): void {
    const parentDoc = this.document();
    const formValue = this.createForm.form.getRawValue();

    this.isSaving.set(true);
    const documentName = `${formValue['code']} ${formValue['name']}`;
    const payload = {
      'entity-type': 'document' as const,
      type: 'Organisationsdel',
      name: documentName,
      properties: {
        [NUXEO_SCHEMA_FIELDS.dc.description]: formValue['description'],
        [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: formValue['code'],
        [NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn]: formValue['shortName'],
        [NUXEO_SCHEMA_FIELDS.organisationsdel.namn]: formValue['name'],
        [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: formValue['ansvarig']?.[0]?.id,
        [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: formValue['anvandare']?.map((o: Option) => o.id) ?? [],
      },
    };

    this.nuxeoApi
      .createDocument(payload, parentDoc.path)
      .pipe(
        tap(() => {
          this.isSaving.set(false);
          this.isDialogOpened.set(false);
          this.isCreateDialogOpen.set(false);
          this.organizationCreated.emit();
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: ORGANIZATION_CREATE_SUCCESS_MESSAGE,
          });
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: ORGANIZATION_CREATE_ERROR_MESSAGE,
          });
          this.isSaving.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  saveEdits(): void {
    const document = this.document();
    const formValue = this.editForm.form.getRawValue();
    const payload = this.isSubOrganization()
      ? {
          [NUXEO_SCHEMA_FIELDS.dc.description]: formValue['description'],
          [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: formValue['code'],
          [NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn]: formValue['shortName'],
          [NUXEO_SCHEMA_FIELDS.organisationsdel.namn]: formValue['name'],
          [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: formValue['ansvarig'][0]?.id,
          [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: formValue['anvandare'].map((o: Option) => o.id),
        }
      : {
          [NUXEO_SCHEMA_FIELDS.dc.title]: formValue['title'],
          [NUXEO_SCHEMA_FIELDS.dc.description]: formValue['description'],
        };

    this.isSaving.set(true);
    this.nuxeoApi
      .editDocument(document.uid, payload)
      .pipe(
        switchMap(() => this.nuxeoApi.getDocumentById(document.uid)),
        tap(updated => {
          this.isSaving.set(false);
          this.isEditOpen.set(false);
          this.documentUpdated.emit(updated);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: buildOrganizationUpdatedMessage(updated.title),
          });
          if (this.isSubOrganization()) {
            this.userOptions.set(this.getSelectedUserOptionsFromDocument(updated));
          }
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildOrganizationUpdateErrorMessage(document.title),
          });
          this.isSaving.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  private getSelectedUserOptionsFromDocument(document: NuxeoDocument<OrganisationsdelProperties>): Option[] {
    const organizationProperties = document.properties;
    const selectedUserOptions = (organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare] ?? []).map(
      username => ({
        id: username,
        label: username,
      })
    );
    const ansvarig = organizationProperties[NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig];
    if (ansvarig) {
      selectedUserOptions.unshift({ id: ansvarig, label: ansvarig });
    }
    return [...new Map(selectedUserOptions.map(selectedOption => [selectedOption.id, selectedOption])).values()];
  }

  private loadUserSuggestions(searchTerm: string): void {
    this.nuxeoApi
      .getUserSuggestions(searchTerm)
      .pipe(
        tap(suggestions => {
          const suggestedUserOptions: Option[] = suggestions.map((suggestion: UserSuggestion) => ({
            id: suggestion.id,
            label: suggestion.displayLabel,
            value: suggestion.id,
          }));
          const mergedUserOptions = [
            ...new Map(
              [...this.getSelectedUserOptionsFromDocument(this.document()), ...suggestedUserOptions].map(option => [
                option.id,
                option,
              ])
            ).values(),
          ];
          this.userOptions.set(mergedUserOptions);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
