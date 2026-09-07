import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GetOptionsService } from './get-options.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeDirection } from '@app/shared/testing/mock-factories';
import { DirectoryEntriesResponse } from '@app/shared/api/nuxeo-api.types';

describe('GetOptionsService', () => {
  let service: GetOptionsService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'getDirectoryEntries',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        GetOptionsService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(GetOptionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('suggestEntries', () => {
    it('maps directory suggestions to options', done => {
      apiSpy.getDirectorySuggestions.and.returnValue(
        of([makeDirection({ id: 'a', label: 'Option A' }), makeDirection({ id: 'b', label: 'Option B' })])
      );

      service.suggestEntries('MyDirectory').subscribe(options => {
        expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('MyDirectory');
        expect(options).toEqual([
          { id: 'a', label: 'Option A' },
          { id: 'b', label: 'Option B' },
        ]);
        done();
      });
    });

    it('falls back to an empty label when missing', done => {
      apiSpy.getDirectorySuggestions.and.returnValue(of([makeDirection({ id: 'a', label: '' })]));

      service.suggestEntries('MyDirectory').subscribe(options => {
        expect(options).toEqual([{ id: 'a', label: '' }]);
        done();
      });
    });
  });

  describe('directoryEntriesOptions', () => {
    it('maps directory entries to options', done => {
      const response: DirectoryEntriesResponse = {
        'entity-type': 'directoryEntries',
        entries: [
          { 'entity-type': 'directoryEntry', id: 'x', properties: { label: 'Entry X' } },
          { 'entity-type': 'directoryEntry', id: 'y', properties: { label: 'Entry Y' } },
        ],
      };
      apiSpy.getDirectoryEntries.and.returnValue(of(response));

      service.directoryEntriesOptions('MyDirectory').subscribe(options => {
        expect(apiSpy.getDirectoryEntries).toHaveBeenCalledWith('MyDirectory', 0);
        expect(options).toEqual([
          { id: 'x', label: 'Entry X' },
          { id: 'y', label: 'Entry Y' },
        ]);
        done();
      });
    });

    it('returns an empty array when there are no entries', done => {
      apiSpy.getDirectoryEntries.and.returnValue(of({ 'entity-type': 'directoryEntries' }));

      service.directoryEntriesOptions('MyDirectory').subscribe(options => {
        expect(options).toEqual([]);
        done();
      });
    });

    it('falls back to empty id and label when missing on an entry', done => {
      apiSpy.getDirectoryEntries.and.returnValue(
        of({
          'entity-type': 'directoryEntries',
          entries: [{ 'entity-type': 'directoryEntry' }],
        })
      );

      service.directoryEntriesOptions('MyDirectory').subscribe(options => {
        expect(options).toEqual([{ id: '', label: '' }]);
        done();
      });
    });
  });
});
