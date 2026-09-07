import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ArkivArendeUidsTableComponent, ArkivArendeUidRow } from './arkiv-arende-uids-table.component';

describe('ArkivArendeUidsTableComponent', () => {
  let component: ArkivArendeUidsTableComponent;
  let fixture: ComponentFixture<ArkivArendeUidsTableComponent>;
  let tableFields: ReturnType<typeof signal<ArkivArendeUidRow[]>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArkivArendeUidsTableComponent],
    })
      .overrideTemplate(ArkivArendeUidsTableComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ArkivArendeUidsTableComponent);
    component = fixture.componentInstance;
    tableFields = signal<ArkivArendeUidRow[]>([]);
    fixture.componentRef.setInput('tableFields', tableFields);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openDialog', () => {
    it('resets the form with the default arendeUid and opens the dialog', () => {
      fixture.componentRef.setInput('defaultArendeUid', 'A-2026-001');
      component.openDialog();
      expect(component.form.value.arendeUid).toBe('A-2026-001');
      expect(component.isDialogOpen()).toBeTrue();
    });
  });

  describe('addArendeUid', () => {
    it('does nothing when the form is invalid', () => {
      component.form.setValue({ arendeUid: '' });
      component.addArendeUid();
      expect(tableFields()).toEqual([]);
    });

    it('does nothing when the trimmed value is empty', () => {
      component.form.setValue({ arendeUid: '   ' });
      component.addArendeUid();
      expect(tableFields()).toEqual([]);
    });

    it('adds a new entry and closes the dialog', () => {
      component.isDialogOpen.set(true);
      component.form.setValue({ arendeUid: 'A-2026-002' });
      component.addArendeUid();

      expect(tableFields().length).toBe(1);
      expect(tableFields()[0].arendeUid).toBe('A-2026-002');
      expect(component.isDialogOpen()).toBeFalse();
    });
  });

  describe('removeArendeUid', () => {
    it('removes the matching entry by id', () => {
      tableFields.set([
        { id: '1', arendeUid: 'A-1' },
        { id: '2', arendeUid: 'A-2' },
      ]);

      component.removeArendeUid({ id: '1', arendeUid: 'A-1' });

      expect(tableFields()).toEqual([{ id: '2', arendeUid: 'A-2' }]);
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('returns the column config mapped to options', () => {
      expect(component.getDefaultColumnOptions()).toEqual([{ id: 'arendeUid', label: 'Arende Uids', visible: true }]);
    });
  });
});
