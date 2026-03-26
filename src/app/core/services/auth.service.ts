import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UserDTO,
  ApiSuccess,
} from '../models/auth.model';

const TOKEN_KEY = 'bidxi_token';
const USER_KEY  = 'bidxi_user';
const API_BASE  = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isLoggedIn = signal<boolean>(this.hasToken());
  private _currentUser = signal<UserDTO | null>(this.loadUser());

  readonly isLoggedIn  = this._isLoggedIn.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  constructor(private http: HttpClient) {}

  register(req: RegisterRequest): Observable<ApiSuccess<AuthResponse>> {
    return this.http
      .post<ApiSuccess<AuthResponse>>(`${API_BASE}/auth/register`, req)
      .pipe(catchError(this.handleError));
  }

  login(req: LoginRequest): Observable<ApiSuccess<AuthResponse>> {
    return this.http
      .post<ApiSuccess<AuthResponse>>(`${API_BASE}/auth/login`, req)
      .pipe(
        tap((res) => this.saveSession(res.data)),
        catchError(this.handleError)
      );
  }

  getMe(): Observable<ApiSuccess<UserDTO>> {
    return this.http
      .get<ApiSuccess<UserDTO>>(`${API_BASE}/auth/me`)
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private saveSession(data: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this._isLoggedIn.set(true);
    this._currentUser.set(data.user);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  private loadUser(): UserDTO | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private handleError(err: { error?: { message?: string; error?: string }; status?: number }) {
    const message =
      err?.error?.message ||
      err?.error?.error ||
      'An unexpected error occurred. Please try again.';
    return throwError(() => new Error(message));
  }
}
