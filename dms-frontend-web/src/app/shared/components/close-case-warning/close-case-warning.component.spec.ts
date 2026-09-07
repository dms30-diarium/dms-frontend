import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CloseCaseWarningComponent } from './close-case-warning.component';

describe('CloseCaseWarningComponent', () => {
  let component: CloseCaseWarningComponent;
  let fixture: ComponentFixture<CloseCaseWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CloseCaseWarningComponent],
    })
      .overrideTemplate(CloseCaseWarningComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CloseCaseWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes a fixed list of gallringsDatum options', () => {
    expect(component.gallringsDatumOptions).toEqual(['2 years', '5 years', '10 years']);
  });

  describe('onCommentInput', () => {
    it('emits the textarea value via commentChange', () => {
      const spy = jasmine.createSpy('commentChange');
      component.commentChange.subscribe(spy);
      const textarea = document.createElement('textarea');
      textarea.value = 'My comment';
      const event = { target: textarea } as unknown as Event;

      component.onCommentInput(event);

      expect(spy).toHaveBeenCalledWith('My comment');
    });
  });

  describe('onGallringsKommentarInput', () => {
    it('emits the textarea value via gallringsKommentarChange', () => {
      const spy = jasmine.createSpy('gallringsKommentarChange');
      component.gallringsKommentarChange.subscribe(spy);
      const textarea = document.createElement('textarea');
      textarea.value = 'Gallring comment';
      const event = { target: textarea } as unknown as Event;

      component.onGallringsKommentarInput(event);

      expect(spy).toHaveBeenCalledWith('Gallring comment');
    });
  });

  describe('onGallringsDatumInput', () => {
    it('emits the select value via gallringsDatumChange', () => {
      const spy = jasmine.createSpy('gallringsDatumChange');
      component.gallringsDatumChange.subscribe(spy);
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = '5 years';
      select.appendChild(option);
      select.value = '5 years';
      const event = { target: select } as unknown as Event;

      component.onGallringsDatumInput(event);

      expect(spy).toHaveBeenCalledWith('5 years');
    });
  });

  describe('onAction', () => {
    it('emits "cancel"', () => {
      const spy = jasmine.createSpy('action');
      component.action.subscribe(spy);
      component.onAction('cancel');
      expect(spy).toHaveBeenCalledWith('cancel');
    });

    it('emits "confirm"', () => {
      const spy = jasmine.createSpy('action');
      component.action.subscribe(spy);
      component.onAction('confirm');
      expect(spy).toHaveBeenCalledWith('confirm');
    });
  });
});
