import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteCommentModalComponent } from './delete-comment-modal.component';

describe('DeleteCommentModalComponent', () => {
  let component: DeleteCommentModalComponent;
  let fixture: ComponentFixture<DeleteCommentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteCommentModalComponent],
    })
      .overrideTemplate(DeleteCommentModalComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DeleteCommentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onCancel', () => {
    it('emits cancelled', () => {
      const spy = jasmine.createSpy('cancelled');
      component.cancelled.subscribe(spy);
      component.onCancel();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onConfirm', () => {
    it('emits confirmed', () => {
      const spy = jasmine.createSpy('confirmed');
      component.confirmed.subscribe(spy);
      component.onConfirm();
      expect(spy).toHaveBeenCalled();
    });
  });
});
