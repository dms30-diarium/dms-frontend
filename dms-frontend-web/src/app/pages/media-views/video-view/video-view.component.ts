import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';

import { Validators } from '@angular/forms';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { DocumentInfoPanelComponent } from '@app/shared/components/document-info-panel/document-info-panel.component';
import { BackToPersonalButtonComponent } from '@app/shared/components/back-to-personal-button/back-to-personal-button.component';
import { DigiButton, DigiDialog, DigiIconDownload } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { catchError, EMPTY, finalize, tap } from 'rxjs';
import { formatFileSize } from '@app/shared/utils/download-utils';
import {
  DOCUMENT_UPDATE_ERROR_MESSAGE,
  DOCUMENT_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

interface VideoRenditionItem {
  title: string;
  resolutionLabel: string;
  sizeLabel: string;
  formatLabel: string;
  detailLabel: string;
  downloadUrl?: string;
}

@Component({
  selector: 'nuxeo-video-view',
  standalone: true,
  imports: [
    PdfViewerComponent,
    DocumentInfoPanelComponent,
    BackToPersonalButtonComponent,
    DigiIconDownload,
    DigiDialog,
    DigiButton,
    GeneralFormComponent,
  ],
  templateUrl: './video-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoViewComponent {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);
  private readonly injector = inject(Injector);

  document = input<NuxeoDocument | null>(null);
  reloadDocument = output<void>();
  isEditDialogOpen = signal(false);
  isSavingEdit = signal(false);
  videoEditConfig = signal<FieldConfig[]>([]);
  videoNatureOptions = signal<Option[]>([]);
  videoSubjectOptions = signal<Option[]>([]);
  videoCoverageOptions = signal<Option[]>([]);
  @ViewChild('videoEditForm') private videoEditForm?: GeneralFormComponent;

  constructor() {
    this.loadDirectoryOptions();
    queueMicrotask(() => {
      effect(
        () => {
          const doc = this.document();
          if (!doc) return;
          if (doc.type === 'Video') {
            this.store.openPage.set('video');
            this.store.baseButtons.set([createButton('edit', () => this.openEditDialog())]);
            return;
          }
          this.store.openPage.set(null);
        },
        { injector: this.injector }
      );

      effect(
        () => {
          const doc = this.document();
          if (!doc || this.isEditDialogOpen()) return;
          this.videoEditConfig.set(this.buildVideoEditConfig(doc));
        },
        { injector: this.injector }
      );
    });
  }

  title = computed(() => {
    const doc = this.document();
    return doc?.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] || doc?.title || doc?.uid || '';
  });

  videoRenditions = computed(() => this.mapVideoRenditions());
  videoRenditionGroups = computed(() => {
    const renditions = this.videoRenditions();
    const groups: VideoRenditionItem[][] = [];
    for (let index = 0; index < renditions.length; index += 4) {
      groups.push(renditions.slice(index, index + 4));
    }
    return groups;
  });

  openEditDialog(): void {
    const doc = this.document();
    if (!doc) return;
    this.videoEditConfig.set(this.buildVideoEditConfig(doc));
    this.isEditDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
  }

  submitVideoEdit(): void {
    this.videoEditForm?.submit();
  }

  saveEdits(event: Record<string, unknown>): void {
    const doc = this.document();
    const docId = doc?.uid ?? '';
    if (!docId) return;

    const titleValue = event['title'];
    const titleText = String(titleValue ?? '').trim();
    const descriptionValue = event['description'];
    const descriptionText = String(descriptionValue ?? '').trim();
    const description = descriptionText ? descriptionText : '';

    const natureValue = event['nature'];
    const natureObject = natureValue == null ? null : Object(natureValue);
    const natureCandidate = natureObject
      ? (Reflect.get(natureObject, 'id') ?? Reflect.get(natureObject, 'value') ?? natureValue)
      : '';
    const nature = String(natureCandidate ?? '').trim();

    const coverageValue = event['coverage'];
    const coverageObject = coverageValue == null ? null : Object(coverageValue);
    const coverageCandidate = coverageObject
      ? (Reflect.get(coverageObject, 'id') ?? Reflect.get(coverageObject, 'value') ?? coverageValue)
      : '';
    const coverage = String(coverageCandidate ?? '').trim();

    const subjectsValue = event['subjects'];
    const subjects = Array.isArray(subjectsValue)
      ? subjectsValue
          .map(entry => {
            const entryObject = entry == null ? null : Object(entry);
            const candidate = entryObject
              ? (Reflect.get(entryObject, 'id') ?? Reflect.get(entryObject, 'value') ?? entry)
              : '';
            return String(candidate ?? '').trim();
          })
          .filter(entry => entry)
      : [];

    const expiresValue = event['expires'];
    const rawExpires = Array.isArray(expiresValue) ? expiresValue[0] : expiresValue;
    const expires = rawExpires instanceof Date ? rawExpires.toISOString() : String(rawExpires ?? '').trim();

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
          this.videoNatureOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.videoEditConfig.set(this.buildVideoEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(
        tap(options => {
          this.videoSubjectOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.videoEditConfig.set(this.buildVideoEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(
        tap(options => {
          this.videoCoverageOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.videoEditConfig.set(this.buildVideoEditConfig(doc));
        })
      )
      .subscribe();
  }

  private buildVideoEditConfig(doc: NuxeoDocument): FieldConfig[] {
    const props = doc.properties;
    const titleValue = props[NUXEO_SCHEMA_FIELDS.dc.title] ?? doc.title ?? '';
    const descriptionValue = props[NUXEO_SCHEMA_FIELDS.dc.description] ?? '';
    const subjectsValue = props[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [];
    const subjectsArray = Array.isArray(subjectsValue) ? subjectsValue : [subjectsValue];
    const subjectIdSet = new Set(
      subjectsArray
        .map(entry => {
          const entryId = entry?.id ?? entry?.properties?.id ?? '';
          const parentId = entry?.properties?.parent?.id ?? '';
          if (parentId && entryId) return `${parentId}/${entryId}`;
          return entryId || String(entry ?? '');
        })
        .filter(value => value.length > 0)
    );
    const coverageValue = props[NUXEO_SCHEMA_FIELDS.dc.coverage];
    const coverageId = coverageValue?.id ?? coverageValue?.properties?.id ?? '';
    const coverageParentId = coverageValue?.properties?.parent?.id ?? '';
    const coverageDefault = coverageParentId && coverageId ? `${coverageParentId}/${coverageId}` : coverageId;
    const natureValue = props[NUXEO_SCHEMA_FIELDS.dc.nature];
    const natureId = natureValue?.id ?? natureValue?.properties?.id ?? '';
    const selectedSubjects = this.videoSubjectOptions().filter(option => subjectIdSet.has(option.id));
    const expiresValue = props[NUXEO_SCHEMA_FIELDS.dc.expired];
    const expiresDefault = expiresValue ? [new Date(String(expiresValue))] : [];

    return [
      {
        type: 'input',
        name: 'title',
        label: this.store.getValue('label.dublincore.title') ?? 'Titel',
        defaultValue: String(titleValue),
        validators: [Validators.required],
      },
      {
        type: 'textarea',
        name: 'description',
        label: this.store.getValue('label.description') ?? 'Beskrivning',
        defaultValue: String(descriptionValue),
      },
      {
        type: 'dropdown',
        name: 'nature',
        label: 'Nature',
        options: this.videoNatureOptions(),
        defaultValue: String(natureId),
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: 'Subjects',
        options: this.videoSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: 'Coverage',
        options: this.videoCoverageOptions(),
        defaultValue: String(coverageDefault),
      },
      {
        type: 'datepicker',
        name: 'expires',
        label: 'Expires',
        defaultValue: expiresDefault,
      },
    ];
  }

  getVideoFormatLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.info]);
    const infoFormatValue = Reflect.get(info, 'format');
    const infoFormatText = String(infoFormatValue ?? '').trim();
    if (infoFormatText) return infoFormatText.toUpperCase();

    const file = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]);
    const mimeValue = Reflect.get(file, 'mime-type');
    const mimeText = String(mimeValue ?? '').trim();
    if (!mimeText) return '';
    const parts = mimeText.split('/');
    return parts[1] ? parts[1].toUpperCase() : mimeText;
  }

  getVideoDurationLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.info]);
    const durationValue = Reflect.get(info, 'duration');
    const durationNumber = Number(durationValue);

    if (!Number.isFinite(durationNumber) || durationNumber < 0) return '';

    const totalSeconds = Math.floor(durationNumber);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  getVideoWidthLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.info]);
    const widthValue = Reflect.get(info, 'width');
    const widthNumber = Number(widthValue);

    return Number.isFinite(widthNumber) ? String(widthNumber) : '';
  }

  getVideoHeightLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.info]);
    const heightValue = Reflect.get(info, 'height');
    const heightNumber = Number(heightValue);

    return Number.isFinite(heightNumber) ? String(heightNumber) : '';
  }

  getVideoFrameRateLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.info]);
    const frameRateValue = Reflect.get(info, 'frameRate');
    const frameRateText = String(frameRateValue ?? '').trim();
    return frameRateText || '';
  }

  getVideoSizeLabel(): string {
    const file = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]);
    const lengthValue = Reflect.get(file, 'length') ?? Reflect.get(file, 'size');
    const lengthNumber = Number(lengthValue);

    if (!Number.isFinite(lengthNumber) || lengthNumber <= 0) return '';

    return formatFileSize(lengthNumber);
  }

  private mapVideoRenditions(): VideoRenditionItem[] {
    const renditions = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.vid.transcodedVideos];
    if (!Array.isArray(renditions)) return [];

    return renditions
      .map(entry => {
        const record = Object(entry);
        const contentValue =
          Reflect.get(record, 'content') ??
          Reflect.get(record, 'file') ??
          Reflect.get(record, 'blob') ??
          Reflect.get(record, 'mainFile');
        const content = Object(contentValue);
        const info = Object(Reflect.get(record, 'info'));

        const titleValue =
          Reflect.get(record, 'title') ??
          Reflect.get(record, 'name') ??
          Reflect.get(record, 'label') ??
          Reflect.get(record, 'description');
        const titleText = String(titleValue ?? '').trim();
        const safeTitle = titleText === '[object Object]' ? '' : titleText;

        const widthValue = Reflect.get(record, 'width') ?? Reflect.get(info, 'width');
        const widthNumber = Number(widthValue);

        const heightValue = Reflect.get(record, 'height') ?? Reflect.get(info, 'height');
        const heightNumber = Number(heightValue);

        const lengthValue = Reflect.get(content, 'length') ?? Reflect.get(content, 'size');
        const lengthNumber = Number(lengthValue);

        const mimeValue = Reflect.get(content, 'mime-type') ?? Reflect.get(content, 'mimeType');
        const mimeText = String(mimeValue ?? '').trim();
        const infoFormatValue = Reflect.get(info, 'format');
        const infoFormatText = String(infoFormatValue ?? '').trim();
        const formatText = infoFormatText || (mimeText ? mimeText.split('/')[1] : '');

        const downloadValue =
          Reflect.get(content, 'data') ?? Reflect.get(content, 'download-url') ?? Reflect.get(content, 'blobUrl');
        const downloadText = String(downloadValue ?? '').trim();
        const downloadUrl = this.withClientReason(downloadText);

        let sizeLabel = '';
        if (Number.isFinite(lengthNumber) && lengthNumber > 0) {
          sizeLabel = formatFileSize(lengthNumber);
        }

        const resolutionLabel =
          Number.isFinite(widthNumber) && Number.isFinite(heightNumber) ? `${widthNumber} x ${heightNumber}` : '';

        const formatLabel = formatText ? formatText.toUpperCase() : '';
        const detailLabel = [resolutionLabel, sizeLabel, formatLabel].filter(part => part).join(' · ');

        return {
          title: safeTitle || '',
          resolutionLabel,
          sizeLabel,
          formatLabel,
          detailLabel,
          downloadUrl: downloadUrl || undefined,
        };
      })
      .filter(item => item.title || item.detailLabel || item.downloadUrl);
  }

  private withClientReason(url: string): string {
    if (!url) return '';
    if (url.includes('clientReason=download')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}clientReason=download`;
  }
}
