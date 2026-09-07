import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-case-details',
  templateUrl: './case-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './case-details.component.scss',
})
export class CaseDetailsComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  readonly store = inject(GeneralStore);
  doc = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  props = computed(() => this.doc()?.properties);

  readonly nuxeoApi = inject(NuxeoApiService);

  caseType = signal('');
  organization = signal('');

  getDate(value: string | Date | null | undefined): string {
    return formatDateOrMissing(value);
  }

  getGallringsregelTitle(): string {
    const value = this.props()[NUXEO_SCHEMA_FIELDS.arende.gallringsforeskrift];
    return value?.title ?? '';
  }

  shouldShowLagrum(): boolean {
    const sekretessLabel = this.props()[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.properties?.label ?? '';
    const sekretessId = this.props()[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.id ?? '';
    const value = `${sekretessLabel} ${sekretessId}`.toLowerCase();
    return !value.includes('ingen') && !value.includes('ej');
  }

  getBeredningsbeslutTitle(): string {
    return this.props()[NUXEO_SCHEMA_FIELDS.arende.beredningsbeslut]?.title ?? '';
  }
}
