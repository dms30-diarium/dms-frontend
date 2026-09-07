import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridPaginationControlsComponent } from './grid-pagination-controls.component';
import { DigiNavigationPaginationCustomEvent } from '@designsystem-se/af';

describe('GridPaginationControlsComponent', () => {
  let component: GridPaginationControlsComponent;
  let fixture: ComponentFixture<GridPaginationControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridPaginationControlsComponent],
    })
      .overrideTemplate(GridPaginationControlsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(GridPaginationControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    expect(component.totalPages()).toBe(1);
    expect(component.currentPage()).toBe(0);
    expect(component.pageSize()).toBe(25);
    expect(component.pageSizeOptions()).toEqual([5, 10, 15, 25, 30, 50]);
    expect(component.showPageSize()).toBeTrue();
  });

  describe('onPageChange', () => {
    it('emits the zero-based page number', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);
      const event = { detail: 3 } as DigiNavigationPaginationCustomEvent<number>;

      component.onPageChange(event);

      expect(spy).toHaveBeenCalledWith(2);
    });

    it('clamps to 0 for the first page', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);
      const event = { detail: 0 } as DigiNavigationPaginationCustomEvent<number>;

      component.onPageChange(event);

      expect(spy).toHaveBeenCalledWith(0);
    });
  });

  describe('onPageSizeChange', () => {
    it('emits the selected page size', () => {
      const spy = jasmine.createSpy('pageSizeSelect');
      component.pageSizeSelect.subscribe(spy);

      component.onPageSizeChange('50');

      expect(spy).toHaveBeenCalledWith('50');
    });
  });
});
