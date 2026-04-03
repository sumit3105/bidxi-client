export interface ParticipantDTO {
  userId: string;
  username: string;
  teamName: string;
  iplTeam: string;
  purseRemaining: number;
  squad?: string[]; // Array of player IDs
}

export interface LobbyDTO {
  id: string;
  name: string;
  adminId: string;
  inviteCode: string;
  maxPlayers: number;
  purse: number;
  status: "waiting" | "active" | "completed";
  participants: ParticipantDTO[];
  auctionRoomId?: string;
  createdAt: string;
}

export interface PlayerDTO {
  id: string;
  name: string;
  role: string;
  nationality: string;
  category: string; // MARQUEE, BATSMAN, etc.
  basePrice: number;
  imageUrl: string;
}

export interface SoldRecordDTO {
  playerId: string;
  playerName: string;
  playerImage: string;
  playerRole: string;
  winnerId: string;
  teamName: string;
  iplTeam: string;
  soldPrice: number;
  soldAt: string;
}

export interface AuctionRoomDTO {
  id: string;
  lobbyId: string;
  status: 'idle' | 'bidding' | 'paused' | 'sold' | 'unsold' | 'completed';
  currentPlayerId?: string;
  currentBid: number;
  highestBidderId?: string;
  timerSeconds: number;
  playerQueue: string[];
  soldPlayers: SoldRecordDTO[];
  isHostPresent: boolean;
}

export interface CreateLobbyRequest {
  name: string;
  maxPlayers: number;
  purse: number;
  teamName: string;
  iplTeam: string;
}

export interface JoinLobbyRequest {
  teamName: string;
  iplTeam: string;
}

export interface JoinByCodeRequest {
  inviteCode: string;
  teamName: string;
  iplTeam: string;
}
