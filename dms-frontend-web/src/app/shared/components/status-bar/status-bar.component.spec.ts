import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBarComponent } from './status-bar.component';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { Option } from '@app/shared/commonTypes';

describe('StatusBarComponent', () => {
  let component: StatusBarComponent;
  let fixture: ComponentFixture<StatusBarComponent>;

  const states: Option[] = [
    { id: 'oppet', label: 'Öppet' },
    { id: 'underHandlaggning', label: 'Under handläggning' },
    { id: 'beslutat', label: 'Beslutat' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
    })
      .overrideTemplate(StatusBarComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(StatusBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('states', states);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('treats an undefined currentState as not closed with zero completed steps', () => {
    expect(component.isClosed()).toBeFalse();
    expect(component.completedSteps()).toBe(0);
  });

  it('marks the case as closed when currentState is stangt', () => {
    fixture.componentRef.setInput('currentState', NUXEO_VOCAB_IDS.arendestatus.stangt);
    expect(component.isClosed()).toBeTrue();
    expect(component.completedSteps()).toBe(states.length);
  });

  it('computes completed steps based on the matching state index', () => {
    fixture.componentRef.setInput('currentState', 'underHandlaggning');
    expect(component.isClosed()).toBeFalse();
    expect(component.completedSteps()).toBe(2);
  });

  it('returns zero completed steps for an unrecognized state', () => {
    fixture.componentRef.setInput('currentState', 'unknownState');
    expect(component.completedSteps()).toBe(0);
  });
});
