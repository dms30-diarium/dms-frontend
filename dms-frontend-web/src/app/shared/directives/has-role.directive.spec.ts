import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '@app/core/services/auth.service';
import { AppRole } from '../models/roles';

function makeAuthMock() {
  return { activeRole: signal<AppRole | null>(null) };
}

@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: ` <div *nuxeoHasRole="requiredRoles" id="protected">Protected content</div> `,
})
class HostComponent {
  requiredRoles: AppRole | AppRole[] = 'REGISTRATOR';
}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let authMock: ReturnType<typeof makeAuthMock>;

  beforeEach(async () => {
    authMock = makeAuthMock();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  it('does not render the template when the active role does not match', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#protected')).toBeNull();
  });

  it('renders the template once the active role matches', () => {
    fixture.detectChanges();
    authMock.activeRole.set('REGISTRATOR');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#protected')).not.toBeNull();
  });

  it('removes the template again once the role no longer matches', () => {
    authMock.activeRole.set('REGISTRATOR');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#protected')).not.toBeNull();

    authMock.activeRole.set('HANDLAGGARE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#protected')).toBeNull();
  });

  it('matches when the required role is provided as an array', () => {
    fixture.componentInstance.requiredRoles = ['HANDLAGGARE', 'REGISTRATOR'];
    authMock.activeRole.set('HANDLAGGARE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#protected')).not.toBeNull();
  });
});
