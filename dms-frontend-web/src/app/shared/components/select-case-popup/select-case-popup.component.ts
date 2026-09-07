import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { Tab, TabsComponent } from '../tabs/tabs.component';
import { FileUploadComponent, UploadedFile } from '../file-upload/file-upload.component';
import { tap, switchMap, map, forkJoin } from 'rxjs';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { SearchResult, Subtype } from '@app/shared/api/nuxeo-api.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { CreateReducedCaseFormComponent } from '../forms/reduced-create-case-form/reduced-create-case-form.component';
import { CreateCaseFolderComponent } from '../forms/create-folder-form/create-folder-form.component';
import { CreatePersonalFolderFormComponent } from '../forms/create-personal-folder-form/create-personal-folder-form.component';
import { CreateWorkspaceFormComponent } from '../forms/create-workspace-form/create-workspace-form.component';
import { CreateBeslutComponent } from '../forms/create-beslut/create-beslut.component';
import { CreateKlassificComponent } from '../forms/create-klassific/create-klassific.component';
import { Router } from '@angular/router';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { CreateHandlingFormComponent } from '../forms/create-handling-form/create-handling-form.component';
import { CreateHandlingComponent } from '../forms/create-handlingtype/create-handlingtype-form.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { GeneralStore } from '@app/core/services/general-store.service';
import { CreateMailFolderComponent } from '../forms/create-mailFolder-form/create-mailFolder-form.component';
import { CreateChecklistComponent } from '../forms/create-checklist/create-checklist.component';
import { CreateNoteFormComponent } from '../forms/create-note-form/create-note-form.component';
import { CreateFileFormComponent } from '../forms/create-file-form/create-file-form.component';
import { CreatePictureFormComponent } from '../forms/create-picture-form/create-picture-form.component';
import { CreateAudioFormComponent } from '../forms/create-audio-form/create-audio-form.component';
import { CreateVideoFormComponent } from '../forms/create-video-form/create-video-form.component';
import { CreateCollectionFormComponent } from '../forms/create-collection-form/create-collection-form.component';
import { CreateCvDocumentFormComponent } from '../forms/create-cv-document-form/create-cv-document-form.component';
import { CreateSimpleDocumentFormComponent } from '../forms/create-simple-document-form/create-simple-document-form.component';
import { CreateKlassificeringsstrukturComponent } from '../forms/create-klassificeringsstruktur/create-klassificeringsstruktur.component';
import { CreateArkivArMappFormComponent } from '../forms/create-arkiv-ar-mapp-form/create-arkiv-ar-mapp-form.component';
import { CreateArkivFormComponent } from '../forms/create-arkiv-form/create-arkiv-form.component';
import { CreateExportFormComponent } from '../forms/create-export-form/create-export-form.component';
import { getPathByDocType } from '@app/shared/utils';
import {
  ArendeRefOption,
  CaseReferenceComponent,
} from '../edit-form-components/case-reference.component/case-reference.component';
import {
  ExternalRefOption,
  ExternReferensComponent,
} from '../edit-form-components/extern-referens/extern-referens.component';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { GeneralFormComponent } from '../general-form/general-form.component';
import { Validators } from '@angular/forms';
import { FieldConfig } from '../general-form/general-form.types';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { Option } from '@app/shared/commonTypes';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import {
  buildSelectCaseCreateErrorMessage,
  buildSelectCaseCreateSuccessMessage,
} from '@app/shared/constants/notification-messages';
import {
  SELECT_CASE_MYNDIGHET_CREATE_ERROR_MESSAGE,
  SELECT_CASE_MYNDIGHET_CREATE_SUCCESS_MESSAGE,
  SELECT_CASE_UPLOAD_ERROR_MESSAGE,
  SELECT_CASE_UPLOAD_NONE_SELECTED_MESSAGE,
  SELECT_CASE_UPLOAD_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

interface DomainFormResult extends Record<string, string | Date[] | Option[] | undefined> {
  title?: string;
  description?: string;
  nature?: string;
  subjects?: Option[];
  coverage?: string;
  expires?: Date[];
}

@Component({
  selector: 'nuxeo-select-case-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    TabsComponent,
    FileUploadComponent,
    AutocompleteComponent,
    DigiArbetsformedlingenAngularModule,
    CreateHandlingFormComponent,
    CreateReducedCaseFormComponent,
    CreateCaseFolderComponent,
    CreatePersonalFolderFormComponent,
    CreateWorkspaceFormComponent,
    CreateBeslutComponent,
    CreateKlassificComponent,
    CreateHandlingComponent,
    CreateMailFolderComponent,
    CreateChecklistComponent,
    CreateNoteFormComponent,
    CreateFileFormComponent,
    CreatePictureFormComponent,
    CreateAudioFormComponent,
    CreateVideoFormComponent,
    CreateCollectionFormComponent,
    CreateCvDocumentFormComponent,
    CreateSimpleDocumentFormComponent,
    CreateKlassificeringsstrukturComponent,
    CreateArkivArMappFormComponent,
    CreateArkivFormComponent,
    CreateExportFormComponent,
    CaseReferenceComponent,
    ExternReferensComponent,
    SvgIconComponent,
    GeneralFormComponent,
  ],
  templateUrl: './select-case-popup.component.html',
})
export class SelectCaseComponent implements OnInit {
  private readonly hiddenTypes = new Set(['OrderedFolder', 'WebTemplateSource', 'TemplateSource', 'MailFolder']);
  readonly simpleDocumentTypes = [
    'Arkivutrymme',
    'Arendefaser',
    'Beslutstyp',
    'Beslutstyper',
    'Beredningsbeslutstyp',
    'Beredningsbeslutstyper',
    'Handlaggningsstatusar',
    'Klassificeringsstrukturer',
    'Lagrumsbeskrivning',
    'Lagrumsbeskrivningar',
    'Klasstyper',
    'Handlingstyper',
    'Mallar',
    'EPostmallar',
    'E-Postmallar',
    'Utkastmallar',
  ];
  readonly nuxeoApi = inject(NuxeoApiService);
  readonly router = inject(Router);
  readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);

  documentPath = input.required<string>();
  useOrganizationCreateForm = input(false);
  dialogClose = output();
  organizationCreateSelected = output<void>();
  updateReferences = output<Record<string, unknown>>();

  path = signal<string>('/');
  selectedType = signal<string>('');
  heading = signal<string>('');
  autocompleteOptionsPaths = signal<string[]>([]);
  autocompleteOptions = signal<NuxeoDocument[]>([]);
  availableDocuments = signal<Subtype[]>([]);
  parentUid = signal<string>('');
  errorMessage = signal<string | null>(null);
  selectedFiles: UploadedFile[] = [];
  currentParentPath = '';
  parentType = '';
  prefix = '';
  initialTabs: Tab[] = [
    { id: 'create', title: 'Skapa' },
    { id: 'import', title: 'Importera' },
  ];
  tabs = this.initialTabs;
  activeTabId = 'create';

  intHandlingRefs = signal<ArendeRefOption[]>([]);
  intArendeRefs = signal<ArendeRefOption[]>([]);
  externArendeRefs = signal<ExternalRefOption[]>([]);
  domainFormConfig = signal<FieldConfig[]>([
    {
      name: 'title',
      type: 'input',
      label: this.store.getValue('label.dublincore.title') ?? 'Titel',
      placeholder: 'Ange titel',
      validators: [Validators.required],
      defaultValue: '',
    },
    {
      name: 'description',
      type: 'textarea',
      label: this.store.getValue('label.description') ?? 'Beskrivning',
      placeholder: 'Ange beskrivning',
      defaultValue: '',
    },
    {
      name: 'nature',
      type: 'dropdown',
      label: 'Natur',
      options: [],
      defaultValue: '',
    },
    {
      name: 'subjects',
      type: 'dropdown-search',
      label: 'Ämnen',
      multiple: true,
      options: [],
      defaultValue: [],
    },
    {
      name: 'coverage',
      type: 'dropdown',
      label: 'Täckning',
      options: [],
      defaultValue: '',
    },
    {
      name: 'expires',
      type: 'datepicker',
      label: 'Förfaller',
      defaultValue: null,
    },
  ]);

  constructor() {
    effect(() => {
      if (this.documentPath()) {
        this.path.set(this.documentPath() + (this.documentPath() !== '/' ? '/' : ''));
      }
    });
  }

  ngOnInit(): void {
    this.getOptions();
    this.directoryOptions
      .getNatureOptions()
      .pipe(tap(options => this.updateDomainFieldOptions('nature', options)))
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(tap(options => this.updateDomainFieldOptions('subjects', options)))
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(tap(options => this.updateDomainFieldOptions('coverage', options)))
      .subscribe();
  }

  saveReferences() {
    this.updateReferences.emit({
      [`${this.prefix}:extern_referens`]: this.externArendeRefs().length
        ? this.externArendeRefs().map(el => ({ referens: el.referens, referenskommentar: el.comment }))
        : [],
      [`${this.prefix}:intern_arendereferens`]: this.intArendeRefs().length
        ? this.intArendeRefs().map(el => ({ arende: el.caseRef, referenstyp: el.type, referenskommentar: el.comment }))
        : [],
      [`${this.prefix}:intern_handlingsreferens`]: this.intHandlingRefs().length
        ? this.intHandlingRefs().map(el => ({
            handling: el.caseRef,
            referenstyp: el.type,
            referenskommentar: el.comment,
          }))
        : [],
    });
    this.dialogClose.emit();
  }

  updateOptions(changedPath: string) {
    this.path.set(changedPath);
    const parentPath = this.getParentPath(changedPath);
    if (this.currentParentPath !== parentPath) {
      this.currentParentPath = parentPath;
      this.getOptions(parentPath);
    }
  }

  getOptions(path = '') {
    this.nuxeoApi
      .getPathInfo(path)
      .pipe(
        switchMap(response => {
          this.parentType = response.type;
          this.prefix = this.parentType === 'Arende' ? 'arende' : 'handling';

          this.intHandlingRefs.set(
            response?.properties?.[
              this.parentType === 'Arende'
                ? NUXEO_SCHEMA_FIELDS.arende.internHandlingsreferens
                : NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens
            ]?.map(el => ({
              caseRef: el.handling,
              comment: el.referenskommentar,
              type: el.referenstyp,
            })) ?? []
          );
          this.intArendeRefs.set(
            response?.properties?.[
              this.parentType === 'Arende'
                ? NUXEO_SCHEMA_FIELDS.arende.internArendereferens
                : NUXEO_SCHEMA_FIELDS.handling.internArendereferens
            ]?.map(el => ({
              caseRef: el.arende,
              comment: el.referenskommentar,
              type: el.referenstyp,
            })) ?? []
          );
          this.externArendeRefs.set(
            response?.properties?.[
              this.parentType === 'Arende'
                ? NUXEO_SCHEMA_FIELDS.arende.externReferens
                : NUXEO_SCHEMA_FIELDS.handling.externReferens
            ]?.map(el => ({
              referens: el.referens,
              comment: el.referenskommentar ?? '',
            })) ?? []
          );

          if (response?.contextParameters?.subtypes) {
            const subtypes = response.contextParameters.subtypes;
            this.parentUid.set(response.uid);

            this.parentType = response.type;
            this.prefix = this.parentType === 'Arende' ? 'arende' : 'handling';
            if (response.type !== 'Handling') {
              this.tabs = this.tabs.filter(el => el.id === 'create');
            } else {
              this.tabs = this.initialTabs;
            }

            const filtered = subtypes.filter(
              subtype => !subtype.facets.includes('HiddenInCreation') && !this.hiddenTypes.has(subtype.type)
            );

            this.availableDocuments.set(filtered);
          }

          return this.nuxeoApi.getEntriesForParentPath(response.uid);
        }),
        map((response: SearchResult) => {
          this.autocompleteOptions.set(response.entries);
          return response.entries.map(entry => entry.path);
        }),
        tap((paths: string[]) => {
          const pathsWithSlashes = paths.map(path => (path.endsWith('/') ? path : path + '/'));
          return this.autocompleteOptionsPaths.set(pathsWithSlashes);
        })
      )
      .subscribe();
  }

  getParentPath(path: string) {
    if (path.endsWith('/')) {
      return path;
    }
    const pathParts = path.split('/').filter(el => el !== '');
    pathParts.pop();
    if (pathParts.length) {
      return pathParts.join('/');
    }

    return '/';
  }

  icons = ['arende', 'handling', 'utkast', 'fil', 'domain'];

  getIcon(type: string) {
    if (this.icons.includes(type.toLowerCase())) {
      return `/nuxeo/app/assets/figmaIcons/${type.toLowerCase()}.svg`;
    } else {
      return `/nuxeo/app/assets/doctypes/workspace.svg`;
    }
  }

  onDocumentClick(itemType: string) {
    if (this.useOrganizationCreateForm() && itemType === 'Organisationsdel') {
      this.organizationCreateSelected.emit();
      return;
    }

    if (
      [
        'Arende',
        'Handling',
        'Utkast',
        'Ar',
        'Arkiv',
        'ArkivArMapp',
        'Arkivutrymme',
        'Arendefas',
        'Arendefaser',
        'Handlingstyp',
        'Handlingstyper',
        'Klasstyp',
        'Klasstyper',
        'Beslut',
        'Beslutstyp',
        'Beslutstyper',
        'Beredningsbeslutstyp',
        'Beredningsbeslutstyper',
        'Beredningsbeslut',
        'Handlaggningsstatus',
        'Handlaggningsstatusar',
        'Klassificeringsstruktur',
        'Klassificeringsstrukturer',
        'Lagrumsbeskrivning',
        'Lagrumsbeskrivningar',
        'Lagrum',
        'Klass',
        'MailFolder',
        'Checklistor',
        'Checklista',
        'Note',
        'File',
        'Fil',
        'Picture',
        'Audio',
        'Video',
        'Collection',
        'Folder',
        'Workspace',
        'EPostmall',
        'Utkastmall',
        'Domain',
        'Myndighet',
        'Export',
        'ExportArMapp',
        'Exportutrymme',
        'Informationsforvaltning',
        'Organisation',
        'Diarium',
        ...this.simpleDocumentTypes,
      ].includes(itemType)
    ) {
      this.selectedType.set(itemType);
      switch (this.selectedType()) {
        case 'Arende':
          this.heading.set('Skapa ärende');
          break;

        case 'Handling':
          this.heading.set('Skapa handling');
          break;

        case 'Utkast':
          this.heading.set('Skapa utkast');
          break;

        case 'Domain':
          this.heading.set('Skapa domän');
          break;

        case 'Myndighet':
          this.heading.set('Skapa myndighet');
          break;

        case 'Export':
          this.heading.set('Skapa export');
          break;

        case 'ExportArMapp':
          this.heading.set('Skapa exportårmapp');
          break;

        case 'Exportutrymme':
          this.heading.set('Skapa exportutrymme');
          break;

        case 'Informationsforvaltning':
          this.heading.set('Skapa informationsförvaltning');
          break;

        case 'Organisation':
          this.heading.set('Skapa organisation');
          break;

        case 'Diarium':
          this.heading.set('Skapa diarium');
          break;

        default:
          this.heading.set(`Skapa ${itemType}`);
          break;
      }
    }
  }

  closeDialog(result: NuxeoDocument | null) {
    if (result?.uid) {
      if (
        (result.type === 'Folder' || result.type === 'Workspace' || result.type === 'Collection') &&
        result.path.startsWith('/default-domain/UserWorkspaces/')
      ) {
        this.router.navigate(['/personal'], { queryParams: { path: result.path } });
        this.dialogClose.emit();
        this.selectedType.set('');
        return;
      }
      const target = getPathByDocType(result.type);
      this.router.navigate(
        [target, result.uid],
        result.type === 'Arende' ? { state: { justCreated: true } } : undefined
      );
      this.dialogClose.emit();
    }
    this.selectedType.set('');
  }

  onTabChanged(tabId: string): void {
    this.activeTabId = tabId;
  }

  uploadFile(files: UploadedFile[]) {
    this.selectedFiles = files;
  }

  createDocumentFile() {
    if (!this.selectedFiles.length) {
      this.store.notification.set({
        show: true,
        variation: 'warning',
        text: SELECT_CASE_UPLOAD_NONE_SELECTED_MESSAGE,
      });
      return;
    }

    const handlingPath = this.path();

    this.nuxeoApi
      .getPathInfo(handlingPath)
      .pipe(
        switchMap(handlingDoc =>
          this.nuxeoApi
            .initializeUpload()
            .pipe(
              switchMap(batch =>
                forkJoin(
                  this.selectedFiles.map(file =>
                    this.nuxeoApi
                      .uploadFile(batch.batchId, [file])
                      .pipe(switchMap(() => this.nuxeoApi.attachFile(batch.batchId, file.name, handlingDoc.uid)))
                  )
                )
              )
            )
        )
      )
      .subscribe({
        next: (createdDocs: NuxeoDocument[]) => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: SELECT_CASE_UPLOAD_SUCCESS_MESSAGE,
          });
          const firstDoc = createdDocs?.[0];
          if (firstDoc?.uid) {
            const target = getPathByDocType(firstDoc.type);
            this.router.navigate([target, firstDoc.uid], { state: { justCreated: true } });
          }
          this.dialogClose.emit();
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: SELECT_CASE_UPLOAD_ERROR_MESSAGE,
          });
        },
      });
  }

  buildDomainFormConfig(): FieldConfig[] {
    return this.domainFormConfig();
  }

  private updateDomainFieldOptions(fieldName: string, options: Option[]): void {
    const updated = this.domainFormConfig().map(field => (field.name === fieldName ? { ...field, options } : field));
    this.domainFormConfig.set(updated);
  }

  buildMyndighetFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
      {
        name: 'organisationsnummer',
        type: 'input',
        label: 'Organisationsnummer',
        defaultValue: '',
      },
    ];
  }

  buildExportArMappFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
      { name: 'ar', type: 'input', label: 'Ar', inputType: 'number', defaultValue: '0' },
    ];
  }

  buildExportutrymmeFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
    ];
  }

  buildInformationsforvaltningFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
    ];
  }

  buildOrganisationFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
    ];
  }

  buildDiariumFormConfig(): FieldConfig[] {
    return [
      {
        name: 'title',
        type: 'input',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'description',
        type: 'textarea',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: '',
      },
      { name: 'prefix', type: 'input', label: 'Prefix', defaultValue: '' },
      { name: 'suffix', type: 'input', label: 'Suffix', defaultValue: '' },
      {
        name: 'lopnummerlangd',
        type: 'input',
        label: 'Löpnummerlängd',
        inputType: 'number',
        validators: [Validators.required],
        defaultValue: '',
      },
      {
        name: 'handlingslopnummerlangd',
        type: 'input',
        label: 'Handlingslöpnummerlängd',
        inputType: 'number',
        validators: [Validators.required],
        defaultValue: '',
      },
    ];
  }

  onDomainFormResult(formData: DomainFormResult, docType: string) {
    const title = (formData.title ?? '').trim();
    const description = (formData.description ?? '').trim();
    const nature = (formData.nature ?? '').trim();
    const subjects = (formData.subjects ?? []).map(option => option.id);
    const coverage = (formData.coverage ?? '').trim();
    const expires = formData.expires ?? [];
    const expired = expires.length ? toISODateOnlyString(expires[0]) : undefined;

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: title,
      [NUXEO_SCHEMA_FIELDS.dc.description]: description,
      [NUXEO_SCHEMA_FIELDS.dc.nature]: nature,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects,
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: expired,
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: docType,
      name: title,
      title,
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage(docType),
        });
        this.closeDialog(result);
      },
      error: error => {
        console.error('Error creating document', error);
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage(docType),
        });
      },
    });
  }

  onExportArMappFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
      [NUXEO_SCHEMA_FIELDS.exportarmapp.ar]: Number(formData['ar']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'ExportArMapp',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage('ExportArMapp'),
        });
        this.closeDialog(result);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage('ExportArMapp'),
        });
      },
    });
  }

  onExportutrymmeFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'Exportutrymme',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage('Exportutrymme'),
        });
        this.closeDialog(result);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage('Exportutrymme'),
        });
      },
    });
  }

  onInformationsforvaltningFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'Informationsforvaltning',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage('Informationsforvaltning'),
        });
        this.closeDialog(result);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage('Informationsforvaltning'),
        });
      },
    });
  }

  onMyndighetFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
      [NUXEO_SCHEMA_FIELDS.myndighet.organisationsnummer]: String(formData['organisationsnummer']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'Myndighet',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: SELECT_CASE_MYNDIGHET_CREATE_SUCCESS_MESSAGE,
        });
        this.closeDialog(result);
      },
      error: error => {
        console.error('Error creating document', error);
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: SELECT_CASE_MYNDIGHET_CREATE_ERROR_MESSAGE,
        });
      },
    });
  }

  onOrganisationFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'Organisation',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage('Organisation'),
        });
        this.closeDialog(result);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage('Organisation'),
        });
      },
    });
  }

  onDiariumFormResult(formData: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: String(formData['title']),
      [NUXEO_SCHEMA_FIELDS.dc.description]: String(formData['description']),
      [NUXEO_SCHEMA_FIELDS.diarium.prefix]: String(formData['prefix']),
      [NUXEO_SCHEMA_FIELDS.diarium.suffix]: String(formData['suffix']),
      [NUXEO_SCHEMA_FIELDS.diarium.lopnummerlangd]: Number(formData['lopnummerlangd']),
      [NUXEO_SCHEMA_FIELDS.diarium.handlingslopnummerlangd]: Number(formData['handlingslopnummerlangd']),
    };

    const payload: Partial<NuxeoDocument<Record<string, unknown>>> = {
      'entity-type': 'document',
      type: 'Diarium',
      name: String(formData['title']),
      title: String(formData['title']),
      properties,
    };

    this.nuxeoApi.createDocument(payload, this.path()).subscribe({
      next: (result: NuxeoDocument) => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: buildSelectCaseCreateSuccessMessage('Diarium'),
        });
        this.closeDialog(result);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: buildSelectCaseCreateErrorMessage('Diarium'),
        });
      },
    });
  }
}
