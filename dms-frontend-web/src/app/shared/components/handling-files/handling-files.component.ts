import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NuxeoFileDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiIconEye, DigiIconDownload, DigiIconPrint } from '@designsystem-se/af-angular';
import { truncateForTitle } from '@app/shared/utils/text-utils';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-handling-files',
  standalone: true,
  templateUrl: './handling-files.component.html',
  imports: [DigiIconEye, DigiIconDownload, DigiIconPrint],
})
export class HandlingFilesComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  files = input.required<NuxeoFileDocument[]>();
  selectedFileIds = input<Set<string>>(new Set());
  fileSelected = output<NuxeoFileDocument>();
  filePreview = output<NuxeoFileDocument>();
  selectionChange = output<{ file: NuxeoFileDocument; selected: boolean }>();
  attachmentSelectionChange = output<{ files: NuxeoFileDocument[]; selected: boolean }>();
  filePrint = output<NuxeoFileDocument>();
  readonly nuxeoApi = inject(NuxeoApiService);

  getDownloadUrl(uid: string) {
    if (!uid) return;
    return this.nuxeoApi.downloadFile(uid);
  }

  mainFiles = computed(() =>
    this.files().filter(file => file.properties[NUXEO_SCHEMA_FIELDS.fil.typ] === NUXEO_VOCAB_IDS.filTyp.huvudfil)
  );

  attachmentFiles = computed(() =>
    this.files().filter(file => file.properties[NUXEO_SCHEMA_FIELDS.fil.typ] !== NUXEO_VOCAB_IDS.filTyp.huvudfil)
  );

  allAttachmentFilesSelected = computed(() =>
    this.attachmentFiles().every(file => this.selectedFileIds().has(file.uid))
  );

  truncateTitle = truncateForTitle;

  onSelect(file: NuxeoFileDocument) {
    this.fileSelected.emit(file);
  }

  onPreview(file: NuxeoFileDocument) {
    this.filePreview.emit(file);
  }

  onPrint(file: NuxeoFileDocument) {
    this.filePrint.emit(file);
  }

  onSelectionChange(file: NuxeoFileDocument, event: Event) {
    const target = event.currentTarget;
    if (!target || !(target instanceof HTMLInputElement)) return;
    this.selectionChange.emit({ file, selected: target.checked });
  }

  toggleAttachmentSelection() {
    this.attachmentSelectionChange.emit({
      files: this.attachmentFiles(),
      selected: !this.allAttachmentFilesSelected(),
    });
  }
}
