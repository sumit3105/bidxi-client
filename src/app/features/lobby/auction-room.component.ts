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
      <main class="ar-main" *ngIf="vm.lobby && vm.auction">

        <!-- ═══ Left Sidebar: Live Feed ═══ -->
        <aside class="sidebar sidebar-left">
          
          <!-- 💰 Teams & Budget Section -->
          <section class="sb-section budget-section">
            <h4 class="section-title">TEAMS & BUDGET</h4>
            <div class="team-list">
              <div *ngFor="let p of vm.lobby!.participants" class="team-item" 
                [class.me]="p.userId === vm.currentUserId"
                [style.border-left-color]="iplColor(p.iplTeam)"
                [style.background]="p.userId === vm.currentUserId ? 'rgba(255,215,0,0.05)' : ''">
                <div class="team-main">
                  <div class="team-name-group">
                    <span class="team-name">{{ p.username }}</span>
                    <span class="me-pill" *ngIf="p.userId === vm.currentUserId">YOU</span>
                  </div>
                  <span class="team-owner" [style.color]="iplColor(p.iplTeam)">{{ p.iplTeam }}</span>
                </div>
                <div class="team-purse">
                  <span class="purse-label">PURSE</span>
                  <span class="purse-val">₹{{ p.purseRemaining | number:'1.2-2' }} Cr</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 📋 Unsold Players Section -->
          <section class="sb-section unsold-section" *ngIf="(vm.auction!.unsoldPlayers || []).length > 0">
            <h4 class="section-title" style="color: #fc5c65; display: flex; align-items: center; gap: 8px;">
               <span class="dot-red"></span> UNSOLD PLAYERS
            </h4>
            <div class="unsold-list-mini">
              <div *ngFor="let id of (vm.auction!.unsoldPlayers || []).slice(-5)" class="unsold-item-mini">
                <span class="us-dot"></span>
                <span class="us-name">{{ getPlayerName(id) }}</span>
                <span class="us-tag">UNSOLD</span>
              </div>
            </div>
          </section>

          <!-- 📋 Upcoming Pool Section -->
          <section class="sb-section pool-section">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
               <h4 class="section-title" style="margin: 0;">{{ vm.currentPoolName }} POOL</h4>
               <button class="view-all-btn" (click)="togglePool(true)" style="background: rgba(247, 183, 49, 0.1); border: 1px solid rgba(247, 183, 49, 0.2); color: #f7b731; padding: 4px 10px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; cursor: pointer;">EXPLORE ALL</button>
            </div>
            <div class="pool-list">
              <div *ngFor="let p of vm.upcomingPool.slice(0, 5); let i = index" class="pool-item" [class.next]="i === 0">
                <div class="p-status-dot" [class.active]="i === 0"></div>
                <span class="p-idx">{{ i === 0 ? 'NEXT' : 'POOL' }}</span>
                <span class="p-name">{{ p.name }}</span>
                <span class="p-role">{{ p.role }}</span>
              </div>
              <div *ngIf="vm.upcomingPool.length === 0 && vm.auction!.status !== 'completed'" class="empty-msg">Preparing next pool...</div>
            </div>
          </section>

          <!-- 🔴 Latest Sales Section -->
          <section class="sb-section latest-section">
            <h4 class="section-title">LATEST SALES</h4>
            <div class="latest-list">
              <div *ngFor="let sale of (vm.auction!.soldPlayers || []).slice(-3).reverse()" class="sale-item animate-in">
                <div class="sale-p-info">
                  <div class="sale-name">{{ sale.playerName }}</div>
                  <div class="sale-team" [style.color]="iplColor(sale.iplTeam)">{{ sale.iplTeam }} Franchise</div>
                </div>
                <div class="sale-price">₹{{ sale.soldPrice }}L</div>
              </div>
            </div>
          </section>
        </aside>

        <!-- ═══ Center Stage ═══ -->
        <section class="center-stage">
          
          <!-- Admin Controls HUD -->
          <div class="admin-hud" *ngIf="vm.isAdmin && vm.auction!.status !== 'idle' && vm.auction!.status !== 'paused'">
             <button class="hud-btn pause" *ngIf="vm.auction!.status === 'bidding'" (click)="toggleAuction('pause')" [disabled]="vm.actionLoading">PAUSE</button>
             <button class="hud-btn next" *ngIf="vm.auction!.status === 'sold' || vm.auction!.status === 'unsold'" (click)="toggleAuction('next')" [disabled]="vm.actionLoading">NEXT PLAYER 🔨</button>
          </div>

          <div class="spotlight-area">
            <div class="player-card" 
                  *ngIf="vm.currentPlayer" 
                  [class.is-sold]="vm.auction!.status === 'sold'"
                  [class.is-unsold]="vm.auction!.status === 'unsold'"
                  [class.hammer-shake]="(vm.auction!.timerSeconds || 0) <= 3 && vm.auction!.status === 'bidding'">
              
              <div class="p-category">{{ vm.currentPlayer.category }}</div>
              <div class="p-role-badge">{{ vm.currentPlayer.role }}</div>
              
              <img [src]="vm.currentPlayer.imageUrl" class="p-img" onerror="this.src='https://documents.iplt20.com/ipl/IPLHeadshot2024/missing.png'">
              
              <div class="p-base">BASE PRICE: ₹{{ vm.currentPlayer.basePrice }}L</div>
              <div class="p-info">
                <h1 class="p-title">{{ vm.currentPlayer.name }}</h1>
                <p class="p-nat">{{ vm.currentPlayer.nationality }}</p>
              </div>
            </div>

            <div class="overlay sold" *ngIf="vm.auction!.status === 'sold'">SOLD!</div>
            <div class="overlay unsold" *ngIf="vm.auction!.status === 'unsold'">UNSOLD</div>
            
            <div class="idle-state" *ngIf="vm.auction!.status === 'idle'">
              <div class="spinner" *ngIf="!vm.isAdmin"></div>
              <p *ngIf="!vm.isAdmin">WAITING FOR ADMIN TO START</p>
              <button class="big-action-btn start animate-in" *ngIf="vm.isAdmin" (click)="toggleAuction('start')" [disabled]="vm.actionLoading">
                🚀 START AUCTION
              </button>
            </div>

            <div class="completed-state" *ngIf="vm.auction!.status === 'completed'" style="text-align: center; margin-top: 50px; background: rgba(0,0,0,0.5); padding: 30px; border-radius: 12px; border: 1px solid #ffd700;">
              <h2 style="color: #ffd700; margin-bottom: 10px; font-size: 2rem;">🏆 AUCTION COMPLETED 🏆</h2>
              <p style="color: #fff; margin-bottom: 20px;">All players have been auctioned!</p>
              <button class="big-action-btn next animate-in" *ngIf="vm.isAdmin && (vm.auction!.unsoldPlayers || []).length > 0" (click)="toggleAuction('retry_unsold')" style="font-size: 1rem; padding: 1rem;">
                RETRY {{ (vm.auction!.unsoldPlayers || []).length }} UNSOLD PLAYERS
              </button>
            </div>
            
            <div class="paused-state" *ngIf="vm.auction!.status === 'paused'">
              <div class="pause-icon" *ngIf="!vm.isAdmin">||</div>
              <p *ngIf="!vm.isAdmin">AUCTION PAUSED BY ADMIN</p>
              <button class="big-action-btn resume animate-in" *ngIf="vm.isAdmin" (click)="toggleAuction('resume')" [disabled]="vm.actionLoading">
                ⚔️ RESUME AUCTION
              </button>
            </div>

            <!-- Host Presence Overlay -->
            <div class="host-away-overlay" *ngIf="!vm.isAdmin && !vm.auction!.isHostPresent && vm.auction!.status !== 'idle' && vm.auction!.status !== 'completed'">
              <div class="away-content">
                <div class="caution-icon">⚠️</div>
                <h2>HOST IS DISCONNECTED</h2>
                <p>The auction is temporarily closed. It will automatically resume once the Admin returns.</p>
              </div>
            </div>
          </div>

          <!-- Bidding Console -->
          <div class="bidding-console" *ngIf="vm.auction!.status === 'bidding' || vm.auction!.status === 'paused'">
            
            <div class="timer-orb" [class.critical]="(vm.auction!.timerSeconds || 0) <= 3" [class.paused]="vm.auction!.status === 'paused'">
              <span class="timer-label">{{ vm.auction!.timerSeconds }}s</span>
              <svg viewBox="0 0 100 100">
                <circle class="orb-bg" cx="50" cy="50" r="45"></circle>
                <circle class="orb-progress" cx="50" cy="50" r="45" [style.stroke-dashoffset]="283 - ((vm.auction!.timerSeconds || 0) * 28.3)"></circle>
              </svg>
            </div>

            <div class="bid-info">
              <span class="label">CURRENT BID</span>
              <div class="value">₹{{ vm.auction!.currentBid }} <small>Lakhs</small></div>
              <div class="leader" *ngIf="vm.auction!.highestBidderId">
                 <span class="dot"></span> Leading: {{ getParticipantName(vm.lobby!, vm.auction!.highestBidderId) }}
              </div>
              <div class="leader none" *ngIf="!vm.auction!.highestBidderId">No bids yet</div>
            </div>

            <div class="bid-actions" *ngIf="vm.auction!.status === 'bidding'">
              <div class="bid-tips">MY PURSE: ₹{{ getMyPurse(vm.lobby!, vm.currentUserId) }} Cr</div>
              <div class="action-row" *ngIf="vm.auction!.highestBidderId; else openingBid">
                <button class="bid-btn" (click)="placeBid(vm.auction!.currentBid + getIncrement(vm.auction!.currentBid))" 
                  [disabled]="vm.actionLoading || vm.auction!.highestBidderId === vm.currentUserId || !canAfford(vm.lobby!, vm.currentUserId, vm.auction!.currentBid + getIncrement(vm.auction!.currentBid))">
                  +{{ getIncrement(vm.auction!.currentBid) }}L
                </button>
              </div>
              <ng-template #openingBid>
                <div class="action-row">
                  <button class="bid-btn" (click)="placeBid(vm.auction!.currentBid)" 
                    [disabled]="vm.actionLoading || !canAfford(vm.lobby!, vm.currentUserId, vm.auction!.currentBid)">
                    BID ₹{{ vm.auction!.currentBid }}L
                  </button>
                </div>
              </ng-template>
            </div>
          </div>
        </section>

        <!-- ═══ Right Sidebar: Squad Explorer ═══ -->
        <aside class="sidebar squad-sidebar">
          <div class="sb-header">
            <h4 class="section-title">SQUAD EXPLORER</h4>
          </div>
          
          <div class="squad-tabs-v2">
            <button *ngFor="let t of vm.squads" class="franchise-tab" 
              [class.active]="vm.selectedTeam === t.userId"
              [style.background]="vm.selectedTeam === t.userId ? iplColor(t.iplTeam) : 'rgba(255,255,255,0.03)'"
              (click)="selectTeam(t.userId)">
              {{ t.iplTeam }}
            </button>
          </div>

          <div class="squad-body-v2" *ngFor="let team of vm.squads" [hidden]="vm.selectedTeam !== team.userId">
            <div class="team-profile-header" [style.border-left-color]="iplColor(team.iplTeam)">
               <h3 class="tp-name">{{ team.teamName }}</h3>
               <p class="tp-purse">WALLETT: <span class="val">₹{{ team.purseRemaining | number:'1.2-2' }} Cr</span></p>
               <div class="tp-stats-grid">
                  <div class="tp-stat">
                    <span>PLAYERS</span>
                    <strong>{{ team.squad?.length || 0 }}/25</strong>
                  </div>
                  <div class="tp-stat">
                    <span>OVS</span>
                    <strong>{{ countOverseas(team.squad) }}/8</strong>
                  </div>
               </div>
            </div>

            <div class="squad-limits-row">
               <div class="limit-chip" [class.complete]="countRole(team.squad, 'WK') >= 1">WK: {{ countRole(team.squad, 'WK') }}/1</div>
               <div class="limit-chip" [class.complete]="countRole(team.squad, 'BAT') >= 5">BAT: {{ countRole(team.squad, 'BAT') }}/5</div>
               <div class="limit-chip" [class.complete]="countRole(team.squad, 'BOWL') >= 5">BOWL: {{ countRole(team.squad, 'BOWL') }}/5</div>
            </div>

            <div class="squad-scroll-v2" *ngIf="team.squad?.length; else emptySquad">
              <ng-container *ngFor="let group of ['WK', 'BAT', 'BOWL', 'ALL']">
                <div class="role-group-v2" *ngIf="getPlayersByRole(team.squad, group).length">
                  <h5 class="role-title">
                    <span class="role-marker" [style.background]="iplColor(team.iplTeam)"></span>
                    {{ group === 'WK' ? 'WICKETKEEPERS' : group === 'BAT' ? 'BATSMEN' : group === 'BOWL' ? 'BOWLERS' : 'ALL-ROUNDERS' }}
                  </h5>
                  <div class="squad-grid-v2">
                    <div *ngFor="let p of getPlayersByRole(team.squad, group)" class="p-card-mini" [style.border-bottom-color]="iplColor(team.iplTeam)">
                      <div class="pcm-left">
                        <img [src]="p.imageUrl" class="pcm-img" onerror="this.src='https://documents.iplt20.com/ipl/IPLHeadshot2024/missing.png'">
                        <span class="ovs-badge" *ngIf="p.nationality !== 'Indian'">✈️</span>
                      </div>
                      <div class="pcm-right">
                        <div class="pcm-name">{{ p.name }}</div>
                        <div class="pcm-bid">SOLD AT: <strong>₹{{ p.soldPrice }}L</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </ng-container>
            </div>
            <ng-template #emptySquad>
              <div class="tp-empty-state">
                 <span class="icon">🔍</span>
                 <p>No players picked for this franchise yet.</p>
              </div>
            </ng-template>
          </div>
        </aside>

      </main>

      <!-- ══ Players Pool Explorer Overlay ══ -->
      <div class="pool-explorer-overlay" *ngIf="vm.isPoolVisible" (click)="togglePool(false)">
         <div class="pool-explorer-content animate-in" (click)="$event.stopPropagation()">
            <div class="pe-header">
               <h2>PLAYER POOL EXPLORER</h2>
               <button class="close-pe" (click)="togglePool(false)">✕</button>
            </div>
            
            <div class="pe-body">
               <div class="pe-role-section" *ngFor="let cat of ['WK','BAT','BOWL','ALL']">
                  <h3 class="pe-cat-title">{{ cat === 'WK' ? 'WICKETKEEPERS' : cat === 'BAT' ? 'BATSMEN' : cat === 'BOWL' ? 'BOWLERS' : 'ALL-ROUNDERS' }}</h3>
                  <div class="pe-grid">
                     <div class="pe-player-card" *ngFor="let p of getPoolByRole(cat)" 
                       [class.is-sold]="isPlayerSold(p.id)"
                       [class.is-unsold]="isPlayerUnsold(p.id)"
                       [class.is-current]="p.id === vm.currentPlayer?.id">
                        <img [src]="p.imageUrl" class="pe-img" onerror="this.src='https://documents.iplt20.com/ipl/IPLHeadshot2024/missing.png'">
                        <div class="pe-info">
                           <div class="pe-name-row">
                             <div class="pe-name">{{ p.name }}</div>
                             <span class="pe-status-badge sold" *ngIf="isPlayerSold(p.id)">SOLD</span>
                             <span class="pe-status-badge unsold" *ngIf="isPlayerUnsold(p.id)">UNSOLD</span>
                             <span class="pe-status-badge live" *ngIf="p.id === vm.currentPlayer?.id">LIVE</span>
                           </div>
                           <div class="pe-meta">₹{{ p.basePrice }}L | {{ p.nationality }}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
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
  private fullPoolSig = signal<PlayerDTO[]>([]);
  private isPoolVisibleSig = signal<boolean>(false);

  vm = computed(() => {
    const l = this.lobbySig();
    const a = this.auctionSig();
    const up = this.upcomingPoolSig() || [];
    const cUserId = this.currentUserIdSig();
    return {
      lobby: l,
      auction: a,
      currentPlayer: this.currentPlayerSig(),
      upcomingPool: up,
      currentUserId: cUserId,
      actionError: this.actionErrorSig(),
      actionLoading: this.actionLoadingSig(),
      activeTab: this.activeTabSig(),
      squads: this.squadsSig() || [],
      selectedTeam: this.selectedTeamSig(),
      onlineUsers: this.onlineUsersSig() || [],
      fullPool: this.fullPoolSig() || [],
      isPoolVisible: this.isPoolVisibleSig(),
      isAdmin: l?.adminId === cUserId,
      currentPoolName: up[0]?.category || 'DRAFT'
    };
  });


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
    this.fetchSquadsInit(id);
    this.fetchFullPool(id);
  }

  fetchFullPool(id: string): void {
    this.lobbyService.getAllPlayers(id).subscribe({
      next: (res) => this.fullPoolSig.set(res.data)
    });
  }

  getPlayerName(id: string): string {
    const pool = this.fullPoolSig();
    if (!pool) return id;
    const p = pool.find(x => x.id === id);
    return p ? p.name : id;
  }

  isPlayerSold(id: string): boolean {
    const a = this.auctionSig();
    return !!a?.soldPlayers?.some(s => s.playerId === id);
  }

  isPlayerUnsold(id: string): boolean {
    const a = this.auctionSig();
    return !!a?.unsoldPlayers?.includes(id);
  }

  togglePool(visible: boolean): void {
    this.isPoolVisibleSig.set(visible);
  }

  getPoolByRole(role: string): PlayerDTO[] {
    const pool = this.fullPoolSig();
    if (!pool) return [];
    const r = role.toUpperCase();
    return pool.filter(p => {
      const pRole = (p.role || '').toUpperCase();
      if (r === 'WK') return pRole.includes('WK');
      if (r === 'BAT') return pRole.includes('BAT');
      if (r === 'BOWL') return pRole.includes('BOWL');
      if (r === 'ALL') return pRole.includes('ALL');
      return pRole === r;
    });
  }

  fetchSquadsInit(id: string): void {
    this.lobbyService.getLobbySquads(id).subscribe({
      next: (res) => {
        this.squadsSig.set(res.data);
        if (!this.selectedTeamSig() && res.data && res.data.length > 0) {
          this.selectedTeamSig.set(this.currentUserIdSig() || res.data[0].userId);
        }
      }
    });
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
            this.fetchSquads();
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
          case "PLAYER_UNSOLD":
            this.auctionSig.set(data.payload.room || data.payload);
            this.fetchSquads();
            break;
          case "AUCTION_COMPLETED":
            this.auctionSig.set(data.payload);
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

  getIncrement(currentBid: number): number {
    if (currentBid < 100) return 10;
    if (currentBid < 1000) return 20;
    return 50;
  }
  canAfford(lobby: LobbyDTO | null, userId: string, amount: number): boolean {
    const p = lobby?.participants.find(x => x.userId === userId);
    return p ? (amount / 100) <= p.purseRemaining : false;
  }

  exitAuction(): void { this.router.navigate(["/dashboard"]); }
  iplColor(code: string): string { return IPL_TEAM_MAP[code]?.color ?? "#4a5568"; }
  iplInitial(code: string): string { return (code || "T").charAt(0).toUpperCase(); }
  getParticipantName(lobby: LobbyDTO | null, userId: string | undefined): string {
    if (!lobby || !userId) return "Unknown";
    return lobby.participants.find(p => p.userId === userId)?.username || "Unknown";
  }

  getMyPurse(lobby: LobbyDTO | null, currentUserId: string | undefined): number {
    if (!lobby || !currentUserId) return 0;
    return lobby.participants.find(p => p.userId === currentUserId)?.purseRemaining || 0;
  }

  setTab(tab: 'feed' | 'squads'): void {
    this.activeTabSig.set(tab);
    if (tab === 'squads') {
      this.fetchSquads();
    }
  }

  countRole(squad: any[], role: string): number {
    if (!squad) return 0;
    const r = role.toUpperCase();
    return squad.filter(p => {
      const pRole = (p.role || '').toUpperCase();
      if (r === 'WK') return pRole.includes('WK');
      if (r === 'BAT') return pRole.includes('BAT');
      if (r === 'BOWL') return pRole.includes('BOWL');
      return pRole === r;
    }).length;
  }

  countOverseas(squad: any[]): number {
    if (!squad) return 0;
    return squad.filter(p => p.nationality !== 'Indian').length;
  }

  selectTeam(userId: string): void {
    this.selectedTeamSig.set(userId);
  }

  getPlayersByRole(squad: any[], role: string): any[] {
    if (!squad) return [];
    const r = role.toUpperCase();
    return squad.filter(p => {
      const pRole = (p.role || '').toUpperCase();
      if (r === 'WK') return pRole.includes('WK');
      if (r === 'BAT') return pRole.includes('BAT');
      if (r === 'BOWL') return pRole.includes('BOWL');
      if (r === 'ALL') return pRole.includes('ALL');
      return pRole === r;
    });
  }

  fetchSquads(): void {
    const lobby = this.lobbySig();
    if (!lobby) return;

    this.lobbyService.getLobbySquads(lobby.id).subscribe({
      next: (res) => {
        this.squadsSig.set(res.data);
        if (!this.selectedTeamSig() && res.data && res.data.length > 0) {
          this.selectedTeamSig.set(this.currentUserIdSig() || res.data[0].userId);
        }
      }
    });
  }
}
