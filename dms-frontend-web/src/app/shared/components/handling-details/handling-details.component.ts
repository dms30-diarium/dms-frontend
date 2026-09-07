import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { JoinFieldsPipe } from '@app/shared/pipes/join-fields.pipe';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { Option } from '@app/shared/commonTypes';
import { GeneralStore } from '@app/core/services/general-store.service';

@Component({
  selector: 'nuxeo-handling-details',
  templateUrl: './handling-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, JoinFieldsPipe],
})
export class HandlingDetailsComponent {
  protected readonly schemaFields = NUXEO_SCHEMA_FIELDS;
  protected readonly store = inject(GeneralStore);
  doc = input.required<NuxeoDocument<HandlingExtendedProperties>>();
  currentState = input<Option | undefined>(undefined);
  properties = computed(() => this.doc().properties);
  getDate(date: unknown): string {
    return formatDateOrMissing(date);
  }
}
