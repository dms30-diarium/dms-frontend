import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
export interface HistoryEntry {
  url: string;
  name: string; // document title or fallback
  path?: string; // full document path
  id?: string; // UID
  type?: string; // document type (for "Typ" column)
  lastViewed?: string; // ISO string of when it was visited
}

type HistoryMap = Record<string, HistoryEntry[]>;

const STORAGE_KEY = 'pageHistoryByUsername';
const LEGACY_STORAGE_KEY = 'pageHistory';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly maxHistoryEntries = 100;
  private nuxeoApiService = inject(NuxeoApiService);
  private auth = inject(AuthService);
  private loadedForUser: string | null = null;

  historySignal = signal<HistoryEntry[]>([]);

  constructor() {
    // Username resolves asynchronously after login; load the stored history
    // for that user once it is known.
    effect(() => {
      const username = this.auth.username();
      if (!username || username === this.loadedForUser) return;
      untracked(() => this.loadHistoryForUser(username));
    });
  }

  clearHistory() {
    this.historySignal.set([]);
    const username = this.auth.username();
    if (!username) return;
    const historyMap = this.readStorageMap();
    delete historyMap[username];
    this.writeStorageMap(historyMap);
  }

  addPage(pageUrl: string) {
    if (pageUrl === '/') return;

    const fallbackName = pageUrl.split('/').pop() || pageUrl;
    const now = new Date().toISOString();

    const currentHistory = this.historySignal();
    const existingEntry = currentHistory.find(entry => entry.url === pageUrl);
    if (existingEntry) {
      const updatedHistory = [
        { ...existingEntry, lastViewed: now },
        ...currentHistory.filter(entry => entry.url !== pageUrl),
      ];
      this.historySignal.set(this.trimHistory(updatedHistory));
      this.persistHistory();
      return;
    }

    const newHistoryEntry: HistoryEntry = { url: pageUrl, name: fallbackName, lastViewed: now };
    const updatedHistory = [newHistoryEntry, ...currentHistory];
    this.historySignal.set(this.trimHistory(updatedHistory));
    this.persistHistory();

    const documentId = pageUrl.split('/').pop()!;
    this.enrichEntryWithDocumentInfo(pageUrl, documentId, fallbackName);
  }

  /** Fetch document details (title + path) from Nuxeo */
  private enrichEntryWithDocumentInfo(pageUrl: string, documentId: string, fallbackName: string) {
    this.nuxeoApiService.getDocumentById(documentId).subscribe({
      next: document => {
        const documentTitle = document?.title ?? fallbackName;
        const documentPath = document?.path ?? undefined;
        const documentType = document?.type ?? '(okänd typ)';

        this.historySignal.update(historyList =>
          historyList.map(entry =>
            entry.url === pageUrl
              ? {
                  ...entry,
                  name: documentTitle,
                  path: documentPath,
                  id: document.uid,
                  type: documentType,
                }
              : entry
          )
        );
        this.persistHistory();
      },
      error: () => console.warn(`Failed to fetch document details for ${documentId}`),
    });
  }

  /** Retry enrichment for entries where the original fetch failed (no id/type yet) */
  enrichMissingEntries() {
    this.historySignal()
      .filter(entry => !entry.id || !entry.type)
      .forEach(entry => {
        const documentId = entry.url.split('/').pop();
        if (documentId) {
          this.enrichEntryWithDocumentInfo(entry.url, documentId, entry.name);
        }
      });
  }

  private loadHistoryForUser(username: string) {
    const storedHistory = this.readStoredHistory(username);
    // Merge navigations recorded before auth resolved; on a user switch
    // (previous user already loaded) the stored history replaces the signal.
    const nextHistory =
      this.loadedForUser === null ? this.mergeHistories(this.historySignal(), storedHistory) : storedHistory;
    this.loadedForUser = username;
    this.historySignal.set(nextHistory);
    this.persistHistory();
  }

  private mergeHistories(inMemory: HistoryEntry[], stored: HistoryEntry[]): HistoryEntry[] {
    const entriesByUrl = new Map<string, HistoryEntry>();
    for (const entry of [...stored, ...inMemory]) {
      const existing = entriesByUrl.get(entry.url);
      if (!existing || (entry.lastViewed ?? '') > (existing.lastViewed ?? '')) {
        entriesByUrl.set(entry.url, entry);
      }
    }
    const merged = [...entriesByUrl.values()].sort((a, b) => (b.lastViewed ?? '').localeCompare(a.lastViewed ?? ''));
    return this.trimHistory(merged);
  }

  private readStoredHistory(username: string): HistoryEntry[] {
    this.migrateLegacyHistory(username);
    const entries = this.readStorageMap()[username];
    return Array.isArray(entries) ? entries : [];
  }

  /** Adopt history saved under the old shared key as the current user's history */
  private migrateLegacyHistory(username: string) {
    const legacyHistory = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyHistory) return;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    try {
      const entries = JSON.parse(legacyHistory);
      if (!Array.isArray(entries)) return;
      const historyMap = this.readStorageMap();
      if (!historyMap[username]) {
        historyMap[username] = entries;
        this.writeStorageMap(historyMap);
      }
    } catch {
      // corrupt legacy data, nothing to migrate
    }
  }

  private readStorageMap(): HistoryMap {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeStorageMap(historyMap: HistoryMap) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMap));
  }

  private trimHistory(historyList: HistoryEntry[]): HistoryEntry[] {
    if (!this.maxHistoryEntries) return historyList;
    return historyList.length > this.maxHistoryEntries ? historyList.slice(0, this.maxHistoryEntries) : historyList;
  }

  private persistHistory() {
    const username = this.auth.username();
    if (!username) return;
    const historyMap = this.readStorageMap();
    historyMap[username] = this.historySignal();
    this.writeStorageMap(historyMap);
  }

  getDate(date: string | Date | undefined | null): string {
    return formatDateOrMissing(date);
  }
}
