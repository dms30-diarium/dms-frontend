import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DirectoryEntry, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { DigiArbetsformedlingenAngularModule, DigiBadgeStatus } from '@designsystem-se/af-angular';
import { CasesService } from '@app/core/services/cases.service';
import { SecretStampService } from '@app/shared/services/secret-stamp.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-cards-display',
  templateUrl: './cards-display.component.html',
  imports: [DigiArbetsformedlingenAngularModule, DigiBadgeStatus],
})
export class CardsDisplayComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  protected readonly VOCAB_IDS = NUXEO_VOCAB_IDS;
  private casesService = inject(CasesService);
  private secretStampService = inject(SecretStampService);
  readonly store = inject(GeneralStore);
  columns = input<number>(2);
  isEditable = input<boolean>(false);
  cards = input<NuxeoDocument<HandlingExtendedProperties>[]>([]);
  selectedIds = input<string[]>([]);
  itemClick = output<string>();
  selectItem = output<NuxeoDocument<HandlingExtendedProperties>>();
  cardsWithDisplayValues = computed(() =>
    this.cards().map(item => {
      const sekretess = this.getDirectoryValue(item.properties[NUXEO_SCHEMA_FIELDS.handling.sekretess]);

      return {
        ...item,
        secretStampText: this.secretStampService.getSecretStampText(sekretess),
        handlingsriktning: this.getDirectoryValue(item.properties[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]),
      };
    })
  );

  getDate(date: string | Date | undefined | null | unknown): string {
    return formatDateOrMissing(date);
  }

  getDirectoryValue(value: string | DirectoryEntry | null | undefined): string {
    return typeof value === 'string' ? value : value?.id || '';
  }

  getStatusColor(status: string | null | undefined) {
    return this.casesService.getStatusColor(status ?? '', { fallback: 'missing' });
  }

  getStatusVariation(status: string | null | undefined) {
    return this.casesService.getStatusVariation(status ?? '');
  }

  getStatusLabel(status: string | null | undefined): string {
    return this.casesService.getStatusLabel(status ?? '') || '';
  }

  openEditDialog() {
    console.log('Edit dialog opened');
  }
}
