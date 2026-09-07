import { buildEditConfig } from './utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { DirectoryEntry, HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

interface ContactDefaultValue {
  namn: string;
  email: string;
}

function makeDirectoryEntry(id: string): DirectoryEntry {
  return { 'entity-type': 'directoryEntry', id };
}

function makeLagrumDoc(uid: string, title: string): NuxeoDocument {
  return makeNuxeoDocument({ uid, title });
}

function makeHandlingDoc(
  overrides: Partial<HandlingExtendedProperties> = {}
): NuxeoDocument<HandlingExtendedProperties> {
  return makeNuxeoDocument<HandlingExtendedProperties>({
    uid: 'h-1',
    type: 'Handling',
    title: 'Test Handling',
    properties: {
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnummer]: 'H2024-001',
      [NUXEO_SCHEMA_FIELDS.handling.handlingsstatus]: null,
      [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: 'Testnamn',
      [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: null,
      [NUXEO_SCHEMA_FIELDS.handling.sekretess]: null,
      [NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering]: null,
      [NUXEO_SCHEMA_FIELDS.handling.beslutatDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.makuleradDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.arkiveradDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.gallradDatum]: null,
      [NUXEO_SCHEMA_FIELDS.handling.internArendereferens]: [],
      [NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens]: [],
      [NUXEO_SCHEMA_FIELDS.handling.externReferens]: [],
      [NUXEO_SCHEMA_FIELDS.handling.avsandare]: [],
      [NUXEO_SCHEMA_FIELDS.handling.mottagare]: [],
      [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]: null,
      [NUXEO_SCHEMA_FIELDS.handling.kommentarer]: null,
      [NUXEO_SCHEMA_FIELDS.handling.makuleringskommentar]: null,
      [NUXEO_SCHEMA_FIELDS.handling.signerad]: false,
      [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: false,
      [NUXEO_SCHEMA_FIELDS.handling.bevarasGallras]: null,
      [NUXEO_SCHEMA_FIELDS.handling.granskare]: null,
      [NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet]: null,
      [NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]: null,
      [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: null,
      [NUXEO_SCHEMA_FIELDS.handling.forvaringsmedia]: null,
      [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]: null,
      [NUXEO_SCHEMA_FIELDS.handling.digitaltOriginal]: null,
      ...overrides,
    } as HandlingExtendedProperties,
  });
}

const EMPTY_SUGGESTIONS: Record<string, Option[]> = {
  handlingssteg: [],
  beslutsfattare: [],
  handlingType: [],
  riktning: [],
  forvaringsmedia: [],
  secret: [],
  secretClass: [],
  lagrum: [],
  bevaras: [],
  granskare: [],
  ansvarigOrg: [],
};

describe('buildEditConfig (handling-page utils)', () => {
  it('returns an array of EditGroups', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    expect(Array.isArray(result)).toBeTrue();
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes overview group first', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    expect(result[0].groupId).toBe('overview');
  });

  it('includes handlingDetails group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('handlingDetails');
  });

  it('includes secret group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('secret');
  });

  describe('lagrumsbeskrivning visibility follows sekretess', () => {
    function lagrumField(sekretessId: string | null) {
      const doc = makeHandlingDoc({
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: sekretessId ? makeDirectoryEntry(sekretessId) : null,
      } as Partial<HandlingExtendedProperties>);
      const groups = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      return groups
        .find(group => group.groupId === 'secret')
        ?.groupFields.find(field => field.name === 'lagrumsbeskrivning');
    }

    it('shows lagrumsbeskrivning for Svag sekretess', () => {
      expect(lagrumField(NUXEO_VOCAB_IDS.sekretess.svagSekretess)?.isHidden).toBeFalse();
    });

    it('shows lagrumsbeskrivning for Stark sekretess', () => {
      expect(lagrumField(NUXEO_VOCAB_IDS.sekretess.starkSekretess)?.isHidden).toBeFalse();
    });

    it('hides lagrumsbeskrivning for Ingen sekretess', () => {
      expect(lagrumField(NUXEO_VOCAB_IDS.sekretess.ingenSekretess)?.isHidden).toBeTrue();
    });

    it('hides lagrumsbeskrivning when sekretess is not set', () => {
      expect(lagrumField(null)?.isHidden).toBeTrue();
    });
  });

  it('includes bevaras group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('bevaras');
  });

  it('includes comment group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('comment');
  });

  it('includes actor group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('actor');
  });

  it('includes customMetadata group', () => {
    const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
    const ids = result.map(g => g.groupId);
    expect(ids).toContain('customMetadata');
  });

  describe('overview group fields', () => {
    it('has handlingsnummer static-text field with correct value', () => {
      const doc = makeHandlingDoc({ [NUXEO_SCHEMA_FIELDS.handling.handlingsnummer]: 'H2024-042' });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const overviewGroup = result.find(g => g.groupId === 'overview')!;
      const numField = overviewGroup.groupFields.find(f => f.name === 'handlingsnummer');
      expect(numField?.defaultValue).toBe('H2024-042');
    });

    it('sets currentHandlingState as defaultValue for handlingssteg', () => {
      const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS, { id: 'step-2', label: 'Next' });
      const overviewGroup = result.find(g => g.groupId === 'overview')!;
      const stegField = overviewGroup.groupFields.find(f => f.name === 'handlingssteg');
      expect(stegField?.defaultValue).toBe('step-2');
    });

    it('sets null defaultValue for handlingssteg when not provided', () => {
      const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
      const overviewGroup = result.find(g => g.groupId === 'overview')!;
      const stegField = overviewGroup.groupFields.find(f => f.name === 'handlingssteg');
      expect(stegField?.defaultValue).toBeUndefined();
    });

    it('parses beslutatDatum into Date array when set', () => {
      const doc = makeHandlingDoc({ [NUXEO_SCHEMA_FIELDS.handling.beslutatDatum]: '2024-06-01' });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const overviewGroup = result.find(g => g.groupId === 'overview')!;
      const dateField = overviewGroup.groupFields.find(f => f.name === 'beslutDate');
      expect(Array.isArray(dateField?.defaultValue)).toBeTrue();
      expect((dateField?.defaultValue as Date[])[0]).toBeInstanceOf(Date);
    });

    it('sets null for beslutDate when no beslutatDatum', () => {
      const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
      const overviewGroup = result.find(g => g.groupId === 'overview')!;
      const dateField = overviewGroup.groupFields.find(f => f.name === 'beslutDate');
      expect(dateField?.defaultValue).toBeNull();
    });
  });

  describe('secret group — lagrum visibility', () => {
    it('hides lagrum field when no sekretess', () => {
      const result = buildEditConfig(makeHandlingDoc(), EMPTY_SUGGESTIONS);
      const secretGroup = result.find(g => g.groupId === 'secret')!;
      const lagrumField = secretGroup.groupFields.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeTrue();
    });

    it('shows lagrum field for svagSekretess', () => {
      const doc = makeHandlingDoc({
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: makeDirectoryEntry(NUXEO_VOCAB_IDS.sekretess.svagSekretess),
      });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const secretGroup = result.find(g => g.groupId === 'secret')!;
      const lagrumField = secretGroup.groupFields.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeFalse();
    });

    it('shows lagrum field for starkSekretess', () => {
      const doc = makeHandlingDoc({
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: makeDirectoryEntry(NUXEO_VOCAB_IDS.sekretess.starkSekretess),
      });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const secretGroup = result.find(g => g.groupId === 'secret')!;
      const lagrumField = secretGroup.groupFields.find(f => f.name === 'lagrumsbeskrivning');
      expect(lagrumField?.isHidden).toBeFalse();
    });

    it('prefills lagrumsbeskrivning from doc when set', () => {
      const doc = makeHandlingDoc({
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: makeDirectoryEntry(NUXEO_VOCAB_IDS.sekretess.starkSekretess),
        [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]: makeLagrumDoc('lagrum-1', 'Lagrum 1'),
      });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const secretGroup = result.find(g => g.groupId === 'secret')!;
      const lagrumField = secretGroup.groupFields.find(f => f.name === 'lagrumsbeskrivning');
      expect((lagrumField?.defaultValue as Option[])[0].id).toBe('lagrum-1');
    });
  });

  describe('handlingDetails group', () => {
    it('sets handlingsnamn defaultValue from doc', () => {
      const doc = makeHandlingDoc({ [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: 'Min Handling' });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const detailsGroup = result.find(g => g.groupId === 'handlingDetails')!;
      const nameField = detailsGroup.groupFields.find(f => f.name === 'handlingsnamn');
      expect(nameField?.defaultValue).toBe('Min Handling');
    });

    it('sets signerad checkbox default from doc', () => {
      const doc = makeHandlingDoc({ [NUXEO_SCHEMA_FIELDS.handling.signerad]: true });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const detailsGroup = result.find(g => g.groupId === 'handlingDetails')!;
      const signeradField = detailsGroup.groupFields.find(f => f.name === 'signerad');
      expect(signeradField?.defaultValue).toBeTrue();
    });
  });

  describe('actor group', () => {
    it('maps avsandare contacts to {namn, email} objects', () => {
      const doc = makeHandlingDoc({
        [NUXEO_SCHEMA_FIELDS.handling.avsandare]: [{ namn: 'Alice', epost: 'alice@test.com', adress: '', telefon: '' }],
      });
      const result = buildEditConfig(doc, EMPTY_SUGGESTIONS);
      const actorGroup = result.find(g => g.groupId === 'actor')!;
      const avsField = actorGroup.groupFields.find(f => f.name === 'avsandare');
      const contacts = avsField?.defaultValue as ContactDefaultValue[];
      expect(contacts[0].namn).toBe('Alice');
      expect(contacts[0].email).toBe('alice@test.com');
    });
  });
});
