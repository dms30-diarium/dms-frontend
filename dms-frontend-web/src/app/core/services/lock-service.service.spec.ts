import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { LockService } from './lock-service.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AuthService } from '@app/core/services/auth.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeDoc(lockOwner?: string | null, uid = 'doc-1') {
  return makeNuxeoDocument({ uid, type: 'File', title: 'T', lockOwner: lockOwner ?? undefined });
}

describe('LockService', () => {
  let service: LockService;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let authSpy: { username: ReturnType<typeof signal<string>>; isAdmin: ReturnType<typeof signal<boolean>> };
  let storeSpy: { notification: ReturnType<typeof signal<unknown>> };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['unlockDocument', 'lockDocument', 'getDocumentById']);
    authSpy = { username: signal('alice'), isAdmin: signal(false) };
    storeSpy = { notification: signal(null) };

    TestBed.configureTestingModule({
      providers: [
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: GeneralStore, useValue: storeSpy },
      ],
    });
    service = TestBed.inject(LockService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('initLockState', () => {
    it('sets true when lockOwner present', () => {
      const sig = jasmine.createSpyObj('signal', ['set']);
      service.initLockState(makeDoc('alice'), sig);
      expect(sig.set).toHaveBeenCalledWith(true);
    });

    it('sets false when no lockOwner', () => {
      const sig = jasmine.createSpyObj('signal', ['set']);
      service.initLockState(makeDoc(null), sig);
      expect(sig.set).toHaveBeenCalledWith(false);
    });
  });

  describe('toggleAndUpdate', () => {
    it('locks document when not currently locked', done => {
      apiSpy.lockDocument.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc('alice')));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc(null), isLockedByUser).subscribe(() => {
        expect(apiSpy.lockDocument).toHaveBeenCalledWith('doc-1');
        expect(isLockedByUser.set).toHaveBeenCalledWith(true);
        done();
      });
    });

    it('unlocks document when owner matches current user', done => {
      apiSpy.unlockDocument.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc(null)));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc('alice'), isLockedByUser).subscribe(() => {
        expect(apiSpy.unlockDocument).toHaveBeenCalledWith('doc-1');
        expect(isLockedByUser.set).toHaveBeenCalledWith(false);
        done();
      });
    });

    it('allows admin to unlock document owned by others', done => {
      authSpy.isAdmin.set(true);
      apiSpy.unlockDocument.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc(null)));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc('bob'), isLockedByUser).subscribe(() => {
        expect(apiSpy.unlockDocument).toHaveBeenCalledWith('doc-1');
        done();
      });
    });

    it('throws error when non-owner non-admin tries to unlock', done => {
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc('bob'), isLockedByUser).subscribe({
        error: err => {
          expect(err.message).toBe('Unauthorized unlock');
          expect(apiSpy.unlockDocument).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('sets notification on success', done => {
      apiSpy.lockDocument.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc('alice')));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc(null), isLockedByUser).subscribe(() => {
        expect(storeSpy.notification()).toEqual(jasmine.objectContaining({ variation: 'success' }));
        done();
      });
    });

    it('sets error notification when api call fails', done => {
      apiSpy.lockDocument.and.returnValue(throwError(() => new Error('fail')));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);

      service.toggleAndUpdate(makeDoc(null), isLockedByUser).subscribe({
        error: () => {
          expect(storeSpy.notification()).toEqual(jasmine.objectContaining({ variation: 'danger' }));
          done();
        },
      });
    });

    it('calls reloadEmitter on success when provided', done => {
      apiSpy.lockDocument.and.returnValue(of(makeNuxeoDocument()));
      apiSpy.getDocumentById.and.returnValue(of(makeDoc('alice')));
      const isLockedByUser = jasmine.createSpyObj('sig', ['set']);
      const reloadEmitter = jasmine.createSpyObj('emitter', ['emit']);

      service.toggleAndUpdate(makeDoc(null), isLockedByUser, reloadEmitter).subscribe(() => {
        expect(reloadEmitter.emit).toHaveBeenCalled();
        done();
      });
    });
  });
});
