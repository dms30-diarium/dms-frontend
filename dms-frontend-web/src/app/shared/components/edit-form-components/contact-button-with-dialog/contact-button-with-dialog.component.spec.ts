import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactButtonWithDialogComponent } from './contact-button-with-dialog.component';

describe('ContactButtonWithDialogComponent', () => {
  let component: ContactButtonWithDialogComponent;
  let fixture: ComponentFixture<ContactButtonWithDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactButtonWithDialogComponent],
    })
      .overrideTemplate(ContactButtonWithDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ContactButtonWithDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isContactDialogOpen defaults to false', () => {
    expect(component.isContactDialogOpen()).toBeFalse();
  });

  describe('addContact', () => {
    it('emits the current form value via addedContact', () => {
      const spy = jasmine.createSpy('addedContact');
      component.addedContact.subscribe(spy);

      component.form.setValue({
        name: 'Alice',
        email: 'alice@example.com',
        phone: '0701234567',
        org: 'Acme',
        adress: 'Main St 1',
        postnummer: '12345',
        city: 'Stockholm',
      });
      component.addContact();

      expect(spy).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'Alice', email: 'alice@example.com', org: 'Acme' })
      );
    });
  });
});
