import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let component: CalendarComponent;
  let fixture: ComponentFixture<CalendarComponent>;

  beforeEach(async () => {
    document.getElementById('dynamic-styles')?.remove();

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(CalendarComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.getElementById('dynamic-styles')?.remove();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toDateFormat', () => {
    it('formats a Date object', () => {
      const result = component.toDateFormat(new Date('2024-01-15T00:00:00Z'), 'sv-SE');
      expect(result).toBeTruthy();
    });

    it('formats a unix timestamp in seconds', () => {
      const result = component.toDateFormat(1700000000, 'sv-SE');
      expect(result).toBeTruthy();
    });

    it('formats a unix timestamp in milliseconds', () => {
      const result = component.toDateFormat(1700000000000, 'sv-SE');
      expect(result).toBeTruthy();
    });
  });

  describe('getDynamicStyleTag', () => {
    it('creates the style tag if missing', () => {
      const tag = component.getDynamicStyleTag();
      expect(tag.id).toBe('dynamic-styles');
      expect(document.getElementById('dynamic-styles')).toBe(tag);
    });

    it('reuses existing style tag', () => {
      const first = component.getDynamicStyleTag();
      const second = component.getDynamicStyleTag();
      expect(first).toBe(second);
    });
  });

  describe('deleteStyles', () => {
    it('removes the dynamic style tag', () => {
      component.getDynamicStyleTag();
      component.deleteStyles();
      expect(document.getElementById('dynamic-styles')).toBeNull();
    });
  });

  describe('styleReminderDate', () => {
    it('appends a style rule for reminder date', () => {
      component.styleReminderDate('2024-1-15');
      const tag = component.getDynamicStyleTag();
      expect(tag.textContent).toContain('2024-1-15');
      expect(tag.textContent).toContain('221, 164, 30');
    });
  });

  describe('styleDeadlineDate', () => {
    it('appends a style rule for deadline date', () => {
      component.styleDeadlineDate('2024-2-20');
      const tag = component.getDynamicStyleTag();
      expect(tag.textContent).toContain('2024-2-20');
      expect(tag.textContent).toContain('212, 21, 21');
    });
  });

  describe('ngOnInit', () => {
    it('removes style tag on init', () => {
      component.getDynamicStyleTag();
      component.ngOnInit();
      expect(document.getElementById('dynamic-styles')).toBeNull();
    });
  });

  describe('constructor effect', () => {
    it('applies deadline styles when deadlineDate input set', () => {
      fixture.componentRef.setInput('deadlineDate', [new Date('2024-03-01T00:00:00Z')]);
      fixture.detectChanges();
      const tag = component.getDynamicStyleTag();
      expect(tag.textContent).toContain('212, 21, 21');
    });

    it('applies reminder styles when reminderDate input set', () => {
      fixture.componentRef.setInput('reminderDate', [new Date('2024-04-01T00:00:00Z')]);
      fixture.detectChanges();
      const tag = component.getDynamicStyleTag();
      expect(tag.textContent).toContain('221, 164, 30');
    });
  });
});
