import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserModalComponent } from './user-modal.component';
import { NxUser } from '@app/shared/api/nuxeo-api.types';

describe('UserModalComponent', () => {
  let component: UserModalComponent;
  let fixture: ComponentFixture<UserModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserModalComponent],
    })
      .overrideTemplate(UserModalComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UserModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns an empty display name and a fallback initial when there is no user', () => {
    expect(component.displayName).toBe('');
    expect(typeof component.initials).toBe('string');
  });

  it('computes the display name and initials from the user', () => {
    const user: NxUser = {
      'entity-type': 'user',
      id: 'alice',
      properties: { firstName: 'Alice', lastName: 'Smith' },
    };
    fixture.componentRef.setInput('user', user);

    expect(component.displayName).toBe('Alice Smith');
    expect(component.initials).toBeTruthy();
  });

  it('falls back to the user id when no name is available', () => {
    const user: NxUser = { 'entity-type': 'user', id: 'bob' };
    fixture.componentRef.setInput('user', user);

    expect(component.displayName).toBe('bob');
  });
});
