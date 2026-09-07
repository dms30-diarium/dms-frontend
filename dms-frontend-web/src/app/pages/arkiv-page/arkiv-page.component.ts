import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { BackToPersonalButtonComponent } from '@app/shared/components/back-to-personal-button/back-to-personal-button.component';
import { DocumentInfoPanelComponent } from '@app/shared/components/document-info-panel/document-info-panel.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-arkiv-page',
  standalone: true,
  imports: [BackToPersonalButtonComponent, DocumentInfoPanelComponent],
  templateUrl: './arkiv-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArkivPageComponent {
  document = input.required<NuxeoDocument>();
  reloadDocument = output<void>();

  readonly title = computed(
    () => this.document().properties[NUXEO_SCHEMA_FIELDS.dc.title] || this.document().title || this.document().uid
  );
}
