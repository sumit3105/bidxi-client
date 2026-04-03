import { Component, OnInit, OnDestroy, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { LobbyService } from "../../core/services/lobby.service";
import { AuthService } from "../../core/services/auth.service";
import { LobbyDTO, ParticipantDTO, SoldRecordDTO, PlayerDTO, AuctionRoomDTO } from "../../core/models/lobby.model";

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
  selector: "app-auction-room",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ar-root" *ngIf="vm() as vm">
      <!-- ══ Header ══ -->
      <header class="ar-header">
        <div class="header-left">
          <span class="logo">🏏 BidXI</span>
        </div>
        <div class="lobby-info" *ngIf="vm.lobby">
          <div class="lobby-name">{{ vm.lobby.name }}</div>
          <div class="status-indicator">
            <span class="pulse" [class.paused]="vm.auction?.status === 'paused' || !vm.auction?.isHostPresent"></span>
            {{ (!vm.auction?.isHostPresent && vm.auction?.status !== 'idle') ? 'HOST AWAY' : (vm.auction?.status?.toUpperCase() || 'IDLE') }}
          </div>
        </div>
        <div class="header-right">
          <button class="exit-btn" (click)="exitAuction()">EXIT ROOM</button>
        </div>
      </header>

      <!-- ══ Main Content ══ -->
      <main class="ar-main" *ngIf="vm.lobby">

        <!-- ═══ Sidebar (Unified) ═══ -->
        <aside class="sidebar">
          
          <div class="sb-tabs">
            <button class="tab-btn" [class.active]="vm.activeTab === 'feed'" (click)="setTab('feed')">LIVE FEED</button>
            <button class="tab-btn" [class.active]="vm.activeTab === 'squads'" (click)="setTab('squads')">SQUADS</button>
          </div>

          <div class="sb-content" [ngSwitch]="vm.activeTab">
            
            <!-- LIVE FEED TAB -->
            <div *ngSwitchCase="'feed'" class="tab-pane animate-in">
              <!-- 👥 Participants Section -->
              <section class="sb-section participants-section">
                <h4 class="section-title">TEAMS & BUDGET</h4>
                <div class="team-list">
                  <div *ngFor="let p of vm.lobby.participants" class="team-item" 
                       [class.is-highest]="vm.auction?.highestBidderId === p.userId"
                       [style.border-left-color]="iplColor(p.iplTeam)">
                    <div class="team-row">
                      <span class="team-bubble" [style.background]="iplColor(p.iplTeam)">{{ iplInitial(p.iplTeam) }}</span>
                      <div class="team-name-col">
                        <div class="username">{{ p.username }} <span class="you" *ngIf="p.userId === vm.currentUserId">YOU</span></div>
                        <div class="ipl-team">{{ p.iplTeam }}</div>
                      </div>
                      <div class="purse-col">₹{{ p.purseRemaining }} Cr</div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 📋 Upcoming Pool Section -->
              <section class="sb-section pool-section">
                <h4 class="section-title">UPCOMING POOL</h4>
                <div class="pool-list">
                  <div *ngFor="let p of vm.upcomingPool.slice(0, 5); let i = index" class="pool-item" [class.next]="i === 0">
                    <span class="p-idx">{{ i === 0 ? 'UP' : i + 1 }}</span>
                    <span class="p-name">{{ p.name }}</span>
                    <span class="p-role">{{ p.role }}</span>
                  </div>
                  <div *ngIf="vm.upcomingPool.length === 0 && vm.auction?.status !== 'completed'" class="empty-msg">Waiting for next pool...</div>
                </div>
              </section>

              <!-- 🕰️ Latest Sales Section -->
              <section class="sb-section sales-section">
                <h4 class="section-title">LATEST SALES</h4>
                <div class="sales-list">
                  <div *ngFor="let s of (vm.auction?.soldPlayers || []).slice().reverse() | slice:0:5" class="sale-item">
                    <div class="s-header">
                      <span class="s-name">{{ s.playerName }}</span>
                      <span class="s-price">₹{{ s.soldPrice }}L</span>
                    </div>
                    <div class="s-team">Bought by {{ s.iplTeam }}</div>
                  </div>
                  <div *ngIf="!vm.auction?.soldPlayers?.length" class="empty-msg">No sales yet.</div>
                </div>
              </section>
            </div>

            <!-- SQUADS TAB -->
            <div *ngSwitchCase="'squads'" class="tab-pane animate-in" style="display: flex; flex-direction: column; gap: 15px; overflow-x: hidden;">
              <div class="team-tabs" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <button *ngFor="let t of vm.squads" class="t-tab-btn" 
                  [class.active]="vm.selectedTeam === t.userID"
                  [style.border-bottom-color]="vm.selectedTeam === t.userID ? iplColor(t.iplTeam) : 'transparent'"
                  (click)="selectTeam(t.userID)">
                  {{ t.iplTeam }}
                </button>
              </div>

              <div *ngFor="let team of vm.squads" class="squad-team-block" [style.display]="vm.selectedTeam === team.userID ? 'block' : 'none'">
                <h5 class="squad-team-name" [style.color]="iplColor(team.iplTeam)">
                  <span class="online-indicator" [class.online]="vm.onlineUsers.includes(team.userID)"></span>
                  {{ team.teamName }} ({{ team.iplTeam }})
                </h5>
                <p class="squad-purse">REMAINING: ₹{{ team.purseRemaining }} Cr | PLAYERS: {{ team.squad?.length || 0 }}/25</p>
                <div class="squad-stats" style="display: flex; gap: 8px; font-size: 0.7rem; margin-bottom: 8px; padding: 0 10px;">
                  <span [style.color]="countRole(team.squad, 'WK') < 1 ? '#fc5c65' : '#2ecc71'">WK: {{ countRole(team.squad, 'WK') }}/1</span>
                  <span [style.color]="countRole(team.squad, 'BOWL') < 5 ? '#fc5c65' : '#2ecc71'">BOWL: {{ countRole(team.squad, 'BOWL') }}/5</span>
                  <span [style.color]="countRole(team.squad, 'BAT') < 5 ? '#fc5c65' : '#2ecc71'">BAT: {{ countRole(team.squad, 'BAT') }}/5</span>
                  <span [style.color]="countOverseas(team.squad) >= 8 ? '#fc5c65' : '#8a9bb0'">OVS: {{ countOverseas(team.squad) }}/8</span>
                </div>
                <div class="squad-grid" *ngIf="team.squad?.length; else emptySquad">
                  <div *ngFor="let p of team.squad" class="sq-player">
                    <img [src]="p.imageUrl" class="sq-img">
                    <div class="sq-info">
                      <div class="sq-name">{{ p.name }}</div>
                      <div class="sq-price">SOLD: ₹{{ p.soldPrice || p.basePrice }}L <span style="color:#8a9bb0; font-size: 0.5rem; text-decoration: line-through;">Base: ₹{{ p.basePrice }}L</span></div>
                    </div>
                  </div>
                </div>
                <ng-template #emptySquad>
                  <div class="sq-empty">No players bought</div>
                </ng-template>
              </div>
            </div>

          </div>

        </aside>

        <!-- ═══ Center Stage ═══ -->
        <section class="center-stage">
          
          <!-- Admin Controls HUD -->
          <div class="admin-hud" *ngIf="vm.isAdmin && vm.auction?.status !== 'idle' && vm.auction?.status !== 'paused'">
             <button class="hud-btn pause" *ngIf="vm.auction?.status === 'bidding'" (click)="toggleAuction('pause')" [disabled]="vm.actionLoading">PAUSE</button>
             <button class="hud-btn next" *ngIf="vm.auction?.status === 'sold' || vm.auction?.status === 'unsold'" (click)="toggleAuction('next')" [disabled]="vm.actionLoading">NEXT PLAYER 🔨</button>
          </div>

          <div class="spotlight-area">
            <div class="player-card" 
                 *ngIf="vm.currentPlayer" 
                 [class.is-sold]="vm.auction?.status === 'sold'"
                 [class.is-unsold]="vm.auction?.status === 'unsold'"
                 [class.hammer-shake]="(vm.auction?.timerSeconds || 0) <= 3 && vm.auction?.status === 'bidding'">
              
              <div class="p-category">{{ vm.currentPlayer.category }}</div>
              <div class="p-role-badge">{{ vm.currentPlayer.role }}</div>
              
              <img [src]="vm.currentPlayer.imageUrl" class="p-img">
              
              <div class="p-base">BASE PRICE: ₹{{ vm.currentPlayer.basePrice }}L</div>
              <div class="p-info">
                <h1 class="p-title">{{ vm.currentPlayer.name }}</h1>
                <p class="p-nat">{{ vm.currentPlayer.nationality }}</p>
              </div>
            </div>

            <div class="overlay sold" *ngIf="vm.auction?.status === 'sold'">SOLD!</div>
            <div class="overlay unsold" *ngIf="vm.auction?.status === 'unsold'">UNSOLD</div>
            
            <div class="idle-state" *ngIf="vm.auction?.status === 'idle'">
              <div class="spinner" *ngIf="!vm.isAdmin"></div>
              <p *ngIf="!vm.isAdmin">WAITING FOR ADMIN TO START</p>
              <button class="big-action-btn start animate-in" *ngIf="vm.isAdmin" (click)="toggleAuction('start')" [disabled]="vm.actionLoading">
                🚀 START AUCTION
              </button>
            </div>

            <div class="completed-state" *ngIf="vm.auction?.status === 'completed'" style="text-align: center; margin-top: 50px; background: rgba(0,0,0,0.5); padding: 30px; border-radius: 12px; border: 1px solid #ffd700;">
              <h2 style="color: #ffd700; margin-bottom: 10px; font-size: 2rem;">🏆 AUCTION COMPLETED 🏆</h2>
              <p style="color: #fff; margin-bottom: 20px;">All players have been auctioned!</p>
              <button class="big-action-btn start animate-in" (click)="setTab('squads')">
                VIEW FULL SQUADS
              </button>
            </div>
            
            <div class="paused-state" *ngIf="vm.auction?.status === 'paused'">
              <div class="pause-icon" *ngIf="!vm.isAdmin">||</div>
              <p *ngIf="!vm.isAdmin">AUCTION PAUSED BY ADMIN</p>
              <button class="big-action-btn resume animate-in" *ngIf="vm.isAdmin" (click)="toggleAuction('resume')" [disabled]="vm.actionLoading">
                ⚔️ RESUME AUCTION
              </button>
            </div>

            <!-- Host Presence Overlay -->
            <div class="host-away-overlay" *ngIf="!vm.isAdmin && !vm.auction?.isHostPresent && vm.auction?.status !== 'idle' && vm.auction?.status !== 'completed'">
              <div class="away-content">
                <div class="caution-icon">⚠️</div>
                <h2>HOST IS DISCONNECTED</h2>
                <p>The auction is temporarily closed. It will automatically resume once the Admin returns.</p>
              </div>
            </div>
          </div>

          <!-- Bidding Console -->
          <div class="bidding-console" *ngIf="vm.auction?.status === 'bidding' || vm.auction?.status === 'paused'">
            
            <div class="timer-orb" [class.critical]="(vm.auction?.timerSeconds || 0) <= 3" [class.paused]="vm.auction?.status === 'paused'">
              <span class="timer-label">{{ vm.auction?.timerSeconds }}s</span>
              <svg viewBox="0 0 100 100">
                <circle class="orb-bg" cx="50" cy="50" r="45"></circle>
                <circle class="orb-progress" cx="50" cy="50" r="45" [style.stroke-dashoffset]="283 - ((vm.auction?.timerSeconds || 0) * 28.3)"></circle>
              </svg>
            </div>

            <div class="bid-info">
              <span class="label">CURRENT BID</span>
              <div class="value">₹{{ vm.auction?.currentBid }} <small>Lakhs</small></div>
              <div class="leader" *ngIf="vm.auction?.highestBidderId">
                 <span class="dot"></span> Leading: {{ getParticipantName(vm.lobby, vm.auction?.highestBidderId || '') }}
              </div>
              <div class="leader none" *ngIf="!vm.auction?.highestBidderId">No bids yet</div>
            </div>

            <div class="bid-actions" *ngIf="vm.auction?.status === 'bidding'">
              <div class="bid-tips">MY PURSE: ₹{{ getMyPurse(vm.lobby, vm.currentUserId) }} Cr</div>
              <div class="action-row" *ngIf="vm.auction?.highestBidderId; else openingBid">
                <button class="bid-btn" (click)="placeBid((vm.auction?.currentBid || 0) + getIncrement(vm.auction?.currentBid || 0))" 
                  [disabled]="vm.actionLoading || vm.auction?.highestBidderId === vm.currentUserId || !canAfford(vm.lobby, vm.currentUserId, (vm.auction?.currentBid || 0) + getIncrement(vm.auction?.currentBid || 0))">
                  +{{ getIncrement(vm.auction?.currentBid || 0) }}L
                </button>
              </div>
              <ng-template #openingBid>
                <div class="action-row">
                  <button class="bid-btn" (click)="placeBid(vm.auction?.currentBid || 0)" 
                    [disabled]="vm.actionLoading || !canAfford(vm.lobby, vm.currentUserId, vm.auction?.currentBid || 0)">
                    BID ₹{{ vm.auction?.currentBid }}L
                  </button>
                </div>
              </ng-template>
            </div>
          </div>

        </section>

      </main>
    </div>
  `,
  styleUrls: ["./auction-room.component.css"]
})
export class AuctionRoomComponent implements OnInit, OnDestroy {
  private lobbySig = signal<LobbyDTO | null>(null);
  private auctionSig = signal<AuctionRoomDTO | null>(null);
  private currentPlayerSig = signal<PlayerDTO | null>(null);
  private upcomingPoolSig = signal<PlayerDTO[]>([]);
  private currentUserIdSig = signal<string>("");
  private actionErrorSig = signal<string>("");
  private actionLoadingSig = signal<boolean>(false);
  private activeTabSig = signal<'feed' | 'squads'>('feed');
  private squadsSig = signal<any[]>([]);
  private selectedTeamSig = signal<string>("");
  private onlineUsersSig = signal<string[]>([]);

  vm = computed(() => ({
    lobby: this.lobbySig(),
    auction: this.auctionSig(),
    currentPlayer: this.currentPlayerSig(),
    upcomingPool: this.upcomingPoolSig(),
    currentUserId: this.currentUserIdSig(),
    actionError: this.actionErrorSig(),
    actionLoading: this.actionLoadingSig(),
    activeTab: this.activeTabSig(),
    squads: this.squadsSig(),
    selectedTeam: this.selectedTeamSig(),
    onlineUsers: this.onlineUsersSig(),
    isAdmin: this.lobbySig()?.adminId === this.currentUserIdSig()
  }));

  private ws: WebSocket | null = null;
  private destroyed = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private lobbyService: LobbyService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) { this.router.navigate(["/dashboard"]); return; }
    const raw = localStorage.getItem("bidxi_user");
    if (raw) { this.currentUserIdSig.set(JSON.parse(raw).id); }
    this.loadLobby(id);
    this.loadAuction(id);
    this.connectWebSocket(id);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.ws) { this.ws.close(); }
  }

  connectWebSocket(id: string): void {
    if (this.destroyed) return;
    if (this.ws) { this.ws.close(); this.ws = null; }

    const wsUrl = `ws://localhost:8080/api/lobbies/${id}/ws?token=${this.authService.getToken()}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onclose = () => {
      if (!this.destroyed) {
        setTimeout(() => this.connectWebSocket(id), 2000);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "LOBBY_UPDATED":
            this.lobbySig.set(data.payload);
            if (this.activeTabSig() === 'squads') {
              this.fetchSquads();
            }
            break;
          case "PLAYER_UP":
            this.currentPlayerSig.set(data.payload.player);
            this.auctionSig.set(data.payload.room);
            this.upcomingPoolSig.set(data.payload.upcoming || []);
            break;
          case "BID_PLACED":
            this.auctionSig.set(data.payload);
            break;
          case "AUCTION_STATE_UPDATED":
            if (data.payload.room) this.auctionSig.set(data.payload.room);
            if (data.payload.player) this.currentPlayerSig.set(data.payload.player);
            if (data.payload.upcoming) this.upcomingPoolSig.set(data.payload.upcoming);
            break;
          case "TIMER_TICK":
            const cur = this.auctionSig();
            if (cur) this.auctionSig.set({ ...cur, timerSeconds: data.payload.seconds, status: 'bidding' });
            break;
          case "PLAYER_SOLD":
          case "PLAYER_UNSOLD": this.auctionSig.set(data.payload.room || data.payload); break;
          case "AUCTION_COMPLETED":
            this.auctionSig.set(data.payload);
            this.setTab('squads');
            break;
          case "ONLINE_USERS":
            this.onlineUsersSig.set(data.payload);
            break;
        }
      } catch (err) { }
    };
  }

  loadLobby(id: string): void {
    this.lobbyService.getLobby(id).subscribe({ next: (res) => this.lobbySig.set(res.data) });
  }

  loadAuction(id: string): void {
    this.lobbyService.getAuctionRoom(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.auctionSig.set(res.data.room || res.data);
          if (res.data.player) this.currentPlayerSig.set(res.data.player);
          if (res.data.upcoming) this.upcomingPoolSig.set(res.data.upcoming);
        }
      }
    });
  }

  toggleAuction(action: string): void {
    const lobby = this.lobbySig();
    if (!lobby) return;
    this.actionLoadingSig.set(true);
    this.lobbyService.toggleAuction(lobby.id, action).subscribe({
      next: () => this.actionLoadingSig.set(false),
      error: (err: any) => { this.actionLoadingSig.set(false); alert(err.message || "Failed to " + action); }
    });
  }

  placeBid(amount: number): void {
    const lobby = this.lobbySig();
    if (!lobby) return;
    this.actionLoadingSig.set(true);
    this.lobbyService.placeBid(lobby.id, amount).subscribe({
      next: () => this.actionLoadingSig.set(false),
      error: (err: any) => { this.actionLoadingSig.set(false); alert(err.message || "Failed to place bid"); }
    });
  }

  getIncrement(currentBid: number): number { return currentBid >= 1000 ? 50 : 20; }
  canAfford(lobby: LobbyDTO | null, userId: string, amount: number): boolean {
    const p = lobby?.participants.find(x => x.userId === userId);
    return p ? (amount / 100) <= p.purseRemaining : false;
  }

  exitAuction(): void { this.router.navigate(["/dashboard"]); }
  iplColor(code: string): string { return IPL_TEAM_MAP[code]?.color ?? "#4a5568"; }
  iplInitial(code: string): string { return (code || "T").charAt(0).toUpperCase(); }
  getParticipantName(lobby: LobbyDTO | null, userId: string): string { return lobby?.participants.find(p => p.userId === userId)?.username || "Unknown"; }
  getMyPurse(lobby: LobbyDTO | null, currentUserId: string): number { return lobby?.participants.find(p => p.userId === currentUserId)?.purseRemaining || 0; }

  setTab(tab: 'feed' | 'squads'): void {
    this.activeTabSig.set(tab);
    if (tab === 'squads') {
      this.fetchSquads();
    }
  }

  countRole(squad: any[], role: string): number {
    if (!squad) return 0;
    return squad.filter(p => p.role === role || (role === 'BAT' && p.role === 'BATSMAN') || (role === 'BOWL' && p.role === 'BOWLER')).length;
  }

  countOverseas(squad: any[]): number {
    if (!squad) return 0;
    return squad.filter(p => p.nationality !== 'Indian').length;
  }

  selectTeam(userId: string): void {
    this.selectedTeamSig.set(userId);
  }

  fetchSquads(): void {
    const lobby = this.lobbySig();
    if (!lobby) return;

    this.lobbyService.getLobbySquads(lobby.id).subscribe({
      next: (res) => {
        this.squadsSig.set(res.data);
        if (!this.selectedTeamSig() && res.data && res.data.length > 0) {
          this.selectedTeamSig.set(this.currentUserIdSig() || res.data[0].userID);
        }
      }
    });
  }
}
