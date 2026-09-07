import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ExternalAddDialogComponent } from './external-add-dialog.component';
import { ExternalPermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';

function makeForm(): FormGroup<ExternalPermissionFormControls> {
  return new FormGroup<ExternalPermissionFormControls>({
    email: new FormControl('', { nonNullable: true }),
    permission: new FormControl('Read', { nonNullable: true }),
    begin: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    notify: new FormControl(false, { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true }),
  });
}

describe('ExternalAddDialogComponent', () => {
  let component: ExternalAddDialogComponent;
  let fixture: ComponentFixture<ExternalAddDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalAddDialogComponent],
    })
      .overrideTemplate(ExternalAddDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ExternalAddDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', makeForm());
    fixture.componentRef.setInput('permissionOptions', [{ id: 'Read', label: 'Read' }]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the provided form and options', () => {
    expect(component.form().controls.permission.value).toBe('Read');
    expect(component.permissionOptions()).toEqual([{ id: 'Read', label: 'Read' }]);
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
