import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeletePermissionDialogComponent } from './delete-permission-dialog.component';

describe('DeletePermissionDialogComponent', () => {
  let component: DeletePermissionDialogComponent;
  let fixture: ComponentFixture<DeletePermissionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletePermissionDialogComponent],
    })
      .overrideTemplate(DeletePermissionDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DeletePermissionDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('principal', 'Alice');
    fixture.componentRef.setInput('right', 'Read');
    fixture.componentRef.setInput('timeFrame', 'Permanent');
    fixture.componentRef.setInput('grantedBy', 'Bob');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the provided inputs', () => {
    expect(component.principal()).toBe('Alice');
    expect(component.right()).toBe('Read');
    expect(component.timeFrame()).toBe('Permanent');
    expect(component.grantedBy()).toBe('Bob');
  });
});
