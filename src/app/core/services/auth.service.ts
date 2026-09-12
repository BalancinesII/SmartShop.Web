import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

const TOKEN_KEY = 'smartshop_token';
const EMAIL_KEY = 'smartshop_email';
const ROLE_KEY = 'smartshop_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal reactivo: cualquier componente que lo lea se actualiza solo
  // en cuanto cambia el usuario (login/logout), sin suscripciones manuales.
  private readonly currentUser = signal<{ email: string; role: string } | null>(
    this.readStoredUser()
  );

  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  readonly userEmail = computed(() => this.currentUser()?.email ?? null);

  constructor(private http: HttpClient) {}

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/Auth/register`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/Auth/login`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(EMAIL_KEY, response.email);
    localStorage.setItem(ROLE_KEY, response.role);
    this.currentUser.set({ email: response.email, role: response.role });
  }

  private readStoredUser(): { email: string; role: string } | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    const role = localStorage.getItem(ROLE_KEY);

    if (!token || !email || !role) return null;
    return { email, role };
  }
}
