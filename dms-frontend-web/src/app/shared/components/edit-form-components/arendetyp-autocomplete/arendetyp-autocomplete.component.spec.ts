import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ArendetypAutocompleteComponent } from './arendetyp-autocomplete.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeSearchResult, makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { ArendeTypOption } from '@app/pages/case-page/case-types';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';

describe('ArendetypAutocompleteComponent', () => {
  let component: ArendetypAutocompleteComponent;
  let fixture: ComponentFixture<ArendetypAutocompleteComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'DMSDocumentSuggestion']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.DMSDocumentSuggestion.and.returnValue(of(makeSearchResult({ entries: [] })));

    await TestBed.configureTestingModule({
      imports: [ArendetypAutocompleteComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(ArendetypAutocompleteComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ArendetypAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docType', 'Arende');
    fixture.componentRef.setInput('parentRef', 'parent-1');
    fixture.componentRef.setInput('tableFields', signal<ArendeTypOption[]>([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads options when parentRef is set', () => {
    expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Klass', 'Arende', '');
  });

  it('clears options when parentRef is empty', () => {
    fixture.componentRef.setInput('parentRef', '');
    fixture.detectChanges();
    expect(component.options()).toEqual([]);
  });

  describe('onDropdownInputChange', () => {
    it('fetches new options for the search term', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      const event = { detail: 'klass' } as DigiFormSelectFilterCustomEvent<string>;
      component.onDropdownInputChange(event);
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Klass', 'Arende', 'klass');
    });

    it('clears options when there is no parentRef', () => {
      fixture.componentRef.setInput('parentRef', '');
      const event = { detail: 'klass' } as DigiFormSelectFilterCustomEvent<string>;
      component.onDropdownInputChange(event);
      expect(component.options()).toEqual([]);
    });
  });

  describe('getNewOptions', () => {
    it('maps document suggestion entries to options', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'k-1', title: 'Klass 1', path: '/k1' })] }))
      );
      component.getNewOptions('klass');
      expect(component.options()).toEqual([jasmine.objectContaining({ label: 'Klass 1', id: 'k-1', value: 'k-1' })]);
    });
  });

  describe('onSelect', () => {
    it('updates the bound table fields signal', () => {
      const tableFields = signal<ArendeTypOption[]>([]);
      fixture.componentRef.setInput('tableFields', tableFields);
      const selected: ArendeTypOption[] = [{ label: 'Klass 1', id: 'k-1', value: 'k-1' }];
      const event = { detail: selected } as DigiFormSelectFilterCustomEvent<ArendeTypOption[]>;

      component.onSelect(event);

      expect(tableFields()).toEqual(selected);
    });
  });
});
