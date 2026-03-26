import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'BidXI - Home' },
  { path: 'login', component: LoginComponent, title: 'BidXI - Login' },
  { path: 'register', component: RegisterComponent, title: 'BidXI - Register' },
  { path: '**', redirectTo: '' }
];
