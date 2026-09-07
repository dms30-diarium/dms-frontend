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
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
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

interface PictureViewItem {
  title: string;
  widthLabel: string;
  heightLabel: string;
  sizeLabel: string;
  formatLabel: string;
  downloadUrl?: string;
}

@Component({
  selector: 'nuxeo-picture-view',
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
  templateUrl: './picture-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureViewComponent {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly directoryOptions = inject(DirectoryOptionsService);
  private readonly injector = inject(Injector);

  document = input<NuxeoDocument | null>(null);
  reloadDocument = output<void>();
  isEditDialogOpen = signal(false);
  isSavingEdit = signal(false);
  pictureEditConfig = signal<FieldConfig[]>([]);
  pictureNatureOptions = signal<Option[]>([]);
  pictureSubjectOptions = signal<Option[]>([]);
  pictureCoverageOptions = signal<Option[]>([]);
  @ViewChild('pictureEditForm') private pictureEditForm?: GeneralFormComponent;

  constructor() {
    this.loadDirectoryOptions();

    queueMicrotask(() => {
      effect(
        () => {
          const doc = this.document();
          if (!doc) return;
          if (doc.type === 'Picture') {
            this.store.openPage.set('picture');
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
          this.pictureEditConfig.set(this.buildPictureEditConfig(doc));
        },
        { injector: this.injector }
      );
    });
  }

  title = computed(() => {
    const doc = this.document();
    return doc?.properties?.[NUXEO_SCHEMA_FIELDS.dc.title] || doc?.title || doc?.uid || '';
  });

  pictureViews = computed(() => this.mapPictureViews());
  pictureViewGroups = computed(() => {
    const views = this.pictureViews();
    const groups: PictureViewItem[][] = [];
    for (let index = 0; index < views.length; index += 4) {
      groups.push(views.slice(index, index + 4));
    }
    return groups;
  });

  openEditDialog(): void {
    const doc = this.document();
    if (!doc) return;
    this.pictureEditConfig.set(this.buildPictureEditConfig(doc));
    this.isEditDialogOpen.set(true);
  }

  closeEditDialog(): void {
    this.isEditDialogOpen.set(false);
  }

  submitPictureEdit(): void {
    this.pictureEditForm?.submit();
  }

  saveEdits(event: Record<string, unknown>): void {
    const doc = this.document();
    const docId = doc?.uid ?? '';
    if (!docId) return;
    const titleValue = event['title'] ?? '';
    const descriptionValue = event['description'] ?? '';
    const nature = event['nature'];
    const coverage = event['coverage'];

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
    const expires = rawExpires;

    const properties: Record<string, unknown> = {
      [NUXEO_SCHEMA_FIELDS.dc.title]: titleValue,
      [NUXEO_SCHEMA_FIELDS.dc.description]: descriptionValue,
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
          this.pictureNatureOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.pictureEditConfig.set(this.buildPictureEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getSubjectOptions()
      .pipe(
        tap(options => {
          this.pictureSubjectOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.pictureEditConfig.set(this.buildPictureEditConfig(doc));
        })
      )
      .subscribe();

    this.directoryOptions
      .getCoverageOptions()
      .pipe(
        tap(options => {
          this.pictureCoverageOptions.set(options);
          const doc = this.document();
          if (!doc || !this.isEditDialogOpen()) return;
          this.pictureEditConfig.set(this.buildPictureEditConfig(doc));
        })
      )
      .subscribe();
  }

  private buildPictureEditConfig(doc: NuxeoDocument): FieldConfig[] {
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
    const expiresValue = props[NUXEO_SCHEMA_FIELDS.dc.expired];
    const expiresDefault = expiresValue ? [new Date(String(expiresValue))] : [];
    const selectedSubjects = this.pictureSubjectOptions().filter(option => subjectIdSet.has(option.id));

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
        options: this.pictureNatureOptions(),
        defaultValue: String(natureId),
      },
      {
        type: 'dropdown-search',
        name: 'subjects',
        label: 'Subjects',
        options: this.pictureSubjectOptions(),
        multiple: true,
        defaultValue: selectedSubjects,
      },
      {
        type: 'dropdown',
        name: 'coverage',
        label: 'Coverage',
        options: this.pictureCoverageOptions(),
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

  getDimensionsLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.info]);
    const infoWidthValue = Reflect.get(info, 'width');
    const infoHeightValue = Reflect.get(info, 'height');

    let widthNumber = NaN;
    const widthType = Object.prototype.toString.call(infoWidthValue);
    if (widthType === '[object Number]') {
      widthNumber = Number(infoWidthValue);
    }
    if (widthType === '[object String]') {
      const trimmed = String(infoWidthValue).trim();
      if (trimmed) widthNumber = Number(trimmed);
    }

    let heightNumber = NaN;
    const heightType = Object.prototype.toString.call(infoHeightValue);
    if (heightType === '[object Number]') {
      heightNumber = Number(infoHeightValue);
    }
    if (heightType === '[object String]') {
      const trimmed = String(infoHeightValue).trim();
      if (trimmed) heightNumber = Number(trimmed);
    }

    if (!Number.isFinite(widthNumber)) {
      const fallbackWidthValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.pixelXdimension];
      const fallbackType = Object.prototype.toString.call(fallbackWidthValue);
      if (fallbackType === '[object Number]') {
        widthNumber = Number(fallbackWidthValue);
      }
      if (fallbackType === '[object String]') {
        const trimmed = String(fallbackWidthValue).trim();
        if (trimmed) widthNumber = Number(trimmed);
      }
    }

    if (!Number.isFinite(heightNumber)) {
      const fallbackHeightValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.pixelYdimension];
      const fallbackType = Object.prototype.toString.call(fallbackHeightValue);
      if (fallbackType === '[object Number]') {
        heightNumber = Number(fallbackHeightValue);
      }
      if (fallbackType === '[object String]') {
        const trimmed = String(fallbackHeightValue).trim();
        if (trimmed) heightNumber = Number(trimmed);
      }
    }

    if (Number.isFinite(widthNumber) && Number.isFinite(heightNumber)) {
      return `${widthNumber} x ${heightNumber}`;
    }
    return '—';
  }

  getFormatLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.info]);
    const infoFormatValue = Reflect.get(info, 'format');
    const infoFormatText =
      Object.prototype.toString.call(infoFormatValue) === '[object String]' ? String(infoFormatValue).trim() : '';
    if (infoFormatText) return infoFormatText.toUpperCase();

    const file = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]);
    const mimeValue = Reflect.get(file, 'mime-type');
    const mimeText = Object.prototype.toString.call(mimeValue) === '[object String]' ? String(mimeValue).trim() : '';
    if (!mimeText) return '—';
    const parts = mimeText.split('/');
    return parts[1] ? parts[1].toUpperCase() : mimeText;
  }

  getColorProfileLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.info]);
    const colorValue = Reflect.get(info, 'colorSpace');
    const colorText = Object.prototype.toString.call(colorValue) === '[object String]' ? String(colorValue).trim() : '';
    if (colorText) return colorText;

    const fallbackValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.colorSpace];
    const fallbackText =
      Object.prototype.toString.call(fallbackValue) === '[object String]' ? String(fallbackValue).trim() : '';
    return fallbackText || '—';
  }

  getBitDepthLabel(): string {
    const info = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.info]);
    const depthValue = Reflect.get(info, 'depth');
    let depthNumber = NaN;
    const depthType = Object.prototype.toString.call(depthValue);
    if (depthType === '[object Number]') {
      depthNumber = Number(depthValue);
    }
    if (depthType === '[object String]') {
      const trimmed = String(depthValue).trim();
      if (trimmed) depthNumber = Number(trimmed);
    }

    if (!Number.isFinite(depthNumber)) {
      const fallbackValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.bitDepth];
      const fallbackType = Object.prototype.toString.call(fallbackValue);
      if (fallbackType === '[object Number]') {
        depthNumber = Number(fallbackValue);
      }
      if (fallbackType === '[object String]') {
        const trimmed = String(fallbackValue).trim();
        if (trimmed) depthNumber = Number(trimmed);
      }
    }

    return Number.isFinite(depthNumber) ? String(depthNumber) : '—';
  }

  getWeightLabel(): string {
    const file = Object(this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.file.content]);
    const lengthValue = Reflect.get(file, 'length') ?? Reflect.get(file, 'size');
    const lengthType = Object.prototype.toString.call(lengthValue);
    let lengthNumber = NaN;
    if (lengthType === '[object Number]') {
      lengthNumber = Number(lengthValue);
    }
    if (lengthType === '[object String]') {
      const trimmed = String(lengthValue).trim();
      if (trimmed) lengthNumber = Number(trimmed);
    }

    if (!Number.isFinite(lengthNumber) || lengthNumber <= 0) return '—';

    return formatFileSize(lengthNumber);
  }

  getExifDateLabel(): string {
    const rawValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.dateTimeOriginal];
    const rawType = Object.prototype.toString.call(rawValue);
    const text = rawType === '[object String]' || rawType === '[object Number]' ? String(rawValue).trim() : '';
    return text ? formatDateOrMissing(text) : '—';
  }

  getExifValue(key: string): string {
    const rawValue = this.document()?.properties?.[key];
    const rawType = Object.prototype.toString.call(rawValue);
    if (rawType === '[object String]') {
      const text = String(rawValue).trim();
      return text || '—';
    }
    if (rawType === '[object Number]') {
      return String(rawValue);
    }
    return '—';
  }

  getIptcCopyright(): string {
    const copyrightValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.imd.copyright];
    const rightsValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.dc.rights];
    const copyrightType = Object.prototype.toString.call(copyrightValue);
    const rightsType = Object.prototype.toString.call(rightsValue);
    const copyrightText = copyrightType === '[object String]' ? String(copyrightValue).trim() : '';
    const rightsText = rightsType === '[object String]' ? String(rightsValue).trim() : '';
    return copyrightText || rightsText || '—';
  }

  getIptcRights(): string {
    const rightsValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.dc.rights];
    const rightsType = Object.prototype.toString.call(rightsValue);
    const rightsText = rightsType === '[object String]' ? String(rightsValue).trim() : '';
    return rightsText || '—';
  }

  getIptcSource(): string {
    const pictureSourceValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.source];
    const dcSourceValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.dc.source];
    const pictureSourceType = Object.prototype.toString.call(pictureSourceValue);
    const dcSourceType = Object.prototype.toString.call(dcSourceValue);
    const pictureSourceText = pictureSourceType === '[object String]' ? String(pictureSourceValue).trim() : '';
    const dcSourceText = dcSourceType === '[object String]' ? String(dcSourceValue).trim() : '';
    return pictureSourceText || dcSourceText || '—';
  }

  getIptcDescription(): string {
    const descriptionValue = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.dc.description];
    const descriptionType = Object.prototype.toString.call(descriptionValue);
    const descriptionText = descriptionType === '[object String]' ? String(descriptionValue).trim() : '';
    return descriptionText || '—';
  }

  private mapPictureViews(): PictureViewItem[] {
    const views = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.picture.views];
    if (!Array.isArray(views)) return [];

    return views
      .map(view => {
        const record = Object(view);
        const contentValue =
          Reflect.get(record, 'content') ??
          Reflect.get(record, 'file') ??
          Reflect.get(record, 'blob') ??
          Reflect.get(record, 'mainFile');
        const content = Object(contentValue);
        const info = Object(Reflect.get(record, 'info'));

        const descriptionValue = Reflect.get(record, 'description');
        const descriptionText =
          Object.prototype.toString.call(descriptionValue) === '[object String]' ? String(descriptionValue).trim() : '';
        const titleValue = Reflect.get(record, 'title');
        const titleText =
          Object.prototype.toString.call(titleValue) === '[object String]' ? String(titleValue).trim() : '';
        const filenameValue = Reflect.get(record, 'filename');
        const filenameText =
          Object.prototype.toString.call(filenameValue) === '[object String]' ? String(filenameValue).trim() : '';
        const contentNameValue = Reflect.get(content, 'name');
        const contentNameText =
          Object.prototype.toString.call(contentNameValue) === '[object String]' ? String(contentNameValue).trim() : '';

        const title = descriptionText || titleText || filenameText || contentNameText || 'Format';

        const widthValue = Reflect.get(record, 'width') ?? Reflect.get(info, 'width');
        const widthType = Object.prototype.toString.call(widthValue);
        let widthNumber = NaN;
        if (widthType === '[object Number]') {
          widthNumber = Number(widthValue);
        }
        if (widthType === '[object String]') {
          const trimmed = String(widthValue).trim();
          if (trimmed) widthNumber = Number(trimmed);
        }

        const heightValue = Reflect.get(record, 'height') ?? Reflect.get(info, 'height');
        const heightType = Object.prototype.toString.call(heightValue);
        let heightNumber = NaN;
        if (heightType === '[object Number]') {
          heightNumber = Number(heightValue);
        }
        if (heightType === '[object String]') {
          const trimmed = String(heightValue).trim();
          if (trimmed) heightNumber = Number(trimmed);
        }

        const lengthValue = Reflect.get(content, 'length') ?? Reflect.get(content, 'size');
        const lengthType = Object.prototype.toString.call(lengthValue);
        let lengthNumber = NaN;
        if (lengthType === '[object Number]') {
          lengthNumber = Number(lengthValue);
        }
        if (lengthType === '[object String]') {
          const trimmed = String(lengthValue).trim();
          if (trimmed) lengthNumber = Number(trimmed);
        }

        const mimeValue = Reflect.get(content, 'mime-type') ?? Reflect.get(content, 'mimeType');
        const mimeText =
          Object.prototype.toString.call(mimeValue) === '[object String]' ? String(mimeValue).trim() : '';
        const infoFormatValue = Reflect.get(info, 'format');
        const infoFormatText =
          Object.prototype.toString.call(infoFormatValue) === '[object String]' ? String(infoFormatValue).trim() : '';
        const formatText = infoFormatText || (mimeText ? mimeText.split('/')[1] : '');

        const downloadValue =
          Reflect.get(content, 'data') ?? Reflect.get(content, 'download-url') ?? Reflect.get(content, 'blobUrl');
        const downloadText =
          Object.prototype.toString.call(downloadValue) === '[object String]' ? String(downloadValue).trim() : '';
        const downloadUrl = this.withClientReason(downloadText);

        let sizeLabel = '—';
        if (Number.isFinite(lengthNumber) && lengthNumber > 0) {
          sizeLabel = formatFileSize(lengthNumber);
        }

        return {
          title,
          widthLabel: Number.isFinite(widthNumber) ? String(widthNumber) : '—',
          heightLabel: Number.isFinite(heightNumber) ? String(heightNumber) : '—',
          sizeLabel,
          formatLabel: formatText ? formatText.toUpperCase() : '—',
          downloadUrl: downloadUrl || undefined,
        };
      })
      .filter(item => item.title || item.widthLabel !== '—' || item.heightLabel !== '—');
  }

  private withClientReason(url: string): string {
    if (!url) return '';
    if (url.includes('clientReason=download')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}clientReason=download`;
  }
}
