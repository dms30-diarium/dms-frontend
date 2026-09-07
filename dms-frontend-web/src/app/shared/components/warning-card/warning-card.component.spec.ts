import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarningCardComponent } from './warning-card.component';

describe('WarningCardComponent', () => {
  let component: WarningCardComponent;
  let fixture: ComponentFixture<WarningCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarningCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WarningCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
