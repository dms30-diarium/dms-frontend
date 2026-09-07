import {
  ArendeExtendedProperties,
  DirectoryEntry,
  HandlingExtendedProperties,
  NuxeoDocument,
  NxUser,
} from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { EditCaseResult, Suggestions } from './case-types';
import {
  buildEditConfig,
  getDisplayedNames,
  getFormProperties,
  getHandlingTableItems,
  getInternalContacts,
  getMotpartContacts,
  getUtkastExtendedTableItems,
  getUtkastTableItems,
  sortRows,
} from './utils';

const directoryEntry = (id: string, label: string): DirectoryEntry => ({
  'entity-type': 'directoryEntry',
  id,
  properties: { id, label },
});

const userFixture = (id: string, firstName: string, lastName: string): NxUser => ({
  'entity-type': 'user',
  id,
  properties: {
    username: id,
    firstName,
    [NUXEO_SCHEMA_FIELDS.user.firstName]: firstName,
    lastName,
    [NUXEO_SCHEMA_FIELDS.user.lastName]: lastName,
    email: `${id}@example.test`,
    company: 'Unit 1',
  },
});

const documentFixture = <P>(uid: string, title: string, type: string, properties: P): NuxeoDocument<P> => ({
  'entity-type': 'document',
  repository: 'default',
  uid,
  path: `/default-domain/workspaces/${uid}`,
  type,
  name: uid,
  title,
  state: 'open',
  isCheckedOut: true,
  isRecord: false,
  isTrashed: false,
  facets: [],
  schemas: [],
  lastModified: '2026-06-15T10:00:00.000Z',
  properties,
});

