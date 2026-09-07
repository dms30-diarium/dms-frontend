import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-handling-event-log',
  standalone: true,
  templateUrl: './handling-event-log.component.html',
  imports: [],
})
export class HandlingEventLogComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  doc = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  properties = computed(() => this.doc().properties);

  directionInfo = computed(() => {
    const direction = this.properties()[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning];

    if (direction?.id === NUXEO_VOCAB_IDS.arendeRiktning.inkommande) {
      return {
        handlingLabel: 'Inkommen handling',
        dateLabel: 'Inkommen datum',
        directionLabel: direction.properties?.label,
        date: this.properties()[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum],
      };
    }

    if (direction?.id === NUXEO_VOCAB_IDS.arendeRiktning.utgaende) {
      return {
        handlingLabel: 'Upprättad handling',
        dateLabel: 'Upprättad utgående datum',
        directionLabel: direction.properties?.label,
        date: this.properties()[NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum],
      };
    }

    if (direction?.id === NUXEO_VOCAB_IDS.arendeRiktning.intern) {
      return {
        handlingLabel: 'Upprättad handling',
        dateLabel: 'Upprättad intern datum',
        directionLabel: direction.properties?.label,
        date: this.properties()[NUXEO_SCHEMA_FIELDS.handling.upprattadDatum],
      };
    }

    return {
      handlingLabel: 'Inkommen handling',
      dateLabel: 'Inkommen datum',
      directionLabel: direction?.properties?.label,
      date: this.properties()[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum],
    };
  });

  getDate(date: unknown): string {
    return formatDateOrMissing(date);
  }
}
