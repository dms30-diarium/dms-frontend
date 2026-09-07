import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HistoryEntry, HistoryService } from './history-service.service';
import { AuthService } from './auth.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

const STORAGE_KEY = 'pageHistoryByUsername';
const LEGACY_STORAGE_KEY = 'pageHistory';

describe('HistoryService', () => {
  let usernameSignal: WritableSignal<string | null>;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;

  const createService = (): HistoryService => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { username: usernameSignal } },
        { provide: NuxeoApiService, useValue: nuxeoApiSpy },
      ],
    });
    return TestBed.inject(HistoryService);
  };

  const readStoredMap = (): Record<string, HistoryEntry[]> => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

  beforeEach(() => {
    localStorage.clear();
    usernameSignal = signal<string | null>(null);
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', ['getDocumentById']);
    nuxeoApiSpy.getDocumentById.and.returnValue(throwError(() => new Error('offline')));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists history under the current username', () => {
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    service.addPage('/doc/abc-123');

    expect(readStoredMap()['alice'].length).toBe(1);
    expect(readStoredMap()['alice'][0].url).toBe('/doc/abc-123');
  });

  it('loads the stored history for the user once username resolves', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ alice: [{ url: '/doc/old', name: 'old', lastViewed: '2026-06-01T10:00:00.000Z' }] })
    );
    const service = createService();
    TestBed.flushEffects();
    expect(service.historySignal().length).toBe(0);

    usernameSignal.set('alice');
    TestBed.flushEffects();

    expect(service.historySignal().length).toBe(1);
    expect(service.historySignal()[0].url).toBe('/doc/old');
  });

  it('merges navigations recorded before auth resolved with stored history', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ alice: [{ url: '/doc/old', name: 'old', lastViewed: '2026-06-01T10:00:00.000Z' }] })
    );
    const service = createService();
    service.addPage('/doc/new');

    usernameSignal.set('alice');
    TestBed.flushEffects();

    const urls = service.historySignal().map(entry => entry.url);
    expect(urls).toEqual(['/doc/new', '/doc/old']);
    expect(readStoredMap()['alice'].length).toBe(2);
  });

  it('does not record the root page', () => {
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    service.addPage('/');

    expect(service.historySignal().length).toBe(0);
  });

  it('keeps each user history separate and only clears the current user', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bob: [{ url: '/doc/bobs', name: 'bobs', lastViewed: '2026-06-01T10:00:00.000Z' }] })
    );
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    service.addPage('/doc/alices');
    expect(service.historySignal().map(entry => entry.url)).toEqual(['/doc/alices']);

    service.clearHistory();

    expect(service.historySignal().length).toBe(0);
    expect(readStoredMap()['alice']).toBeUndefined();
    expect(readStoredMap()['bob'].length).toBe(1);
  });

  it('tolerates corrupt stored data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    expect(service.historySignal().length).toBe(0);

    service.addPage('/doc/abc');
    expect(readStoredMap()['alice'].length).toBe(1);
  });

  it('migrates history stored under the legacy key', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify([{ url: '/doc/legacy', name: 'legacy', lastViewed: '2026-06-01T10:00:00.000Z' }])
    );
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    expect(service.historySignal().map(entry => entry.url)).toEqual(['/doc/legacy']);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(readStoredMap()['alice'].length).toBe(1);
  });

  it('updates lastViewed and moves an existing entry to the top on revisit', () => {
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    service.addPage('/doc/first');
    service.addPage('/doc/second');
    service.addPage('/doc/first');

    const urls = service.historySignal().map(entry => entry.url);
    expect(urls).toEqual(['/doc/first', '/doc/second']);
    expect(service.historySignal().length).toBe(2);
  });

  it('retries enrichment only for entries missing document info', () => {
    usernameSignal.set('alice');
    const service = createService();
    TestBed.flushEffects();

    service.addPage('/doc/failed'); // enrichment fails (spy throws)
    nuxeoApiSpy.getDocumentById.calls.reset();
    nuxeoApiSpy.getDocumentById.and.returnValue(
      of({ uid: 'failed', title: 'Recovered title', path: '/some/path', type: 'File' } as unknown as NuxeoDocument)
    );

    service.enrichMissingEntries();

    expect(nuxeoApiSpy.getDocumentById).toHaveBeenCalledTimes(1);
    expect(service.historySignal()[0].name).toBe('Recovered title');
    expect(service.historySignal()[0].type).toBe('File');

    nuxeoApiSpy.getDocumentById.calls.reset();
    service.enrichMissingEntries();
    expect(nuxeoApiSpy.getDocumentById).not.toHaveBeenCalled();
  });
});
