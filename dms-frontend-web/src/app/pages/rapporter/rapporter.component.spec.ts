import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { RapporterComponent } from './rapporter.component';
import { SortOrder, TableSortService, TableSortState } from '@app/core/services/table-sort.service';
import { WritableSignal } from '@angular/core';

describe('RapporterComponent', () => {
  let component: RapporterComponent;
  let fixture: ComponentFixture<RapporterComponent>;
  let sortSpy: jasmine.SpyObj<TableSortService>;

  beforeEach(async () => {
    sortSpy = jasmine.createSpyObj('TableSortService', ['applySortSignals']);
    sortSpy.applySortSignals.and.callFake(
      (sortBy: WritableSignal<string>, sortOrder: WritableSignal<SortOrder>, next: TableSortState) => {
        sortBy.set(next.sortBy);
        sortOrder.set(next.sortOrder);
        return next;
      }
    );

    await TestBed.configureTestingModule({
      imports: [RapporterComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TableSortService, useValue: sortSpy },
      ],
    })
      .overrideTemplate(RapporterComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(RapporterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('tabs', () => {
    it('has 3 tabs', () => {
      expect(component.tabs.length).toBe(3);
    });

    it('activeTabId defaults to jk-lista', () => {
      expect(component.activeTabId()).toBe('jk-lista');
    });
  });

  describe('onTabChanged', () => {
    it('updates activeTabId', () => {
      component.onTabChanged('postlista');
      expect(component.activeTabId()).toBe('postlista');
    });

    it('resets openCasesPage when switching to jk-lista', () => {
      component.openCasesPage.set(3);
      component.onTabChanged('jk-lista');
      expect(component.openCasesPage()).toBe(0);
    });

    it('resets postlistaPage when switching to postlista', () => {
      component.postlistaPage.set(2);
      component.onTabChanged('postlista');
      expect(component.postlistaPage()).toBe(0);
    });
  });

  describe('onOpenCasesPageChange', () => {
    it('sets openCasesPage', () => {
      component.onOpenCasesPageChange(5);
      expect(component.openCasesPage()).toBe(5);
    });
  });

  describe('onOpenCasesSortChange', () => {
    it('applies sort and resets page', () => {
      component.openCasesPage.set(2);
      component.onOpenCasesSortChange({ sortBy: 'title', sortOrder: 'asc' });
      expect(sortSpy.applySortSignals).toHaveBeenCalled();
      expect(component.openCasesPage()).toBe(0);
    });
  });

  describe('onPostlistaPageChange', () => {
    it('sets postlistaPage', () => {
      component.onPostlistaPageChange(4);
      expect(component.postlistaPage()).toBe(4);
    });
  });

  describe('onPostlistaSortChange', () => {
    it('applies sort and resets page', () => {
      component.postlistaPage.set(1);
      component.onPostlistaSortChange({ sortBy: 'date', sortOrder: 'desc' });
      expect(sortSpy.applySortSignals).toHaveBeenCalled();
      expect(component.postlistaPage()).toBe(0);
    });
  });
});
