import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowOverviewComponent } from './workflow-overview.component';
import { makeWorkflowInfo } from '@app/shared/testing/mock-factories';

describe('WorkflowOverviewComponent', () => {
  let component: WorkflowOverviewComponent;
  let fixture: ComponentFixture<WorkflowOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowOverviewComponent],
    })
      .overrideTemplate(WorkflowOverviewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(WorkflowOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible input defaults', () => {
    expect(component.reminders()).toBeUndefined();
    expect(component.deadlines()).toBeUndefined();
    expect(component.runningWorkflows()).toBeNull();
    expect(component.deadlineCommentGroups()).toBeUndefined();
    expect(component.pendingTasks()).toBeUndefined();
  });

  it('reflects provided inputs', () => {
    const workflow = makeWorkflowInfo({ id: 'wf-1' });
    fixture.componentRef.setInput('runningWorkflows', [workflow]);
    fixture.componentRef.setInput('reminders', [new Date('2026-06-15')]);
    fixture.componentRef.setInput('deadlines', [new Date('2026-06-20')]);
    fixture.componentRef.setInput('pendingTasks', [workflow]);
    fixture.componentRef.setInput('deadlineCommentGroups', [{ date: '2026-06-20', description: 'desc' }]);

    expect(component.runningWorkflows()).toEqual([workflow]);
    expect(component.reminders()?.length).toBe(1);
    expect(component.deadlines()?.length).toBe(1);
    expect(component.pendingTasks()).toEqual([workflow]);
    expect(component.deadlineCommentGroups()?.[0].description).toBe('desc');
  });

  it('emits reloadDocument', () => {
    const spy = jasmine.createSpy('reloadDocument');
    component.reloadDocument.subscribe(spy);
    component.reloadDocument.emit();
    expect(spy).toHaveBeenCalled();
  });
});
