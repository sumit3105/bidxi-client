import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { LobbyService } from "../../core/services/lobby.service";
import { LobbyDTO } from "../../core/models/lobby.model";

const IPL_TEAMS = [
  { code: "MI",   name: "Mumbai Indians",             color: "#004BA0" },
  { code: "CSK",  name: "Chennai Super Kings",         color: "#FDB913" },
  { code: "RCB",  name: "Royal Challengers Bengaluru", color: "#EC1C24" },
  { code: "KKR",  name: "Kolkata Knight Riders",       color: "#3A225D" },
  { code: "DC",   name: "Delhi Capitals",              color: "#0078BC" },
  { code: "PBKS", name: "Punjab Kings",                color: "#ED1B24" },
  { code: "SRH",  name: "Sunrisers Hyderabad",         color: "#F26522" },
  { code: "RR",   name: "Rajasthan Royals",            color: "#254AA5" },
  { code: "GT",   name: "Gujarat Titans",              color: "#1B2133" },
  { code: "LSG",  name: "Lucknow Super Giants",        color: "#A72056" },
];

@Component({
  selector: "app-lobby-dashboard",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dashboard-root">
      <!-- Header -->
      <header class="top-bar">
        <span class="logo-text">🏏 BidXI</span>
        <div class="user-area" *ngIf="currentUser">
          <div class="avatar-chip">{{ currentUser.username.charAt(0).toUpperCase() }}</div>
          <span class="username-label">{{ currentUser.username }}</span>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </div>
      </header>

      <main class="panels-wrap">

        <!-- ══════════ CREATE LOBBY ══════════ -->
        <section class="panel create-panel">
          <div class="panel-icon">🎙️</div>
          <h2 class="panel-title">Create Lobby</h2>
          <p class="panel-sub">Host a private auction & invite your friends</p>

          <form [formGroup]="createForm" (ngSubmit)="createLobby()" class="bid-form">

            <!-- Lobby Name -->
            <div class="field-wrap">
              <label class="field-label">Lobby Name</label>
              <input formControlName="name" class="bid-input" placeholder="e.g. Office IPL League 2026"
                [class.error]="isInvalid(createForm.get('name'))" />
              <span class="field-error" *ngIf="isInvalid(createForm.get('name'))">Required · 3–50 chars</span>
            </div>

            <!-- Settings row -->
            <div class="field-row">
              <div class="field-wrap half">
                <label class="field-label">Max Players</label>
                <input formControlName="maxPlayers" type="number" class="bid-input" min="2" max="10" />
                <span class="field-hint">2 – 10 players</span>
              </div>
              <div class="field-wrap half">
                <label class="field-label">Purse (₹ Cr)</label>
                <input formControlName="purse" type="number" class="bid-input" min="50" max="1000" />
                <span class="field-hint">Default ₹120 Cr</span>
              </div>
            </div>

            <!-- Admin team name -->
            <div class="field-wrap">
              <label class="field-label">Your Team Name</label>
              <input formControlName="teamName" class="bid-input" placeholder="e.g. Sharma's Strikers"
                [class.error]="isInvalid(createForm.get('teamName'))" />
              <span class="field-error" *ngIf="isInvalid(createForm.get('teamName'))">Required · 3–30 chars</span>
            </div>

            <!-- Admin IPL team -->
            <div class="field-wrap">
              <label class="field-label">Your IPL Franchise</label>
              <div class="ipl-grid">
                <button *ngFor="let t of iplTeams" type="button" class="team-btn"
                  [class.selected]="createForm.get('iplTeam')?.value === t.code"
                  [style.--team-color]="t.color"
                  (click)="createForm.patchValue({ iplTeam: t.code })"
                  [title]="t.name">
                  <span class="team-code">{{ t.code }}</span>
                  <span class="team-dot" [style.background]="t.color"></span>
                </button>
              </div>
              <span class="field-error" *ngIf="isInvalid(createForm.get('iplTeam'))">Pick a franchise</span>
            </div>

            <div class="selected-team-badge" *ngIf="createForm.get('iplTeam')?.value">
              <span class="badge-dot" [style.background]="selectedCreateTeamColor"></span>
              {{ selectedCreateTeamName }}
            </div>

            <button class="btn-primary" type="submit" [disabled]="createForm.invalid || createLoading">
              <span *ngIf="!createLoading">🚀 Create Lobby</span>
              <span *ngIf="createLoading">Creating…</span>
            </button>
            <div class="error-banner" *ngIf="createError">{{ createError }}</div>
          </form>
        </section>

        <div class="divider-or"><span>OR</span></div>

        <!-- ══════════ JOIN LOBBY ══════════ -->
        <section class="panel join-panel">
          <div class="panel-icon">🎟️</div>
          <h2 class="panel-title">Join Lobby</h2>
          <p class="panel-sub">Enter the 6-letter invite code from your friend</p>

          <form [formGroup]="joinForm" (ngSubmit)="joinByCode()" class="bid-form">

            <div class="field-wrap">
              <label class="field-label">Invite Code</label>
              <input formControlName="inviteCode" class="bid-input code-input" placeholder="ABC123"
                maxlength="6" (input)="onCodeInput($event)"
                [class.error]="isInvalid(joinForm.get('inviteCode'))" />
              <span class="field-error" *ngIf="isInvalid(joinForm.get('inviteCode'))">Enter the exact 6-char code</span>
            </div>

            <div class="field-wrap">
              <label class="field-label">Your Team Name</label>
              <input formControlName="teamName" class="bid-input" placeholder="e.g. Kumar's Kings"
                [class.error]="isInvalid(joinForm.get('teamName'))" />
              <span class="field-error" *ngIf="isInvalid(joinForm.get('teamName'))">Required · 3–30 chars</span>
            </div>

            <div class="field-wrap">
              <label class="field-label">Pick Your IPL Franchise</label>
              <div class="ipl-grid">
                <button *ngFor="let t of iplTeams" type="button" class="team-btn"
                  [class.selected]="joinForm.get('iplTeam')?.value === t.code"
                  [style.--team-color]="t.color"
                  (click)="joinForm.patchValue({ iplTeam: t.code })"
                  [title]="t.name">
                  <span class="team-code">{{ t.code }}</span>
                  <span class="team-dot" [style.background]="t.color"></span>
                </button>
              </div>
              <span class="field-error" *ngIf="isInvalid(joinForm.get('iplTeam'))">Pick a franchise</span>
            </div>

            <div class="selected-team-badge" *ngIf="joinForm.get('iplTeam')?.value">
              <span class="badge-dot" [style.background]="selectedJoinTeamColor"></span>
              {{ selectedJoinTeamName }}
            </div>

            <button class="btn-accent" type="submit" [disabled]="joinForm.invalid || joinLoading">
              <span *ngIf="!joinLoading">🎯 Join Lobby</span>
              <span *ngIf="joinLoading">Joining…</span>
            </button>
            <div class="error-banner" *ngIf="joinError">{{ joinError }}</div>
          </form>
        </section>

      </main>

      <!-- ══════════ MY LOBBIES ══════════ -->
      <section class="my-lobbies-wrap" *ngIf="myLobbies.length > 0">
        <h2 class="ml-title">My Active Lobbies</h2>
        <div class="ml-grid">
          <div *ngFor="let l of myLobbies" class="ml-card" (click)="resumeLobby(l)">
            <div class="ml-header">
              <span class="ml-name">{{ l.name }}</span>
              <span class="ml-status" [class]="l.status">{{ l.status | uppercase }}</span>
            </div>
            <div class="ml-body">
              <div><span class="ml-icon">👥</span> {{ l.participants.length }} / {{ l.maxPlayers }}</div>
              <div><span class="ml-icon">💰</span> ₹{{ l.purse }} Cr</div>
            </div>
            <div class="ml-footer">
              <span class="ml-role" *ngIf="l.adminId === currentUser?.id">👑 Host</span>
              <span class="ml-role" *ngIf="l.adminId !== currentUser?.id">🎟️ Participant</span>
              <span class="ml-action">Resume ➔</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#0a0f1e; color:#fff; font-family:'Inter','Segoe UI',sans-serif; }

    .top-bar { display:flex; align-items:center; justify-content:space-between; padding:.85rem 2rem;
      background:rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.08); position:sticky; top:0; z-index:10; }
    .logo-text { font-size:1.3rem; font-weight:800;
      background:linear-gradient(135deg,#f7b731,#fd9644); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .user-area { display:flex; align-items:center; gap:.75rem; }
    .avatar-chip { width:34px; height:34px; border-radius:50%;
      background:linear-gradient(135deg,#f7b731,#fd9644); color:#0a0f1e;
      font-weight:800; display:flex; align-items:center; justify-content:center; font-size:.85rem; }
    .username-label { font-size:.85rem; color:#c8d6e5; }
    .logout-btn { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); color:#8a9bb0;
      padding:.3rem .8rem; border-radius:8px; font-size:.75rem; cursor:pointer; transition:all .2s; font-family:inherit; }
    .logout-btn:hover { background:rgba(255,255,255,.14); color:#fff; }

    .panels-wrap { display:flex; align-items:flex-start; justify-content:center;
      max-width:1000px; margin:0 auto; padding:2.5rem 1.5rem; gap:0; }

    .panel { flex:1; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09);
      border-radius:20px; padding:1.75rem 2rem 2.25rem; transition:transform .2s,box-shadow .2s; }
    .panel:hover { transform:translateY(-2px); box-shadow:0 16px 48px rgba(0,0,0,.4); }
    .create-panel { border-color:rgba(247,183,49,.2); }
    .join-panel   { border-color:rgba(74,144,226,.2); }

    .panel-icon { font-size:2rem; margin-bottom:.5rem; }
    .panel-title { font-size:1.35rem; font-weight:800; margin:0 0 .3rem;
      background:linear-gradient(135deg,#fff 60%,#8a9bb0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .panel-sub { color:#5a6a7d; font-size:.82rem; margin:0 0 1.5rem; }

    .divider-or { display:flex; align-items:center; justify-content:center;
      padding:0 1.25rem; color:#3a4a5c; font-size:.82rem; font-weight:600; flex-shrink:0; margin-top:160px; }
    .divider-or span { border:1px solid rgba(255,255,255,.08); border-radius:50%;
      width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:#0a0f1e; }

    /* Form */
    .bid-form { display:flex; flex-direction:column; gap:1.1rem; }
    .field-wrap { display:flex; flex-direction:column; gap:.35rem; }
    .field-row  { display:flex; gap:.75rem; }
    .field-wrap.half { flex:1; }
    .field-label { font-size:.72rem; font-weight:700; color:#6b7a8d; letter-spacing:.6px; text-transform:uppercase; }
    .field-hint  { font-size:.68rem; color:#3a4a5c; }
    .field-error { font-size:.7rem; color:#fc5c65; }

    .bid-input { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:10px;
      padding:.65rem .9rem; color:#fff; font-size:.9rem; outline:none; width:100%; box-sizing:border-box;
      transition:border-color .2s,box-shadow .2s; font-family:inherit; }
    .bid-input::placeholder { color:#2a3a4c; }
    .bid-input:focus { border-color:rgba(247,183,49,.5); box-shadow:0 0 0 3px rgba(247,183,49,.1); }
    .bid-input.error { border-color:rgba(252,92,101,.5); }
    .code-input { font-size:1.5rem; font-weight:800; letter-spacing:.3em; text-align:center; text-transform:uppercase; }

    /* IPL grid */
    .ipl-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:.4rem; }
    .team-btn { display:flex; flex-direction:column; align-items:center; gap:3px; padding:.5rem .2rem;
      border-radius:9px; border:2px solid rgba(255,255,255,.07); background:rgba(255,255,255,.04);
      cursor:pointer; color:#fff; font-family:inherit; transition:all .17s; }
    .team-btn:hover { border-color:var(--team-color); background:rgba(255,255,255,.09); transform:scale(1.05); }
    .team-btn.selected { border-color:var(--team-color);
      background:color-mix(in srgb,var(--team-color) 18%,transparent);
      box-shadow:0 0 10px color-mix(in srgb,var(--team-color) 30%,transparent); }
    .team-code { font-size:.65rem; font-weight:800; letter-spacing:.5px; }
    .team-dot  { width:7px; height:7px; border-radius:50%; }

    .selected-team-badge { display:flex; align-items:center; gap:.45rem;
      background:rgba(255,255,255,.05); border-radius:8px; padding:.45rem .8rem;
      font-size:.8rem; color:#c8d6e5; font-weight:600; }
    .badge-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }

    /* Buttons */
    .btn-primary,.btn-accent { display:flex; align-items:center; justify-content:center;
      padding:.8rem 1.5rem; border-radius:12px; border:none; font-size:.95rem; font-weight:700;
      cursor:pointer; transition:all .2s; font-family:inherit; }
    .btn-primary { background:linear-gradient(135deg,#f7b731,#fd9644); color:#0a0f1e; }
    .btn-primary:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
    .btn-accent  { background:linear-gradient(135deg,#4a90e2,#667eea); color:#fff; }
    .btn-accent:hover:not(:disabled)  { filter:brightness(1.1); transform:translateY(-1px); }
    .btn-primary:disabled,.btn-accent:disabled { opacity:.4; cursor:not-allowed; transform:none; }

    .error-banner { background:rgba(252,92,101,.12); border:1px solid rgba(252,92,101,.3);
      border-radius:8px; padding:.6rem .9rem; font-size:.82rem; color:#fc5c65; }

    @media(max-width:720px){
      .panels-wrap { flex-direction:column; padding:1.5rem 1rem; }
      .divider-or  { margin-top:0; padding:1rem 0; }
    }

    /* My Lobbies */
    .my-lobbies-wrap { max-width:1000px; margin:0 auto; padding:0 1.5rem 3rem; }
    .ml-title { font-size:1.2rem; font-weight:800; margin-bottom:1rem; color:#e2e8f0; }
    .ml-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem; }
    .ml-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px;
      padding:1.25rem; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; gap:.75rem; }
    .ml-card:hover { background:rgba(255,255,255,.06); border-color:rgba(247,183,49,.3); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.3); }
    .ml-header { display:flex; align-items:center; justify-content:space-between; }
    .ml-name { font-weight:700; font-size:1.05rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ml-status { font-size:.65rem; font-weight:700; padding:.2rem .5rem; border-radius:6px; background:rgba(255,255,255,.1); }
    .ml-status.waiting { color:#f7b731; background:rgba(247,183,49,.15); }
    .ml-status.active { color:#2ecc71; background:rgba(46,204,113,.15); }
    .ml-body { display:flex; gap:1.5rem; font-size:.85rem; color:#8a9bb0; }
    .ml-icon { font-size:.9rem; }
    .ml-footer { border-top:1px solid rgba(255,255,255,.06); padding-top:.75rem; display:flex; justify-content:space-between; align-items:center; font-size:.8rem; }
    .ml-role { color:#c8d6e5; font-weight:600; }
    .ml-action { color:#f7b731; font-weight:700; font-size:.75rem; opacity:.8; transition:opacity .2s; }
    .ml-card:hover .ml-action { opacity:1; }
  `],
})
export class LobbyDashboardComponent implements OnInit {
  iplTeams = IPL_TEAMS;

  createForm = this.fb.group({
    name:       ["", [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    maxPlayers: [6,  [Validators.required, Validators.min(2), Validators.max(10)]],
    purse:      [120,[Validators.required, Validators.min(50), Validators.max(1000)]],
    teamName:   ["", [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    iplTeam:    ["", [Validators.required]],
  });

  joinForm = this.fb.group({
    inviteCode: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    teamName:   ["", [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    iplTeam:    ["", [Validators.required]],
  });

  createLoading = false;
  joinLoading   = false;
  createError   = "";
  joinError     = "";
  currentUser   = this.authService.currentUser();
  myLobbies: LobbyDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private lobbyService: LobbyService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();
    this.loadMyLobbies();
  }

  loadMyLobbies(): void {
    this.lobbyService.getMyLobbies().subscribe({
      next: (res) => {
        // Only show active or waiting lobbies
        this.myLobbies = (res.data || []).filter(l => l.status !== "completed");
      },
      error: (err) => console.error("Could not load lobbies", err),
    });
  }

  resumeLobby(l: LobbyDTO): void {
    localStorage.setItem("bidxi_current_lobby", l.id);
    if (l.status === "waiting") {
      this.router.navigate([`/lobbies/${l.id}/waiting`], { state: { lobby: l } });
    } else {
      this.router.navigate([`/lobbies/${l.id}/auction`], { state: { lobby: l } });
    }
  }

  get selectedCreateTeamColor() { return IPL_TEAMS.find(t => t.code === this.createForm.get("iplTeam")?.value)?.color ?? "#fff"; }
  get selectedCreateTeamName()  { return IPL_TEAMS.find(t => t.code === this.createForm.get("iplTeam")?.value)?.name ?? ""; }
  get selectedJoinTeamColor()   { return IPL_TEAMS.find(t => t.code === this.joinForm.get("iplTeam")?.value)?.color ?? "#fff"; }
  get selectedJoinTeamName()    { return IPL_TEAMS.find(t => t.code === this.joinForm.get("iplTeam")?.value)?.name ?? ""; }

  onCodeInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value.toUpperCase();
    (e.target as HTMLInputElement).value = v;
    this.joinForm.patchValue({ inviteCode: v });
  }

  isInvalid(ctrl: AbstractControl | null): boolean { return !!ctrl && ctrl.invalid && ctrl.touched; }

  createLobby(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.createError = "";
    this.createLoading = true;
    const { name, maxPlayers, purse, teamName, iplTeam } = this.createForm.value;
    this.lobbyService.createLobby({
      name: name!, maxPlayers: maxPlayers!, purse: purse!, teamName: teamName!, iplTeam: iplTeam!,
    }).subscribe({
      next: (res) => {
        this.createLoading = false;
        localStorage.setItem("bidxi_current_lobby", res.data.id);
        this.router.navigate([`/lobbies/${res.data.id}/waiting`], { state: { lobby: res.data } });
      },
      error: (err: Error) => { this.createLoading = false; this.createError = err.message || "Unable to create lobby."; },
    });
  }

  joinByCode(): void {
    if (this.joinForm.invalid) { this.joinForm.markAllAsTouched(); return; }
    this.joinError = "";
    this.joinLoading = true;
    const { inviteCode, teamName, iplTeam } = this.joinForm.value;
    this.lobbyService.joinByCode({
      inviteCode: inviteCode!.toUpperCase(), teamName: teamName!, iplTeam: iplTeam!,
    }).subscribe({
      next: (res) => {
        this.joinLoading = false;
        localStorage.setItem("bidxi_current_lobby", res.data.id);
        this.router.navigate([`/lobbies/${res.data.id}/waiting`], { state: { lobby: res.data } });
      },
      error: (err: Error) => { this.joinLoading = false; this.joinError = err.message || "Invalid code or lobby full."; },
    });
  }

  logout(): void { this.authService.logout(); this.router.navigate(["/login"]); }
}
