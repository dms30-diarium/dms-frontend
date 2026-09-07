import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DirectoryOptionsService } from './directory-options.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Option } from '@app/shared/commonTypes';

describe('DirectoryOptionsService', () => {
  let service: DirectoryOptionsService;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;

  const natureEntries = [{ computedId: 'nature1', properties: { label: 'label.nature.key1' } }];
  const subjectEntries = [
    { computedId: 'sub1', absoluteLabel: 'Subject 1' },
    { id: 'grp1', children: [{ computedId: 'sub2', absoluteLabel: 'Child Subject' }] },
  ];
  const coverageEntries = [{ computedId: 'cov1', displayLabel: 'Coverage 1' }];

  beforeEach(() => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', ['getDirectorySuggestions', 'getMessagesJSON']);
    nuxeoApiSpy.getDirectorySuggestions.and.callFake((vocab: string) => {
      if (vocab === 'nature') return of(natureEntries) as never;
      if (vocab === 'l10nsubjects') return of(subjectEntries) as never;
      if (vocab === 'l10ncoverage') return of(coverageEntries) as never;
      return of([]) as never;
    });
    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [DirectoryOptionsService, GeneralStore, { provide: NuxeoApiService, useValue: nuxeoApiSpy }],
    });
    service = TestBed.inject(DirectoryOptionsService);
  });

  it('getSubjectOptions returns mapped options', done => {
    service.getSubjectOptions().subscribe((options: Option[]) => {
      expect(options.some(o => o.id === 'sub1')).toBeTrue();
      expect(options.some(o => o.id === 'sub2')).toBeTrue();
      done();
    });
  });

  it('getCoverageOptions returns mapped options', done => {
    service.getCoverageOptions().subscribe((options: Option[]) => {
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].id).toBe('cov1');
      done();
    });
  });
});
