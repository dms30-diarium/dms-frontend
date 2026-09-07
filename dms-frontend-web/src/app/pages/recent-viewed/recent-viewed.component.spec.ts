import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RecentViewedComponent } from './recent-viewed.component';
import { HistoryEntry, HistoryService } from '@app/core/services/history-service.service';
import { AuthService } from '@app/core/services/auth.service';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';

describe('RecentViewedComponent', () => {
  let component: RecentViewedComponent;
  let fixture: ComponentFixture<RecentViewedComponent>;
  let historySignal: ReturnType<typeof signal<HistoryEntry[]>>;
  let historyServiceMock: Partial<HistoryService>;

  beforeEach(async () => {
    historySignal = signal<HistoryEntry[]>([]);
    historyServiceMock = {
      historySignal,
      enrichMissingEntries: jasmine.createSpy('enrichMissingEntries'),
      getDate: (date: string | Date | undefined | null) => formatDateOrMissing(date),
    };

    await TestBed.configureTestingModule({
      imports: [RecentViewedComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HistoryService, useValue: historyServiceMock },
        { provide: AuthService, useValue: { username: signal<string | null>(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecentViewedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('retries enrichment of incomplete entries on open', () => {
    expect(historyServiceMock.enrichMissingEntries).toHaveBeenCalled();
  });

  it('sorts by raw date, not the formatted date string', () => {
    // Formatted strings would sort "2 jun" after "11 jun" alphabetically;
    // the raw ISO field must keep chronological order.
    historySignal.set([
      { url: '/doc/a', name: 'A', lastViewed: '2026-06-02T10:00:00.000Z' },
      { url: '/doc/b', name: 'B', lastViewed: '2026-06-11T10:00:00.000Z' },
      { url: '/doc/c', name: 'C', lastViewed: '2026-05-30T10:00:00.000Z' },
    ]);

    expect(component.sortBy()).toBe('lastViewed');
    expect(component.sortOrder()).toBe('desc');
    expect(component.sortedHistoryItems().map(item => item['title'])).toEqual(['B', 'A', 'C']);

    component.onSortChange({ sortBy: 'lastViewed', sortOrder: 'asc' });
    expect(component.sortedHistoryItems().map(item => item['title'])).toEqual(['C', 'A', 'B']);
  });
});
