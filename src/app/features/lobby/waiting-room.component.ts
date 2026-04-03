import { Component, OnInit, OnDestroy, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { LobbyService } from "../../core/services/lobby.service";
import { LobbyDTO, ParticipantDTO } from "../../core/models/lobby.model";
import { AuthService } from "../../core/services/auth.service";

const IPL_TEAM_MAP: Record<string, { color: string; label: string }> = {
  MI: { color: "#004BA0", label: "Mumbai Indians" },
  CSK: { color: "#FDB913", label: "Chennai Super Kings" },
  RCB: { color: "#EC1C24", label: "Royal Challengers Bengaluru" },
  KKR: { color: "#3A225D", label: "Kolkata Knight Riders" },
  DC: { color: "#0078BC", label: "Delhi Capitals" },
  PBKS: { color: "#ED1B24", label: "Punjab Kings" },
  SRH: { color: "#F26522", label: "Sunrisers Hyderabad" },
  RR: { color: "#254AA5", label: "Rajasthan Royals" },
  GT: { color: "#1B2133", label: "Gujarat Titans" },
  LSG: { color: "#A72056", label: "Lucknow Super Giants" },
};

interface WaitingRoomVM {
  lobby: LobbyDTO | null;
  isAdmin: boolean;
  wsConnected: boolean;
  loadError: string;
  kickedMessage: string;
  actionError: string;
  auctionStarting: boolean;
  codeCopied: boolean;
  currentUserId: string;
}

@Component({
  selector: "app-lobby-waiting-room",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="vm() as vm">
      <!-- Error state -->
      <div class="wr-root" *ngIf="vm.loadError">
        <div class="loading-screen">
          <div style="font-size:2.5rem">⚠️</div>
          <p style="color:#fc5c65;font-size:1rem;font-weight:700;margin:0">{{ vm.loadError }}</p>
          <button class="back-btn" style="margin-top:.5rem" (click)="router.navigate(['/dashboard'])">Back to Dashboard</button>
        </div>
      </div>

      <!-- Kicked state -->
      <div class="wr-root" *ngIf="vm.kickedMessage">
        <div class="loading-screen">
          <div style="font-size:2.5rem">🚫</div>
          <p style="color:#fc5c65;font-size:1.1rem;font-weight:700;margin:0">{{ vm.kickedMessage }}</p>
          <button class="back-btn" style="margin-top:1rem" (click)="router.navigate(['/dashboard'])">Back to Dashboard</button>
        </div>
      </div>

      <!-- Loading -->
      <div class="wr-root" *ngIf="!vm.lobby && !vm.loadError && !vm.kickedMessage">
        <div class="loading-screen">
          <div class="spinner"></div>
          <span>Loading Lobby…</span>
        </div>
      </div>

      <!-- Waiting Room -->
      <div class="wr-root" *ngIf="vm.lobby && !vm.kickedMessage">
        <!-- Header -->
        <header class="wr-header">
          <div class="wr-header-left">
            <button class="back-btn" (click)="router.navigate(['/dashboard'])">← Back</button>
            <div>
              <h1 class="wr-lobby-name">{{ vm.lobby.name }}</h1>
              <span class="status-pill" [class]="vm.lobby.status">{{ vm.lobby.status | uppercase }}</span>
            </div>
          </div>

          <div class="wr-header-center">
            <div class="invite-block">
              <span class="inv-label">INVITE CODE</span>
              <div class="inv-code-row">
                <span class="inv-code">{{ vm.lobby.inviteCode }}</span>
                <button class="copy-btn" (click)="copyCode()" [class.copied]="vm.codeCopied">
                  {{ vm.codeCopied ? '✅ Copied!' : '📋 Copy' }}
                </button>
              </div>
            </div>
          </div>

          <div class="wr-header-right">
            <div class="participant-count">
              <span class="count-num">{{ vm.lobby.participants.length }}</span>
              <span class="count-sep">/</span>
              <span class="count-max">{{ vm.lobby.maxPlayers }}</span>
              <span class="count-label">players</span>
            </div>
            <div class="purse-info">💰 ₹{{ vm.lobby.purse }} Cr each</div>
            <div class="ws-status" [class.connected]="vm.wsConnected" [class.disconnected]="!vm.wsConnected">
              <span class="ws-dot"></span>{{ vm.wsConnected ? 'Live' : 'Reconnecting…' }}
            </div>
          </div>
        </header>

        <!-- Participants Grid -->
        <main class="wr-main">
          <section class="participants-section">
            <div class="section-header">
              <h2 class="section-title">🏟️ Teams in Lobby</h2>
              <div class="live-dot" [class.pulsing]="true">
                <span class="dot"></span>LIVE
              </div>
            </div>

            <!-- Empty state -->
            <div class="empty-state" *ngIf="vm.lobby.participants.length === 0">
              <div class="empty-icon">👥</div>
              <p>No participants yet. Share the invite code!</p>
            </div>

            <div class="participants-grid">
              <div
                *ngFor="let p of vm.lobby.participants; let i = index"
                class="participant-card"
                [style.--ipl-color]="teamColor(p.iplTeam)"
                [class.is-admin]="p.userId === vm.lobby.adminId"
              >
                <!-- Card top accent bar -->
                <div class="card-accent" [style.background]="teamColor(p.iplTeam)"></div>

                <!-- Avatar + info -->
                <div class="card-body">
                  <div class="card-avatar" [style.background]="teamColor(p.iplTeam)">
                    {{ avatarLetter(p) }}
                  </div>
                  <div class="card-info">
                    <div class="card-username">
                      {{ p.username || 'Player ' + (i + 1) }}
                      <span class="admin-crown" *ngIf="p.userId === vm.lobby.adminId">👑</span>
                    </div>
                    <div class="card-teamname">{{ p.teamName }}</div>
                  </div>
                </div>

                <!-- IPL Badge -->
                <div class="ipl-badge" [style.background]="teamColorFade(p.iplTeam)" [style.border-color]="teamColor(p.iplTeam)">
                  <span class="ipl-code" [style.color]="teamColor(p.iplTeam)">{{ p.iplTeam }}</span>
                  <span class="ipl-name">{{ teamLabel(p.iplTeam) }}</span>
                </div>

                <!-- Purse -->
                <div class="card-purse">
                  <span class="purse-icon">💰</span>
                  <span class="purse-val">₹{{ p.purseRemaining }} Cr</span>
                </div>

                <!-- Kick button (admin only, not self) -->
                <button
                  *ngIf="vm.isAdmin && p.userId !== vm.currentUserId"
                  class="kick-btn"
                  (click)="kickParticipant(p)"
                >✕ Kick</button>
              </div>

              <!-- Empty slots -->
              <div
                *ngFor="let slot of getEmptySlots(vm.lobby)"
                class="participant-card empty-card"
              >
                <div class="empty-slot-icon">+</div>
                <div class="empty-slot-label">Waiting for player…</div>
              </div>
            </div>
          </section>

          <!-- Admin Controls -->
          <section class="control-section" *ngIf="vm.isAdmin">
            <div class="control-wrap">
              <div class="control-info">
                <span class="ctrl-icon">👑</span>
                <div>
                  <div class="ctrl-title">You're the host</div>
                  <div class="ctrl-sub">
                    {{ canStart(vm.lobby) ? 'Ready to begin the auction!' : 'Need at least 2 players to start.' }}
                  </div>
                </div>
              </div>
              <button
                class="start-btn"
                [disabled]="!canStart(vm.lobby) || vm.auctionStarting"
                (click)="startAuction()"
              >
                <span *ngIf="!vm.auctionStarting">🔨 Start Auction</span>
                <span *ngIf="vm.auctionStarting">Starting…</span>
              </button>
            </div>
            <div class="error-banner" *ngIf="vm.actionError">{{ vm.actionError }}</div>
          </section>

          <!-- Non-admin message -->
          <section class="control-section" *ngIf="!vm.isAdmin">
            <div class="waiting-msg">
              <span class="spin-ball">🏏</span>
              Waiting for the host to start the auction…
            </div>
          </section>
        </main>
      </div>
    </ng-container>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; background: #070c1a; color: #fff; font-family: 'Inter', 'Segoe UI', sans-serif; }

      /* ── Loading ── */
      .loading-screen {
        min-height: 100vh;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 1.2rem; color: #8a9bb0;
      }
      .spinner {
        width: 44px; height: 44px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.08);
        border-top-color: #f7b731;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ── Header ── */
      .wr-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1.5rem;
        padding: 1rem 2.5rem;
        background: rgba(255,255,255,0.03);
        border-bottom: 1px solid rgba(255,255,255,0.07);
        backdrop-filter: blur(8px);
        position: sticky; top: 0; z-index: 10;
        flex-wrap: wrap;
      }
      .wr-header-left { display: flex; align-items: center; gap: 1rem; }
      .back-btn {
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #8a9bb0; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem;
        cursor: pointer; transition: all 0.2s; font-family: inherit;
      }
      .back-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

      .wr-lobby-name {
        font-size: 1.3rem; font-weight: 800; margin: 0;
        background: linear-gradient(135deg, #fff 60%, #8a9bb0);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .status-pill {
        font-size: 0.65rem; font-weight: 700; letter-spacing: 1px;
        padding: 0.2rem 0.6rem; border-radius: 20px;
        background: rgba(255,255,255,0.08); color: #8a9bb0;
      }
      .status-pill.waiting { color: #f7b731; background: rgba(247,183,49,0.12); }
      .status-pill.active  { color: #2ecc71; background: rgba(46,204,113,0.12); }

      .wr-header-center { display: flex; align-items: center; }
      .invite-block { text-align: center; }
      .inv-label { font-size: 0.65rem; color: #4a5568; letter-spacing: 1.5px; text-transform: uppercase; display: block; margin-bottom: 4px; }
      .inv-code-row { display: flex; align-items: center; gap: 0.6rem; }
      .inv-code {
        font-size: 1.8rem; font-weight: 900; letter-spacing: 0.25em;
        color: #f7b731; text-shadow: 0 0 20px rgba(247,183,49,0.4);
      }
      .copy-btn {
        background: rgba(247,183,49,0.12); border: 1px solid rgba(247,183,49,0.25);
        color: #f7b731; font-size: 0.75rem; font-weight: 600;
        padding: 0.35rem 0.75rem; border-radius: 8px; cursor: pointer;
        transition: all 0.2s; white-space: nowrap; font-family: inherit;
      }
      .copy-btn:hover { background: rgba(247,183,49,0.22); }
      .copy-btn.copied { color: #2ecc71; border-color: rgba(46,204,113,0.3); background: rgba(46,204,113,0.1); }

      .wr-header-right { text-align: right; }
      .participant-count { display: flex; align-items: baseline; gap: 3px; font-size: 0.9rem; }
      .count-num { font-size: 1.6rem; font-weight: 800; color: #f7b731; }
      .count-sep, .count-max { color: #4a5568; }
      .count-label { font-size: 0.7rem; color: #4a5568; margin-left: 4px; }
      .purse-info { font-size: 0.75rem; color: #4a5568; margin-top: 2px; }

      /* WS connection indicator */
      .ws-status { display: flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 600; margin-top: 4px; letter-spacing: 0.5px; }
      .ws-dot { width: 6px; height: 6px; border-radius: 50%; }
      .ws-status.connected { color: #2ecc71; }
      .ws-status.connected .ws-dot { background: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
      .ws-status.disconnected { color: #fc5c65; }
      .ws-status.disconnected .ws-dot { background: #fc5c65; }

      /* ── Main ── */
      .wr-main { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 2rem; }

      .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
      .section-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
      .live-dot { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 700; color: #2ecc71; letter-spacing: 1px; }
      .dot {
        width: 8px; height: 8px; border-radius: 50%; background: #2ecc71;
        box-shadow: 0 0 6px #2ecc71;
      }
      .pulsing .dot { animation: pulse 2s infinite; }
      @keyframes pulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.5; transform:scale(0.8)} }

      /* ── Empty ── */
      .empty-state {
        text-align: center; padding: 3rem; color: #3a4a5c;
        border: 2px dashed rgba(255,255,255,0.07); border-radius: 16px;
        margin-bottom: 1rem;
      }
      .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

      /* ── Participant Cards ── */
      .participants-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 1rem;
      }
      .participant-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        overflow: hidden;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex; flex-direction: column; gap: 0;
      }
      .participant-card.is-admin {
        border-color: rgba(247,183,49,0.22);
        box-shadow: 0 0 20px rgba(247,183,49,0.07);
      }
      .participant-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.35); }

      .card-accent { height: 4px; flex-shrink: 0; }
      .card-body { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem 0.6rem; }
      .card-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; font-weight: 800; color: #fff;
        flex-shrink: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }
      .card-info { min-width: 0; }
      .card-username {
        font-size: 0.9rem; font-weight: 700;
        color: #e2e8f0;
        display: flex; align-items: center; gap: 4px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .admin-crown { font-size: 0.85rem; }
      .card-teamname { font-size: 0.75rem; color: #4a5568; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .ipl-badge {
        margin: 0 0.9rem 0.7rem;
        border-radius: 8px;
        border: 1px solid;
        padding: 0.35rem 0.6rem;
        display: flex; align-items: center; gap: 0.5rem;
      }
      .ipl-code { font-weight: 800; font-size: 0.8rem; }
      .ipl-name { font-size: 0.65rem; color: #8a9bb0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .card-purse {
        margin: 0 0.9rem 0.9rem;
        font-size: 0.8rem; color: #8a9bb0;
        display: flex; align-items: center; gap: 0.4rem;
      }
      .purse-val { font-weight: 600; color: #c8d6e5; }

      .kick-btn {
        margin: 0 0.9rem 0.9rem;
        background: rgba(252,92,101,0.1); border: 1px solid rgba(252,92,101,0.25);
        color: #fc5c65; font-size: 0.75rem; font-weight: 600;
        padding: 0.3rem 0.7rem; border-radius: 8px; cursor: pointer;
        transition: all 0.2s; font-family: inherit; align-self: flex-start;
      }
      .kick-btn:hover { background: rgba(252,92,101,0.2); }

      /* ── Empty slots ── */
      .empty-card {
        border-style: dashed;
        align-items: center; justify-content: center;
        padding: 2.5rem 1rem;
        opacity: 0.35;
        cursor: default;
      }
      .empty-card:hover { transform: none; box-shadow: none; }
      .empty-slot-icon { font-size: 1.8rem; color: #2a3a4a; }
      .empty-slot-label { font-size: 0.75rem; color: #2a3a4a; margin-top: 0.4rem; }

      /* ── Control section ── */
      .control-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; }
      .control-wrap { display: flex; align-items: center; gap: 1.5rem; justify-content: space-between; flex-wrap: wrap; }
      .control-info { display: flex; align-items: center; gap: 1rem; }
      .ctrl-icon { font-size: 1.8rem; }
      .ctrl-title { font-size: 1rem; font-weight: 700; color: #e2e8f0; }
      .ctrl-sub { font-size: 0.8rem; color: #6b7a8d; margin-top: 2px; }

      .start-btn {
        background: linear-gradient(135deg, #f7b731, #fd9644);
        border: none; color: #0a0f1e;
        font-size: 1rem; font-weight: 800;
        padding: 0.85rem 2rem; border-radius: 12px; cursor: pointer;
        transition: all 0.2s; font-family: inherit; letter-spacing: 0.3px;
        white-space: nowrap;
      }
      .start-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
      .start-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

      .error-banner {
        margin-top: 0.75rem;
        background: rgba(252,92,101,0.12); border: 1px solid rgba(252,92,101,0.3);
        border-radius: 8px; padding: 0.6rem 1rem;
        font-size: 0.85rem; color: #fc5c65;
      }

      .waiting-msg {
        display: flex; align-items: center; gap: 0.75rem;
        color: #6b7a8d; font-size: 0.95rem; font-weight: 500;
      }
      .spin-ball { font-size: 1.4rem; animation: wobble 2s infinite; display: inline-block; }
      @keyframes wobble {
        0%,100%{ transform: rotate(0deg); }
        25%{ transform: rotate(-15deg); }
        75%{ transform: rotate(15deg); }
      }

      @media (max-width: 640px) {
        .wr-header { padding: 0.75rem 1rem; gap: 0.75rem; }
        .inv-code { font-size: 1.4rem; }
        .wr-main { padding: 1rem; }
        .participants-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      }
    `,
  ],
})
export class LobbyWaitingRoomComponent implements OnInit, OnDestroy {
  // --- Signals for State ---
  private lobbySig = signal<LobbyDTO | null>(null);
  private wsConnectedSig = signal<boolean>(false);
  private kickedMessageSig = signal<string>("");
  private loadErrorSig = signal<string>("");
  private actionErrorSig = signal<string>("");
  private auctionStartingSig = signal<boolean>(false);
  private codeCopiedSig = signal<boolean>(false);
  private currentUserIdSig = signal<string>("");

  vm = computed(() => {
    const lobby = this.lobbySig();
    const currentUserId = this.currentUserIdSig();
    return {
      lobby,
      isAdmin: lobby ? lobby.adminId === currentUserId : false,
      wsConnected: this.wsConnectedSig(),
      loadError: this.loadErrorSig(),
      kickedMessage: this.kickedMessageSig(),
      actionError: this.actionErrorSig(),
      auctionStarting: this.auctionStartingSig(),
      codeCopied: this.codeCopiedSig(),
      currentUserId,
    };
  });

  private ws: WebSocket | null = null;
  private lobbyId = "";
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private lobbyService: LobbyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/dashboard"]);
      return;
    }
    this.lobbyId = id;

    const raw = localStorage.getItem("bidxi_user");
    if (raw) {
      try { this.currentUserIdSig.set(JSON.parse(raw).id); } catch { /* noop */ }
    }

    // Instant render from router state
    const statelobby = (history.state as { lobby?: LobbyDTO }).lobby;
    if (statelobby) {
      this.lobbySig.set(statelobby);
    }

    this.loadLobby(id);
    this.connectWebSocket(id);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  connectWebSocket(id: string): void {
    if (this.destroyed) return;

    if (this.ws) { this.ws.close(); this.ws = null; }

    const wsUrl = `ws://localhost:8080/api/lobbies/${id}/ws?token=${this.authService.getToken()}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.wsConnectedSig.set(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const currentUserId = this.currentUserIdSig();

        if (data.type === "KICKED") {
          this.kickedMessageSig.set(data.payload?.reason || "You have been removed from the lobby by the host.");
          this.lobbySig.set(null);
          this.ws?.close();
          this.ws = null;
          return;
        }

        if (data.type === "LOBBY_UPDATED") {
          const lobby = data.payload as LobbyDTO;
          lobby.participants = lobby.participants ?? [];
          this.lobbySig.set(lobby);

          const isAdmin = lobby.adminId === currentUserId;
          const stillIn = lobby.participants.some(p => p.userId === currentUserId);

          if (!stillIn && !isAdmin) {
            this.kickedMessageSig.set("You have been removed from this lobby.");
            this.lobbySig.set(null);
            this.ws?.close();
            this.ws = null;
            return;
          }

          if (lobby.status === "active") {
            this.router.navigate([`/lobbies/${id}/auction`]);
          } else if (lobby.status === "completed") {
            localStorage.removeItem("bidxi_current_lobby");
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    this.ws.onerror = () => {
      this.wsConnectedSig.set(false);
    };

    this.ws.onclose = () => {
      this.wsConnectedSig.set(false);
      if (!this.destroyed && !this.kickedMessageSig()) {
        setTimeout(() => {
          if (!this.destroyed && (!this.lobbySig() || this.lobbySig()!.status === "waiting")) {
            this.connectWebSocket(id);
          }
        }, 3000);
      }
    };
  }

  loadLobby(id: string): void {
    this.lobbyService.getLobby(id).subscribe({
      next: (res) => {
        const lobby = res.data;
        lobby.participants = lobby.participants ?? [];
        this.loadErrorSig.set("");
        this.lobbySig.set(lobby);
        localStorage.setItem("bidxi_current_lobby", id);

        if (lobby.status === "active") {
          this.router.navigate([`/lobbies/${id}/auction`]);
        } else if (lobby.status === "completed") {
          localStorage.removeItem("bidxi_current_lobby");
        }
      },
      error: (err: Error) => {
        this.loadErrorSig.set(err.message || "Failed to load lobby.");
      },
    });
  }

  canStart(lobby: LobbyDTO | null): boolean {
    return !!lobby && lobby.participants.length >= 2 && lobby.status === "waiting";
  }

  getEmptySlots(lobby: LobbyDTO | null): number[] {
    if (!lobby) return [];
    const empty = lobby.maxPlayers - lobby.participants.length;
    return Array.from({ length: Math.max(0, Math.min(empty, 4)) }, (_, i) => i);
  }

  teamColor(code: string): string {
    return IPL_TEAM_MAP[code]?.color ?? "#4a5568";
  }

  teamColorFade(code: string): string {
    const c = IPL_TEAM_MAP[code]?.color ?? "#4a5568";
    return c + "22";
  }

  teamLabel(code: string): string {
    return IPL_TEAM_MAP[code]?.label ?? code;
  }

  avatarLetter(p: ParticipantDTO): string {
    return (p.username || p.teamName || "P").charAt(0).toUpperCase();
  }

  copyCode(): void {
    const lobby = this.lobbySig();
    if (!lobby) return;
    navigator.clipboard.writeText(lobby.inviteCode).then(() => {
      this.codeCopiedSig.set(true);
      setTimeout(() => this.codeCopiedSig.set(false), 2500);
    });
  }

  kickParticipant(p: ParticipantDTO): void {
    const lobby = this.lobbySig();
    if (!lobby) return;
    this.actionErrorSig.set("");
    this.lobbyService.kickParticipant(lobby.id, p.userId).subscribe({
      next: () => {},
      error: (err: Error) => this.actionErrorSig.set(err.message || "Unable to kick participant"),
    });
  }

  startAuction(): void {
    const lobby = this.lobbySig();
    if (!lobby || !this.canStart(lobby)) return;
    this.actionErrorSig.set("");
    this.auctionStartingSig.set(true);
    this.lobbyService.startAuction(lobby.id).subscribe({
      next: () => {},
      error: (err: Error) => {
        this.auctionStartingSig.set(false);
        this.actionErrorSig.set(err.message || "Unable to start auction");
      },
    });
  }
}
