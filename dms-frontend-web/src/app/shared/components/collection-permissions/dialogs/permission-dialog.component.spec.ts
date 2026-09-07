import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { PermissionDialogComponent } from './permission-dialog.component';
import { PermissionFormControls } from '@app/shared/components/collection-permissions/collection-permissions.types';
import { Option } from '@app/shared/commonTypes';

function makeForm(): FormGroup<PermissionFormControls> {
  return new FormGroup<PermissionFormControls>({
    principal: new FormControl<Option | null>(null),
    permission: new FormControl('Read', { nonNullable: true }),
    timeFrame: new FormControl<'permanent' | 'date'>('permanent', { nonNullable: true }),
    begin: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    notify: new FormControl(false, { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true }),
  });
}

describe('PermissionDialogComponent', () => {
  let component: PermissionDialogComponent;
  let fixture: ComponentFixture<PermissionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionDialogComponent],
    })
      .overrideTemplate(PermissionDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(PermissionDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'add');
    fixture.componentRef.setInput('form', makeForm());
    fixture.componentRef.setInput('principalOptions', [{ id: 'user-1', label: 'Alice' }]);
    fixture.componentRef.setInput('permissionOptions', [{ id: 'Read', label: 'Read' }]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the provided mode, form, and options', () => {
    expect(component.mode()).toBe('add');
    expect(component.form().controls.permission.value).toBe('Read');
    expect(component.principalOptions()).toEqual([{ id: 'user-1', label: 'Alice' }]);
    expect(component.permissionOptions()).toEqual([{ id: 'Read', label: 'Read' }]);
  });

  it('supports edit mode', () => {
    fixture.componentRef.setInput('mode', 'edit');
    expect(component.mode()).toBe('edit');
  });

  it('emits dialogClose and formSubmit', () => {
    const closeSpy = jasmine.createSpy('dialogClose');
    const submitSpy = jasmine.createSpy('formSubmit');
    component.dialogClose.subscribe(closeSpy);
    component.formSubmit.subscribe(submitSpy);

    component.dialogClose.emit();
    component.formSubmit.emit();

    expect(closeSpy).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('emits principalQueryChanged and principalSelected', () => {
    const querySpy = jasmine.createSpy('principalQueryChanged');
    const selectSpy = jasmine.createSpy('principalSelected');
    component.principalQueryChanged.subscribe(querySpy);
    component.principalSelected.subscribe(selectSpy);

    const queryEvent = new CustomEvent<string>('query', { detail: 'ali' });
    const selectEvent = new CustomEvent<Option[]>('select', { detail: [{ id: 'user-1', label: 'Alice' }] });
    component.principalQueryChanged.emit(queryEvent);
    component.principalSelected.emit(selectEvent);

    expect(querySpy).toHaveBeenCalledWith(queryEvent);
    expect(selectSpy).toHaveBeenCalledWith(selectEvent);
  });
});
