import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { AccordionComponent } from '@app/shared/components/accordion/accordion.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const EXTRA_FIELDS_TYPES = new Set(['Domain', 'WorkspaceRoot', 'TemplateRoot', 'SectionRoot']);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-entity-overview',
  standalone: true,
  imports: [AccordionComponent],
  templateUrl: './entity-overview.component.html',
})
export class EntityOverviewComponent {
  document = input.required<NuxeoDocument>();
  folderTitle = input.required<string>();
  showTaxonomy = input<boolean | null>(null);

  private readonly props = computed(() => this.document().properties);

  readonly isSubOrganization = computed(() => this.document().type === 'Organisationsdel');
  readonly isMyndighet = computed(() => this.document().type === 'Myndighet');
  readonly isDiarium = computed(() => this.document().type === 'Diarium');

  readonly shouldShowTaxonomyOverview = computed(() => {
    const override = this.showTaxonomy();
    if (override != null) return override;
    return EXTRA_FIELDS_TYPES.has(this.document().type);
  });

  readonly description = computed(() => String(this.props()[NUXEO_SCHEMA_FIELDS.dc.description] ?? ''));
  readonly exportZipDownloadUrl = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.export.exportZip]?.blobUrl ?? '')
  );

  readonly natureLabel = computed(() => {
    const properties = this.props()[NUXEO_SCHEMA_FIELDS.dc.nature]?.properties;
    return String(properties?.label_en ?? properties?.label ?? '');
  });

  readonly subjectLabels = computed(() => {
    return (this.props()[NUXEO_SCHEMA_FIELDS.dc.subjects] ?? [])
      .map(subject => {
        return String(subject.properties?.label_en ?? subject.properties?.label ?? '');
      })
      .filter(Boolean)
      .join(', ');
  });

  readonly coverageLabel = computed(() => {
    const properties = this.props()[NUXEO_SCHEMA_FIELDS.dc.coverage]?.properties;
    const label = String(properties?.label_en ?? properties?.label ?? '');
    const parentProperties = properties?.parent?.properties;
    const parentLabel = String(parentProperties?.label_en ?? parentProperties?.label ?? '');
    return parentLabel && label ? `${parentLabel}/${label}` : parentLabel || label;
  });

  readonly expiresLabel = computed(() => {
    const expires = this.props()[NUXEO_SCHEMA_FIELDS.dc.expired];
    if (!expires) return '';
    return formatDateOrMissing(expires);
  });

  readonly diariumPrefix = computed(() => String(this.props()[NUXEO_SCHEMA_FIELDS.diarium.prefix] ?? ''));
  readonly diariumSuffix = computed(() => String(this.props()[NUXEO_SCHEMA_FIELDS.diarium.suffix] ?? ''));
  readonly diariumLopnummerlangd = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.diarium.lopnummerlangd] ?? '')
  );
  readonly diariumHandlingslopnummerlangd = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.diarium.handlingslopnummerlangd] ?? '')
  );
  readonly myndighetOrganisationsnummer = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.myndighet.organisationsnummer] ?? '')
  );

  readonly organizationCode = computed(() => String(this.props()[NUXEO_SCHEMA_FIELDS.organisationsdel.kod] ?? ''));
  readonly organizationShortName = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn] ?? '')
  );
  readonly organizationName = computed(() => String(this.props()[NUXEO_SCHEMA_FIELDS.organisationsdel.namn] ?? ''));
  readonly organizationResponsible = computed(() =>
    String(this.props()[NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig] ?? '')
  );
  readonly organizationUsers = computed(() => this.props()[NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare] ?? []);
}
