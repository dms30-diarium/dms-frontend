import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NavbarRemindersComponent } from './navbar-reminders.component';
import { CasesService } from '@app/core/services/cases.service';
import { makeWorkflowInfo, makeSearchResult } from '@app/shared/testing/mock-factories';

describe('NavbarRemindersComponent', () => {
  let component: NavbarRemindersComponent;
  let fixture: ComponentFixture<NavbarRemindersComponent>;
  let casesSpy: jasmine.SpyObj<CasesService>;
  let router: Router;

  function createComponent(): void {
    fixture = TestBed.createComponent(NavbarRemindersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    casesSpy = jasmine.createSpyObj('CasesService', ['getAllTasks']);
    casesSpy.getAllTasks.and.returnValue(of(makeSearchResult({ entries: [], resultsCount: 0 })));

    await TestBed.configureTestingModule({
      imports: [NavbarRemindersComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CasesService, useValue: casesSpy },
      ],
    })
      .overrideTemplate(NavbarRemindersComponent, '<div></div>')
      .compileComponents();

    router = TestBed.inject(Router);
    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls getAllTasks(200, 0) on init', () => {
    expect(casesSpy.getAllTasks).toHaveBeenCalledWith(200, 0);
  });

  it('starts with reminder popup closed', () => {
    expect(component.isReminderPopupOpen()).toBeFalse();
  });

  describe('toggleReminderPopup', () => {
    it('opens the popup', () => {
      component.toggleReminderPopup();
      expect(component.isReminderPopupOpen()).toBeTrue();
    });

    it('closes the popup when already open', () => {
      component.toggleReminderPopup();
      component.toggleReminderPopup();
      expect(component.isReminderPopupOpen()).toBeFalse();
    });
  });

  describe('openReminderDocument', () => {
    it('closes popup and navigates to the document', () => {
      spyOn(router, 'navigate');
      component.isReminderPopupOpen.set(true);
      component.openReminderDocument('doc-uid-123');
      expect(component.isReminderPopupOpen()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/doc/', 'doc-uid-123']);
    });
  });

  describe('computed signals', () => {
    it('notificationItems starts empty', () => {
      expect(component.notificationItems()).toEqual([]);
    });

    it('reminderCount starts at 0', () => {
      expect(component.reminderCount()).toBe('0');
    });

    it('reminderBadgeLabel includes the count', () => {
      expect(component.reminderBadgeLabel()).toBe('0 påminnelser idag');
    });

    it('reminderCount reflects total after reminders are set', () => {
      component.todayReminderItems.set([
        {
          kind: 'workflow',
          id: 'r1',
          type: 'Deadline',
          workflowType: 'Test',
          title: 'Doc 1',
          deadlineDate: '2026-06-24',
          targetDocumentId: 'doc-1',
        },
        {
          kind: 'workflow',
          id: 'r2',
          type: 'Påminnelse',
          workflowType: 'Test',
          title: 'Doc 2',
          deadlineDate: '2026-06-24',
          targetDocumentId: 'doc-2',
        },
      ]);
      expect(component.reminderCount()).toBe('2');
      expect(component.reminderBadgeLabel()).toBe('2 påminnelser idag');
    });
  });

  describe('DeadlineOchPaminnelse task mapping', () => {
    it('adds a Deadline item when deadline date is today', () => {
      const today = new Date();
      const past = new Date('2000-01-01');

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                id: 'task-1',
                workflowModelName: 'DeadlineOchPaminnelse',
                workflowTitle: 'Deadline',
                targetDocumentIds: [{ uid: 'doc-1', title: 'My Doc' }],
                variables: { deadline: today, paminnelse: past },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      const items = component.todayReminderItems();
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('Deadline');
      expect(items[0].targetDocumentId).toBe('doc-1');
    });

    it('adds a Påminnelse item when paminnelse date is today', () => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 7);

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'DeadlineOchPaminnelse',
                targetDocumentIds: [{ uid: 'doc-2', title: 'Doc 2' }],
                variables: { deadline: future, paminnelse: today },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      const items = component.todayReminderItems();
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('Påminnelse');
    });

    it('adds both items when both deadline and paminnelse are today', () => {
      const today = new Date();

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'DeadlineOchPaminnelse',
                targetDocumentIds: [{ uid: 'doc-3', title: 'Doc 3' }],
                variables: { deadline: today, paminnelse: today },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      expect(component.todayReminderItems().length).toBe(2);
    });

    it('sets no reminders when both dates are in the past', () => {
      const past = new Date('2000-01-01');

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'DeadlineOchPaminnelse',
                variables: { deadline: past, paminnelse: past },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      expect(component.todayReminderItems()).toEqual([]);
    });
  });

  describe('AllmantArbetsflode task mapping', () => {
    it('adds a Påminnelse item when paminnelseDatum is today', () => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 3);

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'AllmantArbetsflode',
                workflowTitle: 'Allmänt arbetsflöde',
                targetDocumentIds: [{ uid: 'doc-4', title: 'Doc 4' }],
                variables: {
                  deadline: future,
                  paminnelse: future,
                  paminnelseDatum: today,
                  forfalloDatum: future,
                  valdAtgard: { properties: { label: 'Granska' } },
                },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      const items = component.todayReminderItems();
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('Påminnelse');
    });

    it('adds a Deadline item when forfalloDatum is today', () => {
      const today = new Date();
      const past = new Date('2000-01-01');

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'AllmantArbetsflode',
                targetDocumentIds: [{ uid: 'doc-5', title: 'Doc 5' }],
                variables: {
                  deadline: today,
                  paminnelse: today,
                  paminnelseDatum: past,
                  forfalloDatum: today,
                  valdAtgard: { properties: { label: 'Åtgärd' } },
                },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      const items = component.todayReminderItems();
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('Deadline');
    });

    it('skips AllmantArbetsflode tasks missing paminnelseDatum', () => {
      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'AllmantArbetsflode',
                variables: {
                  deadline: new Date(),
                  paminnelse: new Date(),
                  forfalloDatum: new Date(),
                  valdAtgard: { properties: { label: 'Granska' } },
                  // paminnelseDatum missing
                },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      expect(component.todayReminderItems()).toEqual([]);
    });

    it('skips AllmantArbetsflode tasks missing valdAtgard', () => {
      const today = new Date();

      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeWorkflowInfo({
                workflowModelName: 'AllmantArbetsflode',
                variables: {
                  deadline: today,
                  paminnelse: today,
                  paminnelseDatum: today,
                  forfalloDatum: today,
                  // valdAtgard missing
                },
              }),
            ],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      expect(component.todayReminderItems()).toEqual([]);
    });
  });

  describe('unknown workflow type', () => {
    it('produces no reminder items', () => {
      casesSpy.getAllTasks.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeWorkflowInfo({ workflowModelName: 'SomeOtherWorkflow' })],
            resultsCount: 1,
          })
        )
      );

      createComponent();

      expect(component.todayReminderItems()).toEqual([]);
    });
  });
});
