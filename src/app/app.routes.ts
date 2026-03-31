import { Routes } from "@angular/router";
import { HomeComponent } from "./features/home/home.component";
import { LoginComponent } from "./features/auth/login/login.component";
import { RegisterComponent } from "./features/auth/register/register.component";
import { LobbyDashboardComponent } from "./features/lobby/dashboard.component";
import { LobbyWaitingRoomComponent } from "./features/lobby/waiting-room.component";
import { AuctionRoomComponent } from "./features/lobby/auction-room.component";
import { authGuard, noAuthGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  { path: "", component: HomeComponent, title: "BidXI - Home" },
  {
    path: "login",
    component: LoginComponent,
    title: "BidXI - Login",
    canActivate: [noAuthGuard],
  },
  {
    path: "register",
    component: RegisterComponent,
    title: "BidXI - Register",
    canActivate: [noAuthGuard],
  },
  {
    path: "dashboard",
    component: LobbyDashboardComponent,
    title: "BidXI - Dashboard",
    canActivate: [authGuard],
  },
  {
    path: "lobbies/:id/waiting",
    component: LobbyWaitingRoomComponent,
    title: "BidXI - Lobby Waiting Room",
    canActivate: [authGuard],
  },
  {
    path: "lobbies/:id/auction",
    component: AuctionRoomComponent,
    title: "BidXI - Auction Room",
    canActivate: [authGuard],
  },
  { path: "**", redirectTo: "" },
];
