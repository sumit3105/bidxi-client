import { Component, OnInit, OnDestroy } from "@angular/core";
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

@Component({
  selector: "app-lobby-waiting-room",
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Error state -->
    <div class="wr-root" *ngIf="loadError">
      <div class="loading-screen">
        <div style="font-size:2.5rem">⚠️</div>
        <p style="color:#fc5c65;font-size:1rem;font-weight:700;margin:0">{{ loadError }}</p>
        <button class="back-btn" style="margin-top:.5rem" (click)="router.navigate(['/dashboard'])">Back to Dashboard</button>
      </div>
    </div>

    <!-- Loading -->
    <div class="wr-root" *ngIf="!lobby && !loadError">
      <div class="loading-screen">
        <div class="spinner"></div>
        <span>Loading Lobby…</span>
      </div>
    </div>

    <!-- Waiting Room -->
    <div class="wr-root" *ngIf="lobby">
      <!-- Header -->
      <header class="wr-header">
        <div class="wr-header-left">
          <button class="back-btn" (click)="router.navigate(['/dashboard'])">← Back</button>
          <div>
            <h1 class="wr-lobby-name">{{ lobby.name }}</h1>
            <span class="status-pill" [class]="lobby.status">{{ lobby.status | uppercase }}</span>
          </div>
        </div>

        <div class="wr-header-center">
          <div class="invite-block">
            <span class="inv-label">INVITE CODE</span>
            <div class="inv-code-row">
              <span class="inv-code">{{ lobby.inviteCode }}</span>
              <button class="copy-btn" (click)="copyCode()" [class.copied]="codeCopied">
                {{ codeCopied ? '✅ Copied!' : '📋 Copy' }}
              </button>
            </div>
          </div>
        </div>

        <div class="wr-header-right">
          <div class="participant-count">
            <span class="count-num">{{ lobby.participants.length }}</span>
            <span class="count-sep">/</span>
            <span class="count-max">{{ lobby.maxPlayers }}</span>
            <span class="count-label">players</span>
          </div>
          <div class="purse-info">💰 ₹{{ lobby.purse }} Cr each</div>
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
          <div class="empty-state" *ngIf="lobby.participants.length === 0">
            <div class="empty-icon">👥</div>
            <p>No participants yet. Share the invite code!</p>
          </div>

          <div class="participants-grid">
            <div
              *ngFor="let p of lobby.participants; let i = index"
              class="participant-card"
              [style.--ipl-color]="teamColor(p.iplTeam)"
              [class.is-admin]="p.userId === lobby.adminId"
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
                    <span class="admin-crown" *ngIf="p.userId === lobby.adminId">👑</span>
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
                *ngIf="isAdmin && p.userId !== currentUserId"
                class="kick-btn"
                (click)="kickParticipant(p)"
              >✕ Kick</button>
            </div>

            <!-- Empty slots -->
            <div
              *ngFor="let slot of emptySlots"
              class="participant-card empty-card"
            >
              <div class="empty-slot-icon">+</div>
              <div class="empty-slot-label">Waiting for player…</div>
            </div>
          </div>
        </section>

        <!-- Admin Controls -->
        <section class="control-section" *ngIf="isAdmin">
          <div class="control-wrap">
            <div class="control-info">
              <span class="ctrl-icon">👑</span>
              <div>
                <div class="ctrl-title">You're the host</div>
                <div class="ctrl-sub">
                  {{ canStart ? 'Ready to begin the auction!' : 'Need at least 2 players to start.' }}
                </div>
              </div>
            </div>
            <button
              class="start-btn"
              [disabled]="!canStart || auctionStarting"
              (click)="startAuction()"
            >
              <span *ngIf="!auctionStarting">🔨 Start Auction</span>
              <span *ngIf="auctionStarting">Starting…</span>
            </button>
          </div>
          <div class="error-banner" *ngIf="actionError">{{ actionError }}</div>
        </section>

        <!-- Non-admin message -->
        <section class="control-section" *ngIf="!isAdmin">
          <div class="waiting-msg">
            <span class="spin-ball">🏏</span>
            Waiting for the host to start the auction…
          </div>
        </section>
      </main>
    </div>
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
        cursor: pointer; transition: all 0.2s;
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
  lobby: LobbyDTO | null = null;
  isAdmin = false;
  currentUserId = "";
  codeCopied = false;
  actionError = "";
  auctionStarting = false;
  loadError = "";


  private ws: WebSocket | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private lobbyService: LobbyService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/dashboard"]);
      return;
    }

    const raw = localStorage.getItem("bidxi_user");
    if (raw) {
      try { this.currentUserId = JSON.parse(raw).id; } catch { /* noop */ }
    }

    // ── Instant render: use lobby data passed via router state (from dashboard) ──
    // This avoids any spinner — the page renders the moment navigation completes.
    const statelobby = (history.state as { lobby?: LobbyDTO }).lobby;
    if (statelobby) {
      this.lobby = statelobby;
      this.isAdmin = this.lobby.adminId === this.currentUserId;
    }

    // Load initial state then connect to WebSocket for updates
    this.loadLobby(id);
    this.connectWebSocket(id);
  }

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  connectWebSocket(id: string): void {
    // Determine WS protocol (ws:// or wss://) based on current HTTP protocol
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // For local dev Hardcode to localhost:8080/api... if we want, or use relative to host
    const wsUrl = `ws://localhost:8080/api/lobbies/${id}/ws?token=${this.authService.getToken()}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "LOBBY_UPDATED") {
          this.lobby = data.payload;
          this.lobby!.participants = this.lobby!.participants ?? [];
          this.isAdmin = this.lobby!.adminId === this.currentUserId;

          if (this.lobby!.status === "active") {
            this.router.navigate([`/lobbies/${id}/auction`]);
          } else if (this.lobby!.status === "completed") {
            localStorage.removeItem("bidxi_current_lobby");
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected. Retrying in 5s...");
      // Simple reconnect logic if disconnected before active
      setTimeout(() => {
        if (!this.lobby || this.lobby.status === "waiting") {
          this.connectWebSocket(id);
        }
      }, 5000);
    };
  }

  loadLobby(id: string): void {
    this.lobbyService.getLobby(id).subscribe({
      next: (res) => {
        this.loadError = "";
        this.lobby = res.data;
        this.lobby.participants = this.lobby.participants ?? [];
        this.isAdmin = this.lobby.adminId === this.currentUserId;
        localStorage.setItem("bidxi_current_lobby", id);
        // Auto-redirect when auction starts
        if (this.lobby.status === "active") {
          localStorage.setItem("bidxi_current_lobby", id); // keep for auction page
          this.router.navigate([`/lobbies/${id}/auction`]);
        } else if (this.lobby.status === "completed") {
          localStorage.removeItem("bidxi_current_lobby");
        }
      },
      error: (err: Error) => {
        this.loadError = err.message || "Failed to load lobby.";
        console.error("[WaitingRoom] loadLobby error:", err);
      },
    });
  }

  get canStart(): boolean {
    return !!this.lobby && this.lobby.participants.length >= 2 && this.lobby.status === "waiting";
  }

  get emptySlots(): number[] {
    if (!this.lobby) return [];
    const empty = this.lobby.maxPlayers - this.lobby.participants.length;
    return Array.from({ length: Math.max(0, Math.min(empty, 4)) }, (_, i) => i);
  }

  teamColor(code: string): string {
    return IPL_TEAM_MAP[code]?.color ?? "#4a5568";
  }

  teamColorFade(code: string): string {
    const c = IPL_TEAM_MAP[code]?.color ?? "#4a5568";
    return c + "22"; // 13% opacity hex
  }

  teamLabel(code: string): string {
    return IPL_TEAM_MAP[code]?.label ?? code;
  }

  avatarLetter(p: ParticipantDTO): string {
    return (p.username || p.teamName || "P").charAt(0).toUpperCase();
  }

  copyCode(): void {
    if (!this.lobby) return;
    navigator.clipboard.writeText(this.lobby.inviteCode).then(() => {
      this.codeCopied = true;
      setTimeout(() => (this.codeCopied = false), 2500);
    });
  }

  kickParticipant(p: ParticipantDTO): void {
    if (!this.lobby) return;
    this.actionError = "";
    this.lobbyService.kickParticipant(this.lobby.id, p.userId).subscribe({
      next: () => this.loadLobby(this.lobby!.id),
      error: (err: Error) => (this.actionError = err.message || "Unable to kick participant"),
    });
  }

  startAuction(): void {
    if (!this.lobby || !this.canStart) return;
    this.actionError = "";
    this.auctionStarting = true;
    this.lobbyService.startAuction(this.lobby.id).subscribe({
      next: () => {
        // loadLobby poll will detect status=active and redirect
        this.loadLobby(this.lobby!.id);
      },
      error: (err: Error) => {
        this.auctionStarting = false;
        this.actionError = err.message || "Unable to start auction";
      },
    });
  }
}
