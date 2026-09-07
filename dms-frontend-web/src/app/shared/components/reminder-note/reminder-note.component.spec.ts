import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReminderNoteComponent } from './reminder-note.component';

describe('ReminderNoteComponent', () => {
  let component: ReminderNoteComponent;
  let fixture: ComponentFixture<ReminderNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReminderNoteComponent],
    })
      .overrideTemplate(ReminderNoteComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ReminderNoteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initialValue', '');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('sets the note control value from the initial value', () => {
    fixture.componentRef.setInput('initialValue', 'Existing note');
    fixture.detectChanges();
    expect(component.noteControl.value).toBe('Existing note');
  });

  it('leaves the note control empty when initialValue is empty', () => {
    fixture.detectChanges();
    expect(component.noteControl.value).toBe('');
  });

  it('exposes the editor configuration', () => {
    fixture.detectChanges();
    expect(component.editorConfig.editable).toBeTrue();
    expect(component.editorConfig.minHeight).toBe('250px');
  });

  it('emits closeDialog', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy('closeDialog');
    component.closeDialog.subscribe(spy);
    component.closeDialog.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('emits saveNoteObject with the note text', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy('saveNoteObject');
    component.saveNoteObject.subscribe(spy);
    component.saveNoteObject.emit('My note');
    expect(spy).toHaveBeenCalledWith('My note');
  });
});
