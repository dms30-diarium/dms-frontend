import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { OrganizationPageComponent } from './organization-page.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { SearchService } from '@app/core/services/search.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NuxeoDocument, OrganisationsdelProperties } from '@app/shared/api/nuxeo-api.types';
import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  ORGANIZATION_CREATE_ERROR_MESSAGE,
  ORGANIZATION_CREATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';

function makeOrgDoc(
  overrides: Partial<OrganisationsdelProperties> = {},
  docOverrides: Record<string, unknown> = {}
): NuxeoDocument<OrganisationsdelProperties> {
  return makeNuxeoDocument<OrganisationsdelProperties>({
    uid: 'org-1',
    title: 'Test Organisation',
    type: 'Organisation',
    path: '/org/path',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.description]: 'Description',
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Organisation',
      [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: undefined,
      [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: [],
      [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: 'ORG001',
      [NUXEO_SCHEMA_FIELDS.organisationsdel.kortnamn]: 'TORG',
      [NUXEO_SCHEMA_FIELDS.organisationsdel.namn]: 'Test Org',
      ...overrides,
    },
    ...docOverrides,
  });
}

function makeSubOrgDoc(overrides: Partial<OrganisationsdelProperties> = {}): NuxeoDocument<OrganisationsdelProperties> {
  return makeOrgDoc(overrides, { type: 'Organisationsdel' });
}

describe('OrganizationPageComponent', () => {
  let component: OrganizationPageComponent;
  let fixture: ComponentFixture<OrganizationPageComponent>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;
  let searchServiceSpy: jasmine.SpyObj<SearchService>;
  let storeSpy: {
    notification: { set: jasmine.Spy };
    navigationPanelContext: jasmine.Spy;
    getValue: jasmine.Spy;
  };

  const defaultDoc = makeOrgDoc();
  const defaultTableConfig: TableColumn[] = [];
  const defaultColumnOptions: TableColOption[] = [];

  beforeEach(async () => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getUserSuggestions',
      'createDocument',
      'editDocument',
      'getDocumentById',
    ]);

    searchServiceSpy = jasmine.createSpyObj('SearchService', ['extractTerm']);
    searchServiceSpy.extractTerm.and.returnValue('');

    storeSpy = {
      notification: { set: jasmine.createSpy('set') },
      navigationPanelContext: jasmine.createSpy('navigationPanelContext').and.returnValue(null),
      getValue: jasmine.createSpy('getValue').and.returnValue(null),
    };

    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));
    nuxeoApiSpy.getUserSuggestions.and.returnValue(of([]));
    nuxeoApiSpy.createDocument.and.returnValue(of(makeNuxeoDocument()));
    nuxeoApiSpy.editDocument.and.returnValue(of(makeNuxeoDocument()));
    nuxeoApiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));

    await TestBed.configureTestingModule({
      imports: [OrganizationPageComponent],
      providers: [
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    })
      .overrideTemplate(OrganizationPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(OrganizationPageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('document', defaultDoc);
    fixture.componentRef.setInput('tableConfig', defaultTableConfig);
    fixture.componentRef.setInput('defaultColumnOptions', defaultColumnOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('computed properties', () => {
    it('isSubOrganization returns false for Organisation type', () => {
      expect(component.isSubOrganization()).toBeFalse();
    });

    it('isSubOrganization returns true for Organisationsdel type', () => {
      fixture.componentRef.setInput('document', makeSubOrgDoc());
      fixture.detectChanges();
      expect(component.isSubOrganization()).toBeTrue();
    });

    it('editHeading returns correct heading for Organisation', () => {
      expect(component.editHeading()).toBe('Redigera Organisation');
    });

    it('editHeading returns correct heading for Organisationsdel', () => {
      fixture.componentRef.setInput('document', makeSubOrgDoc());
      fixture.detectChanges();
      expect(component.editHeading()).toBe('Redigera Organisationsdel');
    });

    it('canEdit returns true when navigationPanelContext is not browse', () => {
      storeSpy.navigationPanelContext.and.returnValue(null);
      expect(component.canEdit()).toBeTrue();
    });

    it('canEdit returns false when navigationPanelContext is browse', () => {
      storeSpy.navigationPanelContext.and.returnValue('browse');
      expect(component.canEdit()).toBeFalse();
    });

    it('props returns document properties', () => {
      expect(component.props()).toEqual(defaultDoc.properties);
    });
  });

  describe('openCreate / closeCreate', () => {
    it('openCreate sets isCreateDialogOpen to true and loads user suggestions', () => {
      component.openCreate();
      expect(component.isCreateDialogOpen()).toBeTrue();
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalled();
    });

    it('closeCreate sets isCreateDialogOpen to false', () => {
      component.isCreateDialogOpen.set(true);
      component.closeCreate();
      expect(component.isCreateDialogOpen()).toBeFalse();
    });
  });

  describe('openEdit / closeEdit', () => {
    it('openEdit sets isEditOpen to true for Organisation', () => {
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
    });

    it('openEdit loads user suggestions for Organisationsdel', () => {
      fixture.componentRef.setInput('document', makeSubOrgDoc());
      fixture.detectChanges();
      nuxeoApiSpy.getUserSuggestions.calls.reset();
      component.openEdit();
      expect(component.isEditOpen()).toBeTrue();
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalled();
    });

    it('closeEdit sets isEditOpen to false', () => {
      component.isEditOpen.set(true);
      component.closeEdit();
      expect(component.isEditOpen()).toBeFalse();
    });
  });

  describe('updateDropdownValues', () => {
    it('does nothing for non-user fields', () => {
      searchServiceSpy.extractTerm.calls.reset();
      nuxeoApiSpy.getUserSuggestions.calls.reset();
      component.updateDropdownValues({ fieldName: 'description', value: 'something' });
      expect(nuxeoApiSpy.getUserSuggestions).not.toHaveBeenCalled();
    });

    it('loads user suggestions for ansvarig field', () => {
      nuxeoApiSpy.getUserSuggestions.calls.reset();
      searchServiceSpy.extractTerm.and.returnValue('searchTerm');
      component.updateDropdownValues({ fieldName: 'ansvarig', value: 'searchTerm' });
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalledWith('searchTerm');
    });

    it('loads user suggestions for anvandare field', () => {
      nuxeoApiSpy.getUserSuggestions.calls.reset();
      searchServiceSpy.extractTerm.and.returnValue('term');
      component.updateDropdownValues({ fieldName: 'anvandare', value: 'term' });
      expect(nuxeoApiSpy.getUserSuggestions).toHaveBeenCalledWith('term');
    });
  });

  describe('submitCreate / submitEdit', () => {
    it('submitCreate does not throw when createForm is not set', () => {
      expect(() => component.submitCreate()).not.toThrow();
    });

    it('submitEdit does not throw when editForm is not set', () => {
      expect(() => component.submitEdit()).not.toThrow();
    });
  });

  describe('saveCreate', () => {
    beforeEach(() => {
      const form = new FormGroup({});
      spyOn(form, 'getRawValue').and.returnValue({
        description: 'Desc',
        code: 'C001',
        shortName: 'Short',
        name: 'Full Name',
        ansvarig: [{ id: 'user1' }],
        anvandare: [{ id: 'user2' }],
      });
      (component as unknown as { createForm: Partial<GeneralFormComponent> }).createForm = {
        form,
        submit: jasmine.createSpy('submit'),
      };
    });

    it('calls createDocument with correct payload', () => {
      component.saveCreate();
      expect(nuxeoApiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: 'Organisationsdel', name: 'C001 Full Name' }),
        defaultDoc.path
      );
    });

    it('shows success notification on create success', () => {
      component.saveCreate();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'success',
          text: ORGANIZATION_CREATE_SUCCESS_MESSAGE,
        })
      );
    });

    it('closes dialog after create success', () => {
      component.isCreateDialogOpen.set(true);
      component.saveCreate();
      expect(component.isCreateDialogOpen()).toBeFalse();
    });

    it('emits organizationCreated event on success', () => {
      const emitSpy = spyOn(component.organizationCreated, 'emit');
      component.saveCreate();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('shows error notification on create failure', () => {
      nuxeoApiSpy.createDocument.and.returnValue(throwError(() => new Error('fail')));
      component.saveCreate();
      expect(storeSpy.notification.set).toHaveBeenCalledWith(
        jasmine.objectContaining({
          show: true,
          variation: 'danger',
          text: ORGANIZATION_CREATE_ERROR_MESSAGE,
        })
      );
    });

    it('sets isSaving to false on create failure', () => {
      nuxeoApiSpy.createDocument.and.returnValue(throwError(() => new Error('fail')));
      component.saveCreate();
      expect(component.isSaving()).toBeFalse();
    });
  });

  describe('saveEdits', () => {
    describe('Organisation (not sub)', () => {
      beforeEach(() => {
        const form = new FormGroup({});
        spyOn(form, 'getRawValue').and.returnValue({
          title: 'New Title',
          description: 'New Desc',
        });
        (component as unknown as { editForm: Partial<GeneralFormComponent> }).editForm = {
          form,
          submit: jasmine.createSpy('submit'),
        };
      });

      it('calls editDocument and then getDocumentById', () => {
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ title: 'New Title' })));
        component.saveEdits();
        expect(nuxeoApiSpy.editDocument).toHaveBeenCalledWith(defaultDoc.uid, jasmine.any(Object));
        expect(nuxeoApiSpy.getDocumentById).toHaveBeenCalledWith(defaultDoc.uid);
      });

      it('shows success notification after update', () => {
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ title: 'New Title' })));
        component.saveEdits();
        expect(storeSpy.notification.set).toHaveBeenCalledWith(
          jasmine.objectContaining({
            show: true,
            variation: 'success',
          })
        );
      });

      it('emits documentUpdated event on success', () => {
        const emitSpy = spyOn(component.documentUpdated, 'emit');
        const updatedDoc = makeNuxeoDocument({ title: 'New Title' });
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(updatedDoc));
        component.saveEdits();
        expect(emitSpy).toHaveBeenCalledWith(updatedDoc);
      });

      it('closes edit panel on success', () => {
        component.isEditOpen.set(true);
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
        component.saveEdits();
        expect(component.isEditOpen()).toBeFalse();
      });

      it('shows error notification on update failure', () => {
        nuxeoApiSpy.editDocument.and.returnValue(throwError(() => new Error('fail')));
        component.saveEdits();
        expect(storeSpy.notification.set).toHaveBeenCalledWith(
          jasmine.objectContaining({
            show: true,
            variation: 'danger',
          })
        );
      });

      it('sets isSaving to false on update failure', () => {
        nuxeoApiSpy.editDocument.and.returnValue(throwError(() => new Error('fail')));
        component.saveEdits();
        expect(component.isSaving()).toBeFalse();
      });
    });

    describe('Organisationsdel (sub)', () => {
      beforeEach(() => {
        fixture.componentRef.setInput(
          'document',
          makeSubOrgDoc({
            [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'user1',
            [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: ['user2', 'user3'],
          })
        );
        fixture.detectChanges();

        const form = new FormGroup({});
        spyOn(form, 'getRawValue').and.returnValue({
          description: 'Desc',
          code: 'C001',
          shortName: 'Short',
          name: 'Full',
          ansvarig: [{ id: 'user1' }],
          anvandare: [{ id: 'user2' }],
        });
        (component as unknown as { editForm: Partial<GeneralFormComponent> }).editForm = {
          form,
          submit: jasmine.createSpy('submit'),
        };
      });

      it('calls editDocument with organisationsdel fields', () => {
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(makeSubOrgDoc()));
        component.saveEdits();
        expect(nuxeoApiSpy.editDocument).toHaveBeenCalledWith(
          'org-1',
          jasmine.objectContaining({
            [NUXEO_SCHEMA_FIELDS.organisationsdel.kod]: 'C001',
          })
        );
      });

      it('updates userOptions after save from document', () => {
        const updatedDoc = makeSubOrgDoc({
          [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'user1',
          [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: ['user2'],
        });
        nuxeoApiSpy.editDocument.and.returnValue(of({} as unknown as NuxeoDocument));
        nuxeoApiSpy.getDocumentById.and.returnValue(of(updatedDoc));
        component.saveEdits();
        const options = component.userOptions();
        expect(options.some(o => o.id === 'user1')).toBeTrue();
      });
    });
  });

  describe('editConfig computed', () => {
    it('returns Organisation edit config when not sub', () => {
      const config = component.editConfig();
      const keys = config.map(f => f.name);
      expect(keys).toContain('title');
      expect(keys).toContain('description');
      expect(keys).not.toContain('code');
    });

    it('returns Organisationsdel edit config when sub', () => {
      fixture.componentRef.setInput(
        'document',
        makeSubOrgDoc({
          [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'user1',
          [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: ['user2'],
        })
      );
      fixture.detectChanges();
      const config = component.editConfig();
      const keys = config.map(f => f.name);
      expect(keys).toContain('code');
      expect(keys).toContain('shortName');
      expect(keys).toContain('name');
      expect(keys).toContain('ansvarig');
      expect(keys).toContain('anvandare');
    });

    it('sets ansvarig default to empty array when ansvarig is not set', () => {
      fixture.componentRef.setInput(
        'document',
        makeSubOrgDoc({
          [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: undefined,
        })
      );
      fixture.detectChanges();
      const config = component.editConfig();
      const ansvarigField = config.find(f => f.name === 'ansvarig');
      expect(ansvarigField?.defaultValue).toEqual([]);
    });

    it('sets ansvarig default to [{id, label}] when ansvarig is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeSubOrgDoc({
          [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'user1',
        })
      );
      fixture.detectChanges();
      const config = component.editConfig();
      const ansvarigField = config.find(f => f.name === 'ansvarig');
      expect(ansvarigField?.defaultValue).toEqual([{ id: 'user1', label: 'user1' }]);
    });
  });

  describe('createFormConfig computed', () => {
    it('contains all expected fields', () => {
      const config = component.createFormConfig();
      const keys = config.map(f => f.name);
      expect(keys).toContain('description');
      expect(keys).toContain('code');
      expect(keys).toContain('shortName');
      expect(keys).toContain('name');
      expect(keys).toContain('ansvarig');
      expect(keys).toContain('anvandare');
    });
  });

  describe('getUserSuggestions sets userOptions', () => {
    it('merges document user options with suggestions', () => {
      const subDoc = makeSubOrgDoc({
        [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'docUser',
        [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: [],
      });
      fixture.componentRef.setInput('document', subDoc);
      fixture.detectChanges();

      nuxeoApiSpy.getUserSuggestions.and.returnValue(
        of([{ id: 'sugUser', displayLabel: 'Suggested User', 'entity-type': 'userEntry' as const }])
      );

      component.openEdit();
      const options = component.userOptions();
      expect(options.some(o => o.id === 'docUser')).toBeTrue();
      expect(options.some(o => o.id === 'sugUser')).toBeTrue();
    });

    it('deduplicates options by id', () => {
      const subDoc = makeSubOrgDoc({
        [NUXEO_SCHEMA_FIELDS.organisationsdel.ansvarig]: 'sharedUser',
        [NUXEO_SCHEMA_FIELDS.organisationsdel.anvandare]: [],
      });
      fixture.componentRef.setInput('document', subDoc);
      fixture.detectChanges();

      nuxeoApiSpy.getUserSuggestions.and.returnValue(
        of([{ id: 'sharedUser', displayLabel: 'Shared User', 'entity-type': 'userEntry' as const }])
      );

      component.openEdit();
      const options = component.userOptions();
      const sharedCount = options.filter(o => o.id === 'sharedUser').length;
      expect(sharedCount).toBe(1);
    });
  });
});
