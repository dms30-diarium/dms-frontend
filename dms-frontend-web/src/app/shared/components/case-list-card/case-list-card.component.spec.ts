import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseListCardComponent } from './case-list-card.component';

describe('CaseListCardComponent', () => {
  let component: CaseListCardComponent;
  let fixture: ComponentFixture<CaseListCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseListCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseListCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('gridItems', [
      { title: 'Test Case', status: 'Active', date: '2025-01-01', channel: 'Web', link: '/test' },
    ]);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
