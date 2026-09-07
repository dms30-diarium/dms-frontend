import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EntityOverviewComponent } from './entity-overview.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { DirectoryEntry, DirectoryProperties, NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';

function makeDoc(type: string, properties: NuxeoProperties = {}): NuxeoDocument {
  return { uid: 'd-1', type, title: 'T', properties } as NuxeoDocument;
}

function makeEntry(properties: DirectoryProperties): DirectoryEntry {
  return { 'entity-type': 'directoryEntry', id: properties.label, properties };
}

describe('EntityOverviewComponent', () => {
  let component: EntityOverviewComponent;
  let fixture: ComponentFixture<EntityOverviewComponent>;

  function setup(doc: NuxeoDocument, showTaxonomy?: boolean | null) {
    fixture = TestBed.createComponent(EntityOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', doc);
    fixture.componentRef.setInput('folderTitle', 'Folder');
    if (showTaxonomy !== undefined) {
      fixture.componentRef.setInput('showTaxonomy', showTaxonomy);
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityOverviewComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(EntityOverviewComponent, '<div></div>')
      .compileComponents();

    setup(makeDoc('Workspace'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('type checks', () => {
    it('isSubOrganization true for Organisationsdel', () => {
      setup(makeDoc('Organisationsdel'));
      expect(component.isSubOrganization()).toBeTrue();
    });

    it('isMyndighet true for Myndighet', () => {
      setup(makeDoc('Myndighet'));
      expect(component.isMyndighet()).toBeTrue();
    });

    it('isDiarium true for Diarium', () => {
      setup(makeDoc('Diarium'));
      expect(component.isDiarium()).toBeTrue();
    });

    it('isSubOrganization false for unrelated type', () => {
      expect(component.isSubOrganization()).toBeFalse();
    });
  });

  describe('shouldShowTaxonomyOverview', () => {
    it('true for Domain type by default', () => {
      setup(makeDoc('Domain'));
      expect(component.shouldShowTaxonomyOverview()).toBeTrue();
    });

    it('false for Workspace type by default', () => {
      expect(component.shouldShowTaxonomyOverview()).toBeFalse();
    });

    it('overridden by showTaxonomy input when set true', () => {
      setup(makeDoc('Workspace'), true);
      expect(component.shouldShowTaxonomyOverview()).toBeTrue();
    });

    it('overridden by showTaxonomy input when set false', () => {
      setup(makeDoc('Domain'), false);
      expect(component.shouldShowTaxonomyOverview()).toBeFalse();
    });
  });

  describe('description', () => {
    it('returns dc:description value', () => {
      setup(makeDoc('Workspace', { [NUXEO_SCHEMA_FIELDS.dc.description]: 'My description' }));
      expect(component.description()).toBe('My description');
    });

    it('returns empty string when missing', () => {
      expect(component.description()).toBe('');
    });
  });

  describe('natureLabel', () => {
    it('returns label_en when present', () => {
      setup(
        makeDoc('Workspace', {
          [NUXEO_SCHEMA_FIELDS.dc.nature]: makeEntry({ label_en: 'EN Label', label: 'SE Label' }),
        })
      );
      expect(component.natureLabel()).toBe('EN Label');
    });

    it('falls back to label when label_en missing', () => {
      setup(
        makeDoc('Workspace', {
          [NUXEO_SCHEMA_FIELDS.dc.nature]: makeEntry({ label: 'SE Label' }),
        })
      );
      expect(component.natureLabel()).toBe('SE Label');
    });
  });

  describe('subjectLabels', () => {
    it('joins multiple subjects', () => {
      setup(
        makeDoc('Workspace', {
          [NUXEO_SCHEMA_FIELDS.dc.subjects]: [makeEntry({ label: 'A' }), makeEntry({ label: 'B' })],
        })
      );
      expect(component.subjectLabels()).toBe('A, B');
    });

    it('returns empty string when no subjects', () => {
      expect(component.subjectLabels()).toBe('');
    });
  });

  describe('coverageLabel', () => {
    it('combines parent and label', () => {
      setup(
        makeDoc('Workspace', {
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: {
            properties: { label: 'City', parent: makeEntry({ label: 'Country' }) },
            'entity-type': 'directoryEntry',
            id: 'City',
          },
        })
      );
      expect(component.coverageLabel()).toBe('Country/City');
    });

    it('returns just label when no parent', () => {
      setup(
        makeDoc('Workspace', {
          [NUXEO_SCHEMA_FIELDS.dc.coverage]: makeEntry({ label: 'City' }),
        })
      );
      expect(component.coverageLabel()).toBe('City');
    });
  });

  describe('expiresLabel', () => {
    it('returns empty when no expires field', () => {
      expect(component.expiresLabel()).toBe('');
    });

    it('returns formatted date when expires present', () => {
      setup(makeDoc('Workspace', { [NUXEO_SCHEMA_FIELDS.dc.expired]: '2024-01-01T00:00:00Z' }));
      expect(component.expiresLabel()).toBeTruthy();
    });
  });

  describe('organization fields', () => {
    it('organizationCode returns kod field', () => {
      setup(makeDoc('Organisationsdel', { [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: 'C1' }));
      expect(component.organizationCode()).toBe('C1');
    });

    it('organizationUsers returns empty array when missing', () => {
      expect(component.organizationUsers()).toEqual([]);
    });
  });
});
