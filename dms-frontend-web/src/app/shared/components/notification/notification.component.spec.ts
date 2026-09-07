import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationComponent],
    })
      .overrideTemplate(NotificationComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    fixture.detectChanges();
    expect(component.variation()).toBe('info');
    expect(component.autoCloseAfter()).toBe(0);
    expect(component.text()).toBe('');
  });

  describe('ngOnInit', () => {
    it('does not schedule auto-close when autoCloseAfter is 0', fakeAsync(() => {
      const spy = jasmine.createSpy('closeNotification');
      component.closeNotification.subscribe(spy);
      fixture.detectChanges();
      tick(1000);
      expect(spy).not.toHaveBeenCalled();
    }));

    it('emits closeNotification after the configured delay', fakeAsync(() => {
      fixture.componentRef.setInput('autoCloseAfter', 500);
      const spy = jasmine.createSpy('closeNotification');
      component.closeNotification.subscribe(spy);
      fixture.detectChanges();

      tick(499);
      expect(spy).not.toHaveBeenCalled();
      tick(1);
      expect(spy).toHaveBeenCalled();
    }));
  });

  describe('ngOnDestroy', () => {
    it('clears the auto-close timer so it does not fire after destroy', fakeAsync(() => {
      fixture.componentRef.setInput('autoCloseAfter', 500);
      const spy = jasmine.createSpy('closeNotification');
      component.closeNotification.subscribe(spy);
      fixture.detectChanges();

      fixture.destroy();
      tick(1000);

      expect(spy).not.toHaveBeenCalled();
    }));
  });
});
