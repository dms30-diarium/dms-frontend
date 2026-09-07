import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { HttpClient } from '@angular/common/http';
import { SafeResourceUrl } from '@angular/platform-browser';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { BackToPersonalButtonComponent } from '@app/shared/components/back-to-personal-button/back-to-personal-button.component';
import {
  DigiButton,
  DigiIconTrash,
  DigiIconSearch,
  DigiIconPlus,
  DigiIconArrowLeft,
  DigiDialog,
} from '@designsystem-se/af-angular';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { GeneralStore } from '@app/core/services/general-store.service';
import { catchError, EMPTY, finalize, tap } from 'rxjs';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import {
  DOCUMENT_UPDATE_ERROR_MESSAGE,
  DOCUMENT_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-file-view',
  imports: [
    RouterModule,
    PdfViewerComponent,
    DigiButton,
    DigiIconTrash,
    DigiIconSearch,
    DigiIconPlus,
    DigiIconArrowLeft,
    DigiDialog,
    GeneralFormComponent,
    BackToPersonalButtonComponent,
  ],
  templateUrl: './file-view.component.html',
})
export class FileViewComponent implements OnDestroy {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  router = inject(Router);
  route = inject(ActivatedRoute);
  http: HttpClient = inject(HttpClient);
  readonly nuxeoApi = inject(NuxeoApiService);
  readonly directoryOptions = inject(DirectoryOptionsService);
  readonly store = inject(GeneralStore);
  private readonly injector = inject(Injector);
  document = input<NuxeoDocument | null>(null);
  reloadDocument = output<void>();
  isDeleteDialogOpened = signal(false);
  shouldShowRegistrarControls = signal(false);
  isEditDialogOpen = signal(false);
  isSavingEdit = signal(false);
  fileEditConfig = signal<FieldConfig[]>([]);
  fileNatureOptions = signal<Option[]>([]);
  fileSubjectOptions = signal<Option[]>([]);
  fileCoverageOptions = signal<Option[]>([]);

  docId: string;
  safePreviewUrl: SafeResourceUrl | undefined;

  @ViewChild('fileEditForm') private fileEditForm?: GeneralFormComponent;

