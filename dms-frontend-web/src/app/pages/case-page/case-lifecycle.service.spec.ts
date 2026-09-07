import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CaseLifecycleService } from './case-lifecycle.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

function makeDoc(): NuxeoDocument {
  return { uid: 'doc-1', title: 'Doc', type: 'Arende', properties: {} } as NuxeoDocument;
}

describe('CaseLifecycleService', () => {
  let service: CaseLifecycleService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'advanceCaseLifecycle',
      'markCaseReadyToClose',
      'closeCase',
      'editDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.advanceCaseLifecycle.and.returnValue(of(undefined));
    apiSpy.markCaseReadyToClose.and.returnValue(of(undefined));
    apiSpy.closeCase.and.returnValue(of(undefined));
    apiSpy.editDocument.and.returnValue(of(makeDoc()));

    TestBed.configureTestingModule({
      providers: [
        CaseLifecycleService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(CaseLifecycleService);
  });

  describe('transitionToReadyToClose', () => {
    it('advances lifecycle, updates properties, marks ready to close, sets close date', done => {
      service
        .transitionToReadyToClose('case-1', 'oppet', {
          decision: 'godkand',
          decisionDate: '2024-01-01',
          comment: 'Test comment',
          reason: 'Test reason',
        })
        .subscribe(() => {
          expect(apiSpy.advanceCaseLifecycle).toHaveBeenCalled();
          expect(apiSpy.editDocument).toHaveBeenCalledTimes(2);
          expect(apiSpy.markCaseReadyToClose).toHaveBeenCalledWith('case-1');
          done();
        });
    });

    it('skips property update when no options provided', done => {
      service.transitionToReadyToClose('case-1', null).subscribe(() => {
        expect(apiSpy.editDocument).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('skips property update when options have no content', done => {
      service.transitionToReadyToClose('case-1', null, {}).subscribe(() => {
        expect(apiSpy.editDocument).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe('transitionToClosed', () => {
    it('advances lifecycle, updates properties, marks ready, and closes case', done => {
      service.transitionToClosed('case-1', 'oppet', { decision: 'avslagen' }).subscribe(() => {
        expect(apiSpy.advanceCaseLifecycle).toHaveBeenCalled();
        expect(apiSpy.markCaseReadyToClose).toHaveBeenCalled();
        expect(apiSpy.closeCase).toHaveBeenCalledWith('case-1');
        done();
      });
    });

    it('works with no options', done => {
      service.transitionToClosed('case-1', null).subscribe(() => {
        expect(apiSpy.closeCase).toHaveBeenCalledWith('case-1');
        done();
      });
    });
  });
});
