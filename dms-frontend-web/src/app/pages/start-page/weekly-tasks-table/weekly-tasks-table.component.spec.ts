import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WeeklyTasksTableComponent } from './weekly-tasks-table.component';

describe('WeeklyTasksTableComponent', () => {
  let component: WeeklyTasksTableComponent;
  let fixture: ComponentFixture<WeeklyTasksTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklyTasksTableComponent],
      providers: [provideRouter([])],
    })
      .overrideTemplate(WeeklyTasksTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(WeeklyTasksTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    expect(component.weekLabel()).toBe('');
    expect(component.columns()).toEqual([]);
    expect(component.loading()).toBeFalse();
    expect(component.openPopoverKey()).toBeNull();
  });

  describe('togglePopover', () => {
    it('opens a closed popover', () => {
      component.togglePopover('day-1');
      expect(component.openPopoverKey()).toBe('day-1');
    });

    it('closes an already-open popover for the same key', () => {
      component.togglePopover('day-1');
      component.togglePopover('day-1');
      expect(component.openPopoverKey()).toBeNull();
    });

    it('switches to a different key', () => {
      component.togglePopover('day-1');
      component.togglePopover('day-2');
      expect(component.openPopoverKey()).toBe('day-2');
    });
  });

  describe('closePopover', () => {
    it('clears the open popover key', () => {
      component.togglePopover('day-1');
      component.closePopover();
      expect(component.openPopoverKey()).toBeNull();
    });
  });

  describe('getDayMonthLabel', () => {
    it('formats a valid date', () => {
      const label = component.getDayMonthLabel(new Date('2026-06-15T00:00:00Z'));
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('returns an empty string for a falsy date value', () => {
      expect(component.getDayMonthLabel(undefined as unknown as Date)).toBe('');
    });
  });

  describe('getButtonText', () => {
    it('subtracts 2 from the task count', () => {
      expect(component.getButtonText(5)).toBe('3 tasks left');
    });
  });

  describe('outputs', () => {
    it('emits previousWeek', () => {
      const spy = jasmine.createSpy('previousWeek');
      component.previousWeek.subscribe(spy);
      component.previousWeek.emit();
      expect(spy).toHaveBeenCalled();
    });

    it('emits nextWeek', () => {
      const spy = jasmine.createSpy('nextWeek');
      component.nextWeek.subscribe(spy);
      component.nextWeek.emit();
      expect(spy).toHaveBeenCalled();
    });
  });
});
