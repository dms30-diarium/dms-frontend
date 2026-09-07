import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CustomMetadataFieldComponent } from './custom-metadata-field.component';

describe('CustomMetadataFieldComponent', () => {
  let component: CustomMetadataFieldComponent;
  let fixture: ComponentFixture<CustomMetadataFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomMetadataFieldComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    })
      .overrideTemplate(CustomMetadataFieldComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CustomMetadataFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
