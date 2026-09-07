import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SetDeadlineComponent } from './set-deadline-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { UserSuggestion } from '@app/shared/api/nuxeo-api.types';

const userSuggestion: UserSuggestion = { id: 'u1', displayLabel: 'Alice', 'entity-type': 'user' };

describe('SetDeadlineComponent', () => {
  let component: SetDeadlineComponent;
  let fixture: ComponentFixture<SetDeadlineComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'setDeadline', 'getUserSuggestions']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.setDeadline.and.returnValue(of([userSuggestion]));
    apiSpy.getUserSuggestions.and.returnValue(of([userSuggestion]));

    await TestBed.configureTestingModule({
      imports: [SetDeadlineComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(SetDeadlineComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SetDeadlineComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getUserSuggestions', () => {
      expect(apiSpy.getUserSuggestions).toHaveBeenCalled();
    });

    it('populates user field options', () => {
      const userField = component.formConfig().find(f => f.name === 'user');
      expect(userField?.options?.length).toBe(1);
      expect(userField?.options?.[0].label).toBe('Alice');
    });
  });

  describe('formConfig', () => {
    it('has 4 fields', () => {
      expect(component.formConfig().length).toBe(4);
    });

    it('contains user, description, deadline, reminder fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toEqual(['user', 'description', 'deadline', 'reminder']);
    });
  });

  describe('createDeadline', () => {
    it('does nothing when no deadline date', () => {
      component.createDeadline({ user: [{ id: 'u1' }] });
      expect(apiSpy.setDeadline).not.toHaveBeenCalled();
    });

    it('does nothing when no user selected', () => {
      component.createDeadline({ deadline: [new Date('2024-01-01')] });
      expect(apiSpy.setDeadline).not.toHaveBeenCalled();
    });

    it('calls setDeadline with formatted date and user', () => {
      component.createDeadline({ user: [{ id: 'u1' }], deadline: [new Date('2024-01-01T00:00:00Z')] });
      expect(apiSpy.setDeadline).toHaveBeenCalledWith('doc-1', 'u1', '2024-01-01', undefined, undefined);
    });

    it('includes reminder date when provided', () => {
      component.createDeadline({
        user: [{ id: 'u1' }],
        deadline: [new Date('2024-01-01T00:00:00Z')],
        reminder: [new Date('2023-12-25T00:00:00Z')],
      });
      expect(apiSpy.setDeadline).toHaveBeenCalledWith('doc-1', 'u1', '2024-01-01', '2023-12-25', undefined);
    });

    it('emits dialogClosed with null on success', () => {
      const closedSpy = jasmine.createSpy('closed');
      component.dialogClosed.subscribe(closedSpy);
      component.createDeadline({ user: [{ id: 'u1' }], deadline: [new Date('2024-01-01T00:00:00Z')] });
      expect(closedSpy).toHaveBeenCalledWith(null);
    });
  });
});
