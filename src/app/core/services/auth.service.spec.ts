import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let http: HttpTestingController;

  const adminResponse: AuthResponse = { token: 'jwt-token', email: 'admin@smartshop.dev', role: 'Admin' };

  // The service reads localStorage in its constructor, so tests that need a
  // stored session must seed it before calling this.
  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts logged out when nothing is stored', () => {
    const service = createService();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.isAdmin()).toBe(false);
    expect(service.userEmail()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('restores a stored session on startup', () => {
    localStorage.setItem('smartshop_token', 'stored-token');
    localStorage.setItem('smartshop_email', 'customer@smartshop.dev');
    localStorage.setItem('smartshop_role', 'Customer');

    const service = createService();

    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(false);
    expect(service.userEmail()).toBe('customer@smartshop.dev');
    expect(service.getToken()).toBe('stored-token');
  });

  it('logs in against the API and stores the session', () => {
    const service = createService();
    const credentials = { email: 'admin@smartshop.dev', password: 'secret' };

    service.login(credentials).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/Auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    req.flush(adminResponse);

    expect(service.getToken()).toBe('jwt-token');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.userEmail()).toBe('admin@smartshop.dev');
  });

  it('registers against the API and stores the session', () => {
    const service = createService();
    const request = { email: 'new@smartshop.dev', password: 'secret', firstName: 'Ada', lastName: 'Lovelace' };

    service.register(request).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/Auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ token: 'new-token', email: 'new@smartshop.dev', role: 'Customer' });

    expect(service.getToken()).toBe('new-token');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });

  it('does not store anything when login fails', () => {
    const service = createService();

    service.login({ email: 'admin@smartshop.dev', password: 'wrong' }).subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/Auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('clears the session on logout', () => {
    const service = createService();
    service.login({ email: 'admin@smartshop.dev', password: 'secret' }).subscribe();
    http.expectOne(`${environment.apiUrl}/Auth/login`).flush(adminResponse);

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.isAdmin()).toBe(false);
    expect(localStorage.getItem('smartshop_email')).toBeNull();
    expect(localStorage.getItem('smartshop_role')).toBeNull();
  });
});