describe('case-page utils', () => {
  it('builds edit config from case properties and suggestions', () => {
    const props: ArendeExtendedProperties = {
      [NUXEO_SCHEMA_FIELDS.arende.arendenummer]: 'A-2026-1',
      [NUXEO_SCHEMA_FIELDS.arende.arendemening]: 'A meaningful case sentence',
      [NUXEO_SCHEMA_FIELDS.arende.internArendemening]: 'Internal sentence',
      [NUXEO_SCHEMA_FIELDS.arende.arendestatus]: directoryEntry('open', 'Öppet'),
      [NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]: directoryEntry('active', 'Aktiv'),
      [NUXEO_SCHEMA_FIELDS.arende.riktning]: directoryEntry('in', 'Inkommande'),
      [NUXEO_SCHEMA_FIELDS.arende.sekretess]: directoryEntry(NUXEO_VOCAB_IDS.sekretess.svagSekretess, 'Svag sekretess'),
      [NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]: [documentFixture('lagrum-1', 'Lagrum 1', 'Lagrum', {})],
      [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: documentFixture('type-1', 'Case type', 'Klass', {}),
      [NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]: '2026-06-01T00:00:00.000Z',
    };
    const suggestions: Suggestions = {
      arendesteg: [{ id: 'registered', label: 'Registrerat' }],
      handlaggningsstatus: [{ id: 'active', label: 'Aktiv' }],
      beredningsbeslut: [{ id: 'prep', label: 'Beredning' }],
      beslutTyp: [{ id: 'decision', label: 'Beslut' }],
      caseType: [{ id: 'type-1', value: 'type-1', label: 'Case type' }],
      riktning: [{ id: 'in', label: 'Inkommande' }],
      secret: [{ id: NUXEO_VOCAB_IDS.sekretess.svagSekretess, label: 'Svag sekretess' }],
      secretClass: [{ id: 'none', label: 'Ingen' }],
      bevaras: [{ id: 'bevaras', label: 'Bevaras' }],
      lagrum: [{ id: 'lagrum-1', label: 'Lagrum 1' }],
      userOptions: [{ id: 'alice', label: 'Alice Example' }],
    };

    const config = buildEditConfig(documentFixture('case-1', 'Case 1', 'Arende', props), suggestions);

    expect(config.length).toBeGreaterThan(5);
    expect(config[0].groupFields[0].defaultValue).toBe('A-2026-1');
    expect(config[1].groupFields[0].displayValue).toBe('Case type');
    expect(config[1].groupFields[1].defaultValue).toBe('A meaningful case sentence');
  });

  it('maps handling and draft documents to table rows', () => {
    const handlingProps: HandlingExtendedProperties = {
      [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: documentFixture('type-1', 'Handling type', 'Handlingstyp', {}),
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: 'Decision document',
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnummer]: 'H-1',
      [NUXEO_SCHEMA_FIELDS.handling.arendenummer]: 'A-1',
      [NUXEO_SCHEMA_FIELDS.handling.handlingsstatus]: directoryEntry('done', 'Färdig'),
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: directoryEntry('out', 'Utgående'),
      [NUXEO_SCHEMA_FIELDS.handling.sekretess]: directoryEntry(
        NUXEO_VOCAB_IDS.sekretess.ingenSekretess,
        'Ingen sekretess'
      ),
      [NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering]: directoryEntry('none', 'Ingen'),
      [NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]: userFixture('boss', 'Bo', 'Boss'),
      [NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]: userFixture('owner', 'Olivia', 'Owner'),
      [NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet]: documentFixture(
        'unit-1',
        'Unit 1',
        'Organisationsdel',
        {}
      ),
      [NUXEO_SCHEMA_FIELDS.handling.granskare]: userFixture('reviewer', 'Rita', 'Reviewer'),
      [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: '2026-06-14T00:00:00.000Z',
      [NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]: '2026-06-16T00:00:00.000Z',
      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: [{ namn: 'Sender', epost: '', telefon: '', adress: '' }],
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: [{ namn: 'Recipient', epost: '', telefon: '', adress: '' }],
      [NUXEO_SCHEMA_FIELDS.handling.kommentarer]: 'Comment',
      [NUXEO_SCHEMA_FIELDS.handling.bevarasGallras]: directoryEntry('bevaras', 'Bevaras'),
      [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: true,
      [NUXEO_SCHEMA_FIELDS.handling.signerad]: true,
      [NUXEO_SCHEMA_FIELDS.dc.creator]: userFixture('creator', 'Cora', 'Creator'),
      [NUXEO_SCHEMA_FIELDS.dc.created]: '2026-06-10T00:00:00.000Z',
      [NUXEO_SCHEMA_FIELDS.dc.modified]: '2026-06-11T00:00:00.000Z',
      [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: 'Shelf',
      [NUXEO_SCHEMA_FIELDS.handling.digitaltOriginal]: 'Yes',
    };
    const doc = documentFixture('handling-1', 'Handling 1', 'Handling', handlingProps);

    const handlingRow = getHandlingTableItems(doc);
    const draftRow = getUtkastTableItems(doc);
    const extendedDraftRow = getUtkastExtendedTableItems(doc);

    expect(handlingRow.handlingsnamn).toBe('Decision document');
    expect(handlingRow.status).toBe('Färdig');
    expect(handlingRow.sender).toBe('Sender');
    expect(handlingRow.motpart).toBe('Recipient');
    expect(handlingRow.innehallerPersonuppgifter).toBe('Ja');
    expect(handlingRow.signerad).toBe('Ja');
    expect(draftRow.id).toBe('handling-1');
    expect(extendedDraftRow.riktning).toBe('Utgående');
  });

  it('sorts rows and maps form values to Nuxeo properties', () => {
    const sortedAsc = sortRows(
      [
        { title: 'B', value: 2 },
        { title: 'A', value: 1 },
      ],
      'title',
      'asc'
    );
    const sortedDesc = sortRows(sortedAsc, 'title', 'desc');
    const unchanged = sortRows(sortedAsc, '', 'asc');
    const formResult: EditCaseResult = {
      arendeDetails: {
        arendetyp: 'type-1',
        arendemening: 'Updated case',
        intern: 'Internal update',
        riktning: 'in',
        registered: [new Date('2026-06-01T00:00:00.000Z')],
      },
      secret: {
        gdpr: true,
        secret: NUXEO_VOCAB_IDS.sekretess.svagSekretess,
        secretClass: 'none',
        lagrum: [{ id: 'lagrum-1', label: 'Lagrum 1' }],
      },
      comment: { allmanComment: 'Public', commentJK: 'JK', makulering: '' },
      bevaras: { bevaras: 'bevaras', arkiverat: '', gallrat: '', makulerat: '' },
      actor: {
        motpart: '',
        adress: '',
        epost: '',
        phone: '',
        zip: '',
        organisationsnummer: '',
        motpartTyp: '',
        medhand: '',
        granskare: '',
        ansvarig: '',
        organization: '',
      },
      externContacts: [{ name: 'External', email: 'external@example.test', phone: '1', adress: 'Street' }],
      motpartContacts: [
        {
          motpart: 'Counterparty',
          adress: 'Address',
          epost: 'counterparty@example.test',
          telefon: '2',
          postnummer: '12345',
          typ: 'person',
          organisationsnummer: '556000',
        },
      ],
      internArendereferens: [{ caseRef: 'case-2', type: 'relates', comment: 'Related case' }],
      internHandlingsreferens: [{ caseRef: 'handling-2', type: 'relates', comment: 'Related handling' }],
      externReferens: [{ referens: 'EXT-1', comment: 'External reference' }],
      ansvarig_handlaggare: 'owner',
      beslutsfattare: 'boss',
      granskare: 'reviewer',
      medhandlaggare: 'co-owner',
      arendeTypAutosuggest: [{ id: 'type-1', label: 'Case type' }],
    };

    const properties = getFormProperties(formResult, new Date('2026-06-15T00:00:00.000Z'));

    expect(sortedAsc.map(row => row.title)).toEqual(['A', 'B']);
    expect(sortedDesc.map(row => row.title)).toEqual(['B', 'A']);
    expect(unchanged).toBe(sortedAsc);
    expect(properties[NUXEO_SCHEMA_FIELDS.dc.title]).toBe('Updated case');
    expect(properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]).toBe('type-1');
    expect(properties[NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]).toEqual(['lagrum-1']);
    expect(properties[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]).toBe('owner');
  });

  it('extracts display names and contacts from case properties', () => {
    const responsible = userFixture('responsible', 'Anna', 'Andersson');
    const reviewer = userFixture('reviewer', 'Rita', 'Reviewer');
    const props: ArendeExtendedProperties = {
      [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: responsible,
      [NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]: userFixture('decision', 'Bo', 'Beslut'),
      [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: [userFixture('co', 'Carl', 'Colleague')],
      [NUXEO_SCHEMA_FIELDS.arende.granskare]: [reviewer],
      [NUXEO_SCHEMA_FIELDS.arende.motpart]: {
        typ: { id: 'person', properties: { id: 'person', label: 'Person' } },
        motpart: 'Counterparty',
        organisationsnummer: '556000',
        epost: 'counterparty@example.test',
        adress: 'Address',
        telefon: '2',
        postnummer: '12345',
      },
    };

    expect(getDisplayedNames(responsible)).toBe('Anna Andersson');
    expect(getMotpartContacts(props)[0].motpart).toBe('Counterparty');
    expect(getInternalContacts(props).map(contact => contact.type)).toEqual([
      'Ansvarig handlaggare',
      'Medhandlaggare',
      'Beslutsfattare',
      'Granskare av arendet',
    ]);
  });
});
