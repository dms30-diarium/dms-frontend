import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeletedCardsComponent } from './deleted-cards.component';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

describe('DeletedCardsComponent', () => {
  let component: DeletedCardsComponent;
  let fixture: ComponentFixture<DeletedCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletedCardsComponent],
    })
      .overrideTemplate(DeletedCardsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DeletedCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    expect(component.columns()).toBe(2);
    expect(component.isEditable()).toBeFalse();
    expect(component.cards()).toEqual([]);
    expect(component.selectedIds()).toEqual([]);
  });

  describe('getDate', () => {
    it('formats a date', () => {
      expect(typeof component.getDate('2026-06-15T00:00:00Z')).toBe('string');
    });
  });

  describe('selectItem', () => {
    it('adds an unselected uid and emits the updated selection', () => {
      const spy = jasmine.createSpy('selectedItemsArray');
      component.selectedItemsArray.subscribe(spy);

      component.selectItem('doc-1');

      expect(component.selectedIds()).toEqual(['doc-1']);
      expect(spy).toHaveBeenCalledWith(['doc-1']);
    });

    it('removes an already-selected uid', () => {
      component.selectItem('doc-1');
      component.selectItem('doc-1');

      expect(component.selectedIds()).toEqual([]);
    });
  });

  describe('inputs', () => {
    it('reflects provided cards', () => {
      const card = makeNuxeoDocument({ uid: 'd-1' });
      fixture.componentRef.setInput('cards', [card]);
      expect(component.cards()).toEqual([card]);
    });
  });
});
