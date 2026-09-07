import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { TableDateQuickFilterComponent } from './table-date-quick-filter.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { AggBucket } from '@app/shared/api/nuxeo-api.types';

describe('TableDateQuickFilterComponent', () => {
  let component: TableDateQuickFilterComponent;
  let fixture: ComponentFixture<TableDateQuickFilterComponent>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({ 'label.ui.aggregate.from_now-7d_to_now-24H': 'Förra veckan' }));

    await TestBed.configureTestingModule({
      imports: [TableDateQuickFilterComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(TableDateQuickFilterComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TableDateQuickFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('quickRangeFilterItems', () => {
    it('returns an empty array when there are no buckets', () => {
      expect(component.quickRangeFilterItems()).toEqual([]);
    });

    it('maps buckets to options using the messages info labels', () => {
      const buckets: AggBucket[] = [{ key: 'from_now-7d_to_now-24H', docCount: 5 }];
      fixture.componentRef.setInput('quickRangeBuckets', buckets);

      expect(component.quickRangeFilterItems()).toEqual([{ id: 'from_now-7d_to_now-24H', label: 'Förra veckan (5)' }]);
    });
  });

  describe('onSubmit', () => {
    it('emits selectedItemsChanged and dateRangeChange with the checked values', () => {
      const selectedSpy = jasmine.createSpy('selectedItemsChanged');
      const rangeSpy = jasmine.createSpy('dateRangeChange');
      component.selectedItemsChanged.subscribe(selectedSpy);
      component.dateRangeChange.subscribe(rangeSpy);

      const event = new CustomEvent('submit', { detail: { checked: ['from_now-7d_to_now-24H'] } });
      component.onSubmit(event);

      expect(selectedSpy).toHaveBeenCalledWith(['from_now-7d_to_now-24H']);
      expect(rangeSpy).toHaveBeenCalledWith({
        field: 'dublincore_created_agg',
        value: ['from_now-7d_to_now-24H'],
      });
    });
  });

  describe('onReset', () => {
    it('emits empty arrays for both outputs', () => {
      const selectedSpy = jasmine.createSpy('selectedItemsChanged');
      const rangeSpy = jasmine.createSpy('dateRangeChange');
      component.selectedItemsChanged.subscribe(selectedSpy);
      component.dateRangeChange.subscribe(rangeSpy);

      component.onReset();

      expect(selectedSpy).toHaveBeenCalledWith([]);
      expect(rangeSpy).toHaveBeenCalledWith({ field: 'dublincore_created_agg', value: [] });
    });
  });
});
