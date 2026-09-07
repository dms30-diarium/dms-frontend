import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ArendeExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiBadgeStatus } from '@designsystem-se/af-angular';
import { CasesService } from '@app/core/services/cases.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { Option } from '@app/shared/commonTypes';

import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-case-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-overview.component.html',
  imports: [DigiBadgeStatus],
})
export class CaseOverviewComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  doc = input.required<NuxeoDocument<ArendeExtendedProperties>>();
  readonly store = inject(GeneralStore);
  props = computed(() => this.doc().properties);
  caseStateLabel = input<Option>();
  readonly casesService = inject(CasesService);
  private readonly nuxeoApi = inject(NuxeoApiService);

  // Nuxeo doesn't resolve arende:motpart/typ to a DirectoryEntry (it's a sub-field of a
  // complex-type property, not a top-level directory xpath), so the label is looked up client-side.
  private readonly motpartTypeOptions = toSignal(
    this.nuxeoApi.getDirectorySuggestions('MotpartTyp').pipe(
      map(
        res =>
          res?.map(el => ({
            label: el.displayLabel === 'Private Person' ? 'Privatperson' : el.displayLabel,
            id: el.id,
          })) ?? []
      )
    ),
    { initialValue: [] as Option[] }
  );

  motpartTypeLabel = computed(() => {
    const typ = this.props()[this.schemaFields.arende.motpart]?.typ as unknown;
    const typId = typeof typ === 'string' ? typ : (typ as { id?: string } | null | undefined)?.id;
    return this.motpartTypeOptions().find(opt => opt.id === typId)?.label ?? '';
  });

  getDate(value: string | Date | null | undefined): string {
    return formatDateOrMissing(value);
  }
}
