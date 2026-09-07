import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericDropdownModalComponent } from './generic-dropdown-modal.component';

describe('GenericDropdownModalComponent', () => {
  let component: GenericDropdownModalComponent;
  let fixture: ComponentFixture<GenericDropdownModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericDropdownModalComponent],
    })
      .overrideTemplate(GenericDropdownModalComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(GenericDropdownModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
