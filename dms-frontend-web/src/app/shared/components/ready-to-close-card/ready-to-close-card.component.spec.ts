import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadyToCloseCardComponent } from './ready-to-close-card.component';

describe('ReadyToCloseCardComponent', () => {
  let component: ReadyToCloseCardComponent;
  let fixture: ComponentFixture<ReadyToCloseCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadyToCloseCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadyToCloseCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
