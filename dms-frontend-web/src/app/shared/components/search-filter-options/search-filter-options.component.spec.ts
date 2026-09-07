import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchFilterOptionsComponent } from './search-filter-options.component';
import { SearchFilterOption } from './search-filter-options.types';

describe('SearchFilterOptionsComponent', () => {
  let component: SearchFilterOptionsComponent;
  let fixture: ComponentFixture<SearchFilterOptionsComponent>;

  const filterOptions: SearchFilterOption[] = [
    { id: 'a', label: 'Option A', visible: true },
    { id: 'b', label: 'Option B', visible: false },
  ];
  const defaultFilterOptions: SearchFilterOption[] = [
    { id: 'a', label: 'Option A', visible: true },
    { id: 'b', label: 'Option B', visible: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterOptionsComponent],
    })
      .overrideTemplate(SearchFilterOptionsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SearchFilterOptionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filterOptions', filterOptions);
    fixture.componentRef.setInput('defaultFilterOptions', defaultFilterOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes localOptions as a copy of filterOptions', () => {
    expect(component.localOptions()).toEqual(filterOptions);
    expect(component.localOptions()).not.toBe(filterOptions);
  });

  describe('toggleVisibility', () => {
    it('updates the visibility of the matching option and emits filtersUpdated', () => {
      const spy = jasmine.createSpy('filtersUpdated');
      component.filtersUpdated.subscribe(spy);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      const event = { target: input } as unknown as Event;

      component.toggleVisibility(filterOptions[1], event);

      expect(component.localOptions().find(o => o.id === 'b')?.visible).toBeTrue();
      expect(spy).toHaveBeenCalledWith(component.localOptions());
    });

    it('treats a non-input target as unchecked', () => {
      const event = { target: {} } as unknown as Event;
      component.toggleVisibility(filterOptions[0], event);
      expect(component.localOptions().find(o => o.id === 'a')?.visible).toBeFalse();
    });
  });

  describe('applyChangesAndClose', () => {
    it('emits filtersUpdated and closeDialog', () => {
      const updateSpy = jasmine.createSpy('filtersUpdated');
      const closeSpy = jasmine.createSpy('closeDialog');
      component.filtersUpdated.subscribe(updateSpy);
      component.closeDialog.subscribe(closeSpy);

      component.applyChangesAndClose();

      expect(updateSpy).toHaveBeenCalledWith(component.localOptions());
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('resetToDefault', () => {
    it('resets localOptions to a copy of defaultFilterOptions and emits the change', () => {
      const spy = jasmine.createSpy('filtersUpdated');
      component.filtersUpdated.subscribe(spy);

      component.resetToDefault();

      expect(component.localOptions()).toEqual(defaultFilterOptions);
      expect(spy).toHaveBeenCalledWith(component.localOptions());
    });
  });
});
