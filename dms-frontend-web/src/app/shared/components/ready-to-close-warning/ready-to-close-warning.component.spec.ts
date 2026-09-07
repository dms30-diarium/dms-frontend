import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ReadyToCloseWarningComponent } from './ready-to-close-warning.component';

describe('ReadyToCloseWarningComponent', () => {
  let component: ReadyToCloseWarningComponent;
  let fixture: ComponentFixture<ReadyToCloseWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadyToCloseWarningComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(ReadyToCloseWarningComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ReadyToCloseWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onDecisionInput', () => {
    it('emits decisionChange with select value', () => {
      const spy = jasmine.createSpy('change');
      component.decisionChange.subscribe(spy);
      const select = document.createElement('select');
      select.appendChild(new Option('Decision 1', 'd1'));
      select.value = 'd1';
      component.onDecisionInput({ target: select } as unknown as Event);
      expect(spy).toHaveBeenCalledWith('d1');
    });
  });

  describe('onDecisionDateInput', () => {
    it('emits decisionDateChange with input value', () => {
      const spy = jasmine.createSpy('change');
      component.decisionDateChange.subscribe(spy);
      const input = document.createElement('input');
      input.value = '2024-01-01';
      component.onDecisionDateInput({ target: input } as unknown as Event);
      expect(spy).toHaveBeenCalledWith('2024-01-01');
    });
  });

  describe('onBeslutsfattareInput', () => {
    it('emits beslutsfattareChange with select value', () => {
      const spy = jasmine.createSpy('change');
      component.beslutsfattareChange.subscribe(spy);
      const select = document.createElement('select');
      select.appendChild(new Option('User 1', 'user-1'));
      select.value = 'user-1';
      component.onBeslutsfattareInput({ target: select } as unknown as Event);
      expect(spy).toHaveBeenCalledWith('user-1');
    });
  });

  describe('onAction', () => {
    it('emits action event', () => {
      const spy = jasmine.createSpy('action');
      component.action.subscribe(spy);
      component.onAction('confirm');
      expect(spy).toHaveBeenCalledWith('confirm');
    });
  });

  describe('getTitle', () => {
    it('returns already-marked title when alreadyMarked true', () => {
      fixture.componentRef.setInput('alreadyMarked', true);
      fixture.detectChanges();
      expect(component.getTitle()).toBe('Ärendet är redan markerat som redo att avslutas');
    });

    it('returns default title when not marked', () => {
      expect(component.getTitle()).toBe('Markera som redo att avslutas');
    });
  });

  describe('getMessage', () => {
    it('returns single message when already marked', () => {
      fixture.componentRef.setInput('alreadyMarked', true);
      fixture.detectChanges();
      expect(component.getMessage().length).toBe(1);
    });

    it('returns confirmation messages when not marked', () => {
      expect(component.getMessage().length).toBe(2);
    });
  });

  describe('showConfirmButton', () => {
    it('false when alreadyMarked', () => {
      fixture.componentRef.setInput('alreadyMarked', true);
      fixture.componentRef.setInput('decision', 'd1');
      fixture.componentRef.setInput('decisionDate', '2024-01-01');
      fixture.detectChanges();
      expect(component.showConfirmButton()).toBeFalse();
    });

    it('false when utkastCount > 0', () => {
      fixture.componentRef.setInput('utkastCount', 1);
      fixture.componentRef.setInput('decision', 'd1');
      fixture.componentRef.setInput('decisionDate', '2024-01-01');
      fixture.detectChanges();
      expect(component.showConfirmButton()).toBeFalse();
    });

    it('false when decision empty', () => {
      fixture.componentRef.setInput('decisionDate', '2024-01-01');
      fixture.detectChanges();
      expect(component.showConfirmButton()).toBeFalse();
    });

    it('true when all conditions met', () => {
      fixture.componentRef.setInput('decision', 'd1');
      fixture.componentRef.setInput('decisionDate', '2024-01-01');
      fixture.detectChanges();
      expect(component.showConfirmButton()).toBeTrue();
    });
  });

  describe('getDecisionLabel', () => {
    it('returns matching option label', () => {
      fixture.componentRef.setInput('decision', 'd1');
      fixture.componentRef.setInput('decisionOptions', [{ id: 'd1', label: 'Decision One' }]);
      fixture.detectChanges();
      expect(component.getDecisionLabel()).toBe('Decision One');
    });

    it('falls back to raw decision value when no match', () => {
      fixture.componentRef.setInput('decision', 'unknown');
      fixture.detectChanges();
      expect(component.getDecisionLabel()).toBe('unknown');
    });
  });
});
