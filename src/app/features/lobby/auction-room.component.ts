import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { LobbyService } from "../../core/services/lobby.service";
import { LobbyDTO } from "../../core/models/lobby.model";

@Component({
  selector: "app-auction-room",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ar-root">
      <!-- Header -->
      <header class="ar-header">
        <div class="logo">🏏 BidXI</div>
        <div class="lobby-info" *ngIf="lobby">
          <span class="lobby-name">{{ lobby.name }}</span>
          <span class="live-badge">● LIVE AUCTION</span>
        </div>
        <button class="back-btn" (click)="router.navigate(['/dashboard'])">Exit</button>
      </header>

      <!-- Coming Soon Banner -->
      <main class="ar-main">
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>

        <div class="stage-card">
          <div class="hammer-icon">🔨</div>
          <h1 class="stage-title">Auction Room</h1>
          <p class="stage-sub" *ngIf="lobby">
            <strong>{{ lobby.name }}</strong> · {{ lobby.participants.length }} teams · ₹{{ lobby.purse }} Cr each
          </p>
          <p class="stage-desc">
            The live bidding engine is coming soon. The auction room will feature:
          </p>

          <div class="feature-grid">
            <div class="feature-item">
              <span class="fi">🏃</span>
              <div>
                <div class="ft">Player Spotlight</div>
                <div class="fs">Live player card with role, nationality &amp; base price</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="fi">⏱️</span>
              <div>
                <div class="ft">10-Second RTT Timer</div>
                <div class="fs">Real-time countdown that resets on every bid</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="fi">💰</span>
              <div>
                <div class="ft">Live Bidding</div>
                <div class="fs">+5L / +10L / +25L quick bids, custom amount</div>
              </div>
            </div>
            <div class="feature-item">
              <span class="fi">📊</span>
              <div>
                <div class="ft">Purse Tracker</div>
                <div class="fs">All teams' remaining purse visible in real time</div>
              </div>
            </div>
          </div>

          <div class="teams-strip" *ngIf="lobby">
            <div
              *ngFor="let p of lobby.participants"
              class="team-chip"
              [style.border-color]="iplColor(p.iplTeam)"
            >
              <span class="tc-code" [style.color]="iplColor(p.iplTeam)">{{ p.iplTeam }}</span>
              <span class="tc-name">{{ p.teamName }}</span>
              <span class="tc-purse">₹{{ p.purseRemaining }}Cr</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #070c1a; color: #fff; font-family: 'Inter','Segoe UI',sans-serif; overflow: hidden; }

    .ar-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .logo { font-size: 1.3rem; font-weight: 800; background: linear-gradient(135deg,#f7b731,#fd9644); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .lobby-info { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .lobby-name { font-size: 1rem; font-weight: 700; color: #e2e8f0; }
    .live-badge { font-size: 0.65rem; font-weight: 700; letter-spacing: 1.5px; color: #fc5c65; animation: blink 1.2s ease-in-out infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .back-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #8a9bb0; padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all .2s; }
    .back-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .ar-main { position: relative; min-height: calc(100vh - 56px); display: flex; align-items: center; justify-content: center; padding: 2rem; }

    .glow-orb { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; }
    .orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(247,183,49,0.12), transparent 70%); top: -100px; left: -100px; }
    .orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(74,144,226,0.1), transparent 70%); bottom: -80px; right: -80px; }

    .stage-card {
      position: relative; z-index: 1;
      max-width: 780px; width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,0.5);
    }
    .hammer-icon { font-size: 3.5rem; margin-bottom: 1rem; animation: swing 2s ease-in-out infinite; display: inline-block; transform-origin: top center; }
    @keyframes swing { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} }

    .stage-title {
      font-size: 2.2rem; font-weight: 900; margin: 0 0 0.5rem;
      background: linear-gradient(135deg,#fff 40%,#f7b731); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .stage-sub { color: #8a9bb0; font-size: 0.95rem; margin: 0 0 1.5rem; }
    .stage-desc { color: #6b7a8d; font-size: 0.875rem; margin-bottom: 1.75rem; }

    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left; margin-bottom: 2rem; }
    .feature-item { display: flex; align-items: flex-start; gap: 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem; }
    .fi { font-size: 1.6rem; flex-shrink: 0; }
    .ft { font-size: 0.85rem; font-weight: 700; color: #e2e8f0; margin-bottom: 3px; }
    .fs { font-size: 0.75rem; color: #4a5568; line-height: 1.4; }

    .teams-strip { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 1.5rem; }
    .team-chip {
      display: flex; align-items: center; gap: 0.4rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid;
      border-radius: 8px; padding: 0.35rem 0.75rem;
    }
    .tc-code { font-size: 0.75rem; font-weight: 800; }
    .tc-name { font-size: 0.75rem; color: #8a9bb0; }
    .tc-purse { font-size: 0.7rem; color: #4a5568; margin-left: 4px; }

    @media (max-width: 600px) {
      .feature-grid { grid-template-columns: 1fr; }
      .stage-card { padding: 2rem 1.25rem; }
      .stage-title { font-size: 1.6rem; }
    }
  `]
})
export class AuctionRoomComponent implements OnInit, OnDestroy {
  lobby: LobbyDTO | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private readonly IPL_COLORS: Record<string, string> = {
    MI: "#004BA0", CSK: "#FDB913", RCB: "#EC1C24", KKR: "#3A225D",
    DC: "#0078BC", PBKS: "#ED1B24", SRH: "#F26522",
    RR: "#254AA5", GT: "#1B2133", LSG: "#A72056",
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private lobbyService: LobbyService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) { this.router.navigate(["/dashboard"]); return; }
    this.loadLobby(id);
    // Poll to keep lobby info fresh
    this.pollInterval = setInterval(() => this.loadLobby(id), 5000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadLobby(id: string): void {
    this.lobbyService.getLobby(id).subscribe({
      next: (res) => { this.lobby = res.data; },
      error: () => {},
    });
  }

  iplColor(code: string): string {
    return this.IPL_COLORS[code] ?? "#4a5568";
  }
}
