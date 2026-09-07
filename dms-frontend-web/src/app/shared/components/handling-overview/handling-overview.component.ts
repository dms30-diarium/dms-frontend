import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiBadgeStatus } from '@designsystem-se/af-angular';
import { CasesService } from '@app/core/services/cases.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { Option } from '@app/shared/commonTypes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-handling-overview',
  templateUrl: './handling-overview.component.html',
  imports: [DigiBadgeStatus],
})
export class HandlingOverviewComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  doc = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  currentHandlingState = input<Option>();
  properties = computed(() => this.doc().properties);
  readonly nuxeoApi = inject(NuxeoApiService);
  readonly store = inject(GeneralStore);
  casesService = inject(CasesService);
  organization = signal('');
  directionInfo = computed(() => {
    const props = this.properties();
    const direction = props[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning];

    const rawId = typeof direction === 'string' ? direction : (direction?.id ?? direction?.properties?.id ?? '');
    const rawLabel = typeof direction === 'string' ? direction : (direction?.properties?.label ?? direction?.id ?? '');

    if (rawId === NUXEO_VOCAB_IDS.arendeRiktning.inkommande) {
      return {
        label: 'Inkommen datum',
        directionLabel: rawLabel || 'Inkommande',
        date: props[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum],
      };
    }

    if (rawId === NUXEO_VOCAB_IDS.arendeRiktning.utgaende) {
      return {
        label: 'Upprättad datum',
        directionLabel: rawLabel || 'Utgående',
        date: props[NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum],
      };
    }

    if (rawId === NUXEO_VOCAB_IDS.arendeRiktning.intern) {
      return {
        label: 'Upprättad datum',
        directionLabel: rawLabel || 'Intern',
        date: props[NUXEO_SCHEMA_FIELDS.handling.upprattadDatum],
      };
    }

    return {
      label: rawLabel || rawId || 'Inkommen datum',
      directionLabel: rawLabel || rawId || 'Inkommen datum',
      date: undefined,
    };
  });
  directionLabel = computed(() => this.directionInfo().directionLabel ?? '');
  directionDateLabel = computed(() => this.directionInfo().label);
  directionDateValue = computed(() => this.getDate(this.directionInfo().date));
  statusValue = computed<string | undefined>(() => {
    const label = this.casesService.getStatusLabel(this.doc().state ?? '');
    return label || undefined;
  });
  statusType = computed(() => {
    return this.casesService.getStatusColor(this.doc().state ?? '', { fallback: 'denied' });
  });
  statusVariation = computed(() => {
    return this.casesService.getStatusVariation(this.doc().state ?? '');
  });

  getDate(date: unknown): string {
    if (typeof date !== 'string' || !date) return '';
    try {
      return new Date(date).toLocaleDateString('sv-SE');
    } catch {
      return '';
    }
  }
}
