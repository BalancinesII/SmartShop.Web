import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let token: string | null;

  beforeEach(() => {
    token = null;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => token } }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('adds the bearer token when the user is logged in', () => {
    token = 'jwt-token';

    http.get('/api/Products').subscribe();

    const req = httpTesting.expectOne('/api/Products');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });

  it('leaves the request untouched when there is no token', () => {
    http.get('/api/Products').subscribe();

    const req = httpTesting.expectOne('/api/Products');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('keeps the original request method, body and headers', () => {
    token = 'jwt-token';

    http.post('/api/Products', { name: 'Mug' }, { headers: { 'X-Test': '1' } }).subscribe();

    const req = httpTesting.expectOne('/api/Products');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Mug' });
    expect(req.request.headers.get('X-Test')).toBe('1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });
});
