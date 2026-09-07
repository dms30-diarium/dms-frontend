import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';

import { HandlingsnamnOptionsComponent } from './handlingsnamn-options.component';

describe('HandlingsnamnOptionsComponent', () => {
  let component: HandlingsnamnOptionsComponent;
  let fixture: ComponentFixture<HandlingsnamnOptionsComponent>;
  let tableFields: WritableSignal<string[]>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandlingsnamnOptionsComponent],
    })
      .overrideTemplate(HandlingsnamnOptionsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingsnamnOptionsComponent);
    component = fixture.componentInstance;
    tableFields = signal<string[]>([]);
    fixture.componentRef.setInput('tableFields', tableFields);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isDialogOpen defaults to false', () => {
    expect(component.isDialogOpen()).toBeFalse();
  });

  describe('values', () => {
    it('maps table field strings to table items', () => {
      tableFields.set(['Beslut', 'Yttrande']);

      expect(component.values()).toEqual([
        { id: 'Beslut', handlingsnamn: 'Beslut' },
        { id: 'Yttrande', handlingsnamn: 'Yttrande' },
      ]);
    });
  });

  describe('save', () => {
    it('does nothing when the input is empty or whitespace', () => {
      component.form.setValue({ handlingsnamn: '   ' });
      component.save();
      expect(tableFields()).toEqual([]);
    });

    it('adds the trimmed value, resets the form, and closes the dialog', () => {
      component.isDialogOpen.set(true);
      component.form.setValue({ handlingsnamn: '  Beslut  ' });

      component.save();

      expect(tableFields()).toEqual(['Beslut']);
      expect(component.form.controls.handlingsnamn.value).toBe('');
      expect(component.isDialogOpen()).toBeFalse();
    });
  });

  describe('remove', () => {
    it('removes the matching item by id', () => {
      tableFields.set(['Beslut', 'Yttrande']);

      component.remove({ id: 'Beslut', handlingsnamn: 'Beslut' });

      expect(tableFields()).toEqual(['Yttrande']);
    });
  });
});
