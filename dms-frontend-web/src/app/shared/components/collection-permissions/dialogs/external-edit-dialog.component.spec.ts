import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ExternalEditDialogComponent } from './external-edit-dialog.component';
import { ExternalPermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';

function makeForm(): FormGroup<ExternalPermissionFormControls> {
  return new FormGroup<ExternalPermissionFormControls>({
    email: new FormControl('alice@example.com', { nonNullable: true }),
    permission: new FormControl('Write', { nonNullable: true }),
    begin: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    notify: new FormControl(true, { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true }),
  });
}

describe('ExternalEditDialogComponent', () => {
  let component: ExternalEditDialogComponent;
  let fixture: ComponentFixture<ExternalEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalEditDialogComponent],
    })
      .overrideTemplate(ExternalEditDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ExternalEditDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', makeForm());
    fixture.componentRef.setInput('permissionOptions', [{ id: 'Write', label: 'Write' }]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the provided form and options', () => {
    expect(component.form().controls.email.value).toBe('alice@example.com');
    expect(component.permissionOptions()).toEqual([{ id: 'Write', label: 'Write' }]);
  });

  it('emits dialogClose', () => {
    const spy = jasmine.createSpy('dialogClose');
    component.dialogClose.subscribe(spy);
    component.dialogClose.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('emits formSubmit', () => {
    const spy = jasmine.createSpy('formSubmit');
    component.formSubmit.subscribe(spy);
    component.formSubmit.emit();
    expect(spy).toHaveBeenCalled();
  });
});
