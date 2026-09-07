import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionSectionComponent } from './permission-section.component';

describe('PermissionSectionComponent', () => {
  let component: PermissionSectionComponent;
  let fixture: ComponentFixture<PermissionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionSectionComponent],
    })
      .overrideTemplate(PermissionSectionComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(PermissionSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Local permissions');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    expect(component.title()).toBe('Local permissions');
    expect(component.actionLabel()).toBeNull();
    expect(component.actionAriaLabel()).toBeNull();
    expect(component.showAction()).toBeTrue();
    expect(component.actionDisabled()).toBeFalse();
    expect(component.actionVariation()).toBe('function');
    expect(component.alertText()).toBeNull();
  });

  it('reflects custom input values', () => {
    fixture.componentRef.setInput('actionLabel', 'Add');
    fixture.componentRef.setInput('actionAriaLabel', 'Add permission');
    fixture.componentRef.setInput('showAction', false);
    fixture.componentRef.setInput('actionDisabled', true);
    fixture.componentRef.setInput('actionVariation', 'primary');
    fixture.componentRef.setInput('alertText', 'Some warning');

    expect(component.actionLabel()).toBe('Add');
    expect(component.actionAriaLabel()).toBe('Add permission');
    expect(component.showAction()).toBeFalse();
    expect(component.actionDisabled()).toBeTrue();
    expect(component.actionVariation()).toBe('primary');
    expect(component.alertText()).toBe('Some warning');
  });

  it('emits actionClick', () => {
    const spy = jasmine.createSpy('actionClick');
    component.actionClick.subscribe(spy);
    component.actionClick.emit();
    expect(spy).toHaveBeenCalled();
  });
});