  constructor() {
    this.docId = this.route.snapshot.params['id'];

    this.loadDirectoryOptions();
    queueMicrotask(() => {
      effect(
        () => {
          const doc = this.document();
          if (!doc) return;
          if (doc.type === 'Fil') {
            this.store.openPage.set('file');
            this.store.baseButtons.set([createButton('edit', () => this.openEditDialog())]);
            return;
          }
          this.store.openPage.set(null);
        },
        { injector: this.injector }
      );
    });
  }
  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }
  deleteDocument() {
    const doc = this.document();
    if (!doc) return;
    this.nuxeoApi.deleteDocument(doc.uid).subscribe();
    this.router.navigate(['']);
  }

  openEditDialog(): void {
    const doc = this.document();
    if (!doc) return;
    this.fileEditConfig.set(this.buildFileEditConfig(doc));
    this.isEditDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
  }

  submitFileEdit(): void {
    this.fileEditForm?.submit();
  }

  canRenderPdf(): boolean {
    const doc = this.document();
    if (!doc) return false;
    const file = Object(doc.properties?.[NUXEO_SCHEMA_FIELDS.file.content]);
    const mimeValue = Reflect.get(file, 'mime-type') ?? Reflect.get(file, 'mimeType');
    const mimeText = String(mimeValue ?? '').toLowerCase();
    return mimeText.includes('pdf');
  }

  getFileTypeLabel(doc: NuxeoDocument | null = this.document()): string {
    if (!doc) return '';
    const fileType = doc.properties[NUXEO_SCHEMA_FIELDS.fil.typ];
    if (typeof fileType === 'string') return '';
    return fileType?.properties?.label ?? '';
  }

  saveEdits(event: Record<string, unknown>): void {
    const doc = this.document();
    const docId = doc?.uid ?? '';
    if (!docId) return;
    const titleValue = event['title'];
    const descriptionValue = event['description'];
    const titleText = Object.prototype.toString.call(titleValue) === '[object String]' ? String(titleValue).trim() : '';
    const description =
      Object.prototype.toString.call(descriptionValue) === '[object String]' ? String(descriptionValue).trim() : '';
    const nature = event['nature'];
    const coverage = event['coverage'];
    const subjectsRaw = event['subjects'];
    const subjects: string[] = Array.isArray(subjectsRaw)
      ? subjectsRaw
          .map(entry => Object(entry)['id'] ?? Object(entry)['value'] ?? entry)
          .map(value => (value ? String(value) : ''))
          .filter(value => value.length > 0)
      : [];
    const expiresRaw = event['expires'];
    const expires = Array.isArray(expiresRaw) ? expiresRaw[0] : expiresRaw;
    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: titleText,
      [NUXEO_SCHEMA_FIELDS.dc.description]: description,
      [NUXEO_SCHEMA_FIELDS.dc.nature]: nature,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: subjects,
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: coverage,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: expires,
    };

    this.isSavingEdit.set(true);
    this.nuxeoApi
      .editDocument(docId, properties)
      .pipe(
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: DOCUMENT_UPDATE_SUCCESS_MESSAGE,
          });
          this.isEditDialogOpen.set(false);
          this.reloadDocument.emit();
        }),
        catchError(() => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: DOCUMENT_UPDATE_ERROR_MESSAGE,
          });
          return EMPTY;
        }),
        finalize(() => this.isSavingEdit.set(false))
      )
      .subscribe();
  }

  private loadDirectoryOptions(): void {
    this.directoryOptions
      .getNatureOptions()
      .pipe(
        tap(options => {
          this.fileNatureOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.fileEditConfig.set(this.buildFileEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(
        tap(options => {
          this.fileSubjectOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.fileEditConfig.set(this.buildFileEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(
        tap(options => {
          this.fileCoverageOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.fileEditConfig.set(this.buildFileEditConfig(doc));
        })
      )
      .subscribe();
  }

  private buildFileEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties;
    const titleValue = props[NUXEO_SCHEMA_FIELDS.dc.title];
    const titleFallback = doc.title ?? '';
    const descriptionValue = props[NUXEO_SCHEMA_FIELDS.dc.description];
    const titleText =
      (Object.prototype.toString.call(titleValue) === '[object String]' ? String(titleValue).trim() : '') ||
      (Object.prototype.toString.call(titleFallback) === '[object String]' ? String(titleFallback).trim() : '');
    const descriptionText =
      Object.prototype.toString.call(descriptionValue) === '[object String]' ? String(descriptionValue).trim() : '';
    const subjectsValue = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectsArray = Array.isArray(subjectsValue) ? subjectsValue : [subjectsValue];
    const subjectIdSet = new Set(
      subjectsArray
        .map(entry => Object(entry)['id'] ?? entry)
        .map(value => (value ? String(value) : ''))
        .filter(value => value.length > 0)
    );
    const selectedSubjects = this.fileSubjectOptions().filter(option => subjectIdSet.has(option.id));
    const expiresValue = props[NUXEO_SCHEMA_FIELDS.dc.expired];
    const expiresDefault = expiresValue ? [new Date(String(expiresValue))] : [];
    return [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: titleText,
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: descriptionText,
      },
      {
        type: 'dropdown',
        name: 'nature',
        label: this.store.getValue('label.dublincore.nature') ?? 'Natur',
        options: this.fileNatureOptions(),
        defaultValue: Object(props[NUXEO_SCHEMA_FIELDS.dc.nature])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.nature] ?? '',
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: this.store.getValue('label.dublincore.subjects') ?? 'Ämnen',
        options: this.fileSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: this.store.getValue('label.dublincore.coverage') ?? 'Täckning',
        options: this.fileCoverageOptions(),
        defaultValue:
          Object(props[NUXEO_SCHEMA_FIELDS.dc.coverage])['id'] ?? props[NUXEO_SCHEMA_FIELDS.dc.coverage] ?? '',
      },
      {
        type: 'datepicker',
        name: 'expires',
        label: this.store.getValue('label.dublincore.expire') ?? 'Förfaller',
        defaultValue: expiresDefault,
      },
    ];
  }

  ngOnDestroy(): void {
    this.store.openPage.set(null);
  }
}
