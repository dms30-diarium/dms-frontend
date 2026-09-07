import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionDetailsComponent } from './collection-details.component';

describe('CollectionDetailsComponent', () => {
  let component: CollectionDetailsComponent;
  let fixture: ComponentFixture<CollectionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionDetailsComponent],
    })
      .overrideTemplate(CollectionDetailsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CollectionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
