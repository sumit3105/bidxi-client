export interface ParticipantDTO {
  userId: string;
  username: string;
  teamName: string;
  iplTeam: string;
  purseRemaining: number;
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
  createdAt: string;
}

export interface CreateLobbyRequest {
  name: string;
  maxPlayers: number;
  purse: number;
  teamName: string;
  iplTeam: string;
}

export interface JoinLobbyRequest {
  inviteCode: string;
  teamName: string;
  iplTeam: string;
}

export interface JoinByCodeRequest {
  inviteCode: string;
  teamName: string;
  iplTeam: string;
}
