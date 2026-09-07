import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UtkastReviewComponent } from './utkast-review.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { UserService } from '@app/core/services/users.service';
import { UserSuggestion } from '@app/core/services/users.service';
import { UserSuggestion as ApiUserSuggestion } from '@app/shared/api/nuxeo-api.types';

const apiUserSuggestion: ApiUserSuggestion = { id: 'u1', displayLabel: 'Alice', 'entity-type': 'user' };
const alice: UserSuggestion = {
  id: 'u1',
  username: 'u1',
  displayLabel: 'Alice',
  email: 'alice@example.com',
  company: 'Org',
  type: 'USER_TYPE',
  prefixed_id: 'user:u1',
};

describe('UtkastReviewComponent', () => {
  let component: UtkastReviewComponent;
  let fixture: ComponentFixture<UtkastReviewComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let userSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'createWorkflow']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.createWorkflow.and.returnValue(of([apiUserSuggestion]));

    userSpy = jasmine.createSpyObj('UserService', ['getcoworkers']);
    userSpy.getcoworkers.and.returnValue(of([alice]));

    await TestBed.configureTestingModule({
      imports: [UtkastReviewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: UserService, useValue: userSpy },
      ],
    })
      .overrideTemplate(UtkastReviewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(UtkastReviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('docId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads coworker suggestions', () => {
      expect(component.anvandareSuggestions()?.length).toBe(1);
      expect(component.anvandareSuggestions()?.[0].label).toBe('Alice');
    });
  });

  describe('form', () => {
    it('has anvandare, beskrivning, multipel controls', () => {
      expect(component.form.contains('anvandare')).toBeTrue();
      expect(component.form.contains('beskrivning')).toBeTrue();
      expect(component.form.contains('multipel')).toBeTrue();
    });

    it('multipel defaults to false', () => {
      expect(component.form.value.multipel).toBeFalse();
    });
  });

  describe('onSave', () => {
    it('calls createWorkflow with docId and payload', () => {
      component.form.get('anvandare')!.setValue([{ id: 'u1', label: 'Alice' }]);
      component.form.get('beskrivning')!.setValue('desc text');
      component.onSave();
      expect(apiSpy.createWorkflow).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          'entity-type': 'workflow',
          variables: jasmine.objectContaining({ anvandare: ['u1'], beskrivning: 'desc text' }),
        })
      );
    });

    it('emits reloadDoc and closeDialog on success', () => {
      const reloadSpy = jasmine.createSpy('reload');
      const closeSpy = jasmine.createSpy('close');
      component.reloadDoc.subscribe(reloadSpy);
      component.closeDialog.subscribe(closeSpy);
      component.onSave();
      expect(reloadSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('uses workflowModelName from input', () => {
      fixture.componentRef.setInput('workflowModelName', 'StickaForGodkannande');
      fixture.detectChanges();
      component.onSave();
      expect(apiSpy.createWorkflow).toHaveBeenCalledWith(
        'doc-1',
        jasmine.objectContaining({
          workflowModelName: 'StickaForGodkannande',
        })
      );
    });
  });
});
