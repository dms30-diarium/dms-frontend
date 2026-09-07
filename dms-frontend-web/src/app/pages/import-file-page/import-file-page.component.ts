import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { PdfViewerComponent } from '@app/shared/components/pdf-viewer/pdf-viewer.component';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiDialog } from '@designsystem-se/af-angular';
import { ButtonMenuComponent, ActionButton } from '@app/shared/components/button-menu.component/button-menu.component';
import { createButton } from '@app/shared/components/button-menu.component/button-presets';
import { CreateHandlingFromMail } from '@app/shared/components/forms/create-handling-from-mail/create-handling-from-mail.component';
import { Option } from '@app/shared/commonTypes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-import-file-page',
  standalone: true,
  imports: [
    RouterModule,
    PdfViewerComponent,
    NavigationBreadComponent,
    ButtonMenuComponent,
    DigiDialog,
    CreateHandlingFromMail,
  ],
  templateUrl: './import-file-page.component.html',
})
export class ImportFilePageComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  document = input.required<NuxeoDocument>();
  reloadDocument = output();
  private nuxeoApi = inject(NuxeoApiService);
  isCreatingHandling = false;
  isCreateHandlingOpen = signal(false);
  attachmentsOptions = signal<Option[]>([]);

  buttons: ActionButton[] = [
    createButton('extractData', () => this.extractData()),
    createButton('createHandling', () => this.isCreateHandlingOpen.set(true)),
  ];

  constructor() {
    effect(() => {
      const currentDocument = this.document();
      const fileContent = currentDocument.properties?.[NUXEO_SCHEMA_FIELDS.file.content];
      const fileName =
        (fileContent && typeof fileContent.name === 'string' && fileContent.name) ||
        (typeof currentDocument.title === 'string' ? currentDocument.title : '');

      const options: Option[] = fileName
        ? [
            {
              id: 'main-file',
              label: fileName,
            },
          ]
        : [];

      this.attachmentsOptions.set(options);
    });
  }

  getDate(value: unknown): string {
    if (value instanceof Date || typeof value === 'string' || value === null || value === undefined) {
      return formatDateOrMissing(value);
    }

    return '';
  }

  getExtractedData(): Record<string, unknown> | null {
    const data = this.document().properties?.[NUXEO_SCHEMA_FIELDS.import.extraheradeData];
    return data && typeof data === 'object' ? data : null;
  }

  getArendenummer(): string {
    const data = this.getExtractedData();
    if (!data) return '(saknas)';
    const arendenummer = data['arendenummer'];
    if (arendenummer && typeof arendenummer === 'object') {
      const value = (arendenummer as { varde?: string }).varde;
      return value && value.trim().length > 0 ? value : '(saknas)';
    }
    return '(saknas)';
  }

  extractData() {
    const doc = this.document();
    if (!doc.uid) return;

    this.nuxeoApi.extractImportData(doc.uid).subscribe(() => {
      this.reloadDocument.emit();
    });
  }
}
