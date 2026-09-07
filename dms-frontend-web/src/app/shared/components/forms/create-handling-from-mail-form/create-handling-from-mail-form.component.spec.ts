import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateHandlingFromMailFormComponent } from './create-handling-from-mail-form.component';
import { FieldConfig } from '../../general-form/general-form.types';

function makeField(name: string): FieldConfig {
  return { type: 'input', name, label: name };
}

describe('CreateHandlingFromMailFormComponent', () => {
  let component: CreateHandlingFromMailFormComponent;
  let fixture: ComponentFixture<CreateHandlingFromMailFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateHandlingFromMailFormComponent],
    })
      .overrideTemplate(CreateHandlingFromMailFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateHandlingFromMailFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('handlingConfig', [
      makeField('type'),
      makeField('name'),
      makeField('dateFrom'),
      makeField('secret'),
      makeField('lagrum'),
      makeField('other'),
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('column splitting', () => {
    it('puts type and name in the first column', () => {
      expect(component.firstColumnConfig().map(f => f.name)).toEqual(['type', 'name']);
    });

    it('puts dateFrom, secret, lagrum in the second column', () => {
      expect(component.secondColumnConfig().map(f => f.name)).toEqual(['dateFrom', 'secret', 'lagrum']);
    });

    it('puts everything else in the third column', () => {
      expect(component.thirdColumnConfig().map(f => f.name)).toEqual(['other']);
    });
  });

  describe('event passthrough handlers', () => {
    it('emits changeForm', () => {
      const spy = jasmine.createSpy('changeForm');
      component.changeForm.subscribe(spy);
      component.onChangeForm({ name: 'value' });
      expect(spy).toHaveBeenCalledWith({ name: 'value' });
    });

    it('emits selectedOptionChanged', () => {
      const spy = jasmine.createSpy('selectedOptionChanged');
      component.selectedOptionChanged.subscribe(spy);
      const event = { selectedValue: 'v', fieldName: 'f' };
      component.onSelectedOptionChanged(event);
      expect(spy).toHaveBeenCalledWith(event);
    });

    it('emits selectedRadioChanged', () => {
      const spy = jasmine.createSpy('selectedRadioChanged');
      component.selectedRadioChanged.subscribe(spy);
      const event = { selectedValue: 'v', fieldName: 'f' };
      component.onSelectedRadioChanged(event);
      expect(spy).toHaveBeenCalledWith(event);
    });

    it('emits dropdownChanged', () => {
      const spy = jasmine.createSpy('dropdownChanged');
      component.dropdownChanged.subscribe(spy);
      const event = { fieldName: 'f', value: 'v' };
      component.onDropdownChanged(event);
      expect(spy).toHaveBeenCalledWith(event);
    });

    it('emits dialogClose with null', () => {
      const spy = jasmine.createSpy('dialogClose');
      component.dialogClose.subscribe(spy);
      component.onDialogClose();
      expect(spy).toHaveBeenCalledWith(null);
    });
  });
});
