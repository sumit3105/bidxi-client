import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, throwError } from "rxjs";
import { ApiSuccess } from "../models/auth.model";
import {
  LobbyDTO,
  CreateLobbyRequest,
  JoinLobbyRequest,
  JoinByCodeRequest,
} from "../models/lobby.model";

const API_BASE = "http://localhost:8080/api";

@Injectable({ providedIn: "root" })
export class LobbyService {
  constructor(private http: HttpClient) { }

  createLobby(req: CreateLobbyRequest): Observable<ApiSuccess<LobbyDTO>> {
    return this.http
      .post<ApiSuccess<LobbyDTO>>(`${API_BASE}/lobbies`, req)
      .pipe(catchError(this.handleError));
  }

  getMyLobbies(): Observable<ApiSuccess<LobbyDTO[]>> {
    return this.http
      .get<ApiSuccess<LobbyDTO[]>>(`${API_BASE}/lobbies`)
      .pipe(catchError(this.handleError));
  }

  getLobby(id: string): Observable<ApiSuccess<LobbyDTO>> {
    return this.http
      .get<ApiSuccess<LobbyDTO>>(`${API_BASE}/lobbies/${id}`)
      .pipe(catchError(this.handleError));
  }

  joinLobby(
    lobbyId: string,
    req: JoinLobbyRequest,
  ): Observable<ApiSuccess<LobbyDTO>> {
    return this.http
      .post<ApiSuccess<LobbyDTO>>(`${API_BASE}/lobbies/${lobbyId}/join`, req)
      .pipe(catchError(this.handleError));
  }

  joinByCode(req: JoinByCodeRequest): Observable<ApiSuccess<LobbyDTO>> {
    return this.http
      .post<ApiSuccess<LobbyDTO>>(`${API_BASE}/join-by-code`, req)
      .pipe(catchError(this.handleError));
  }

  kickParticipant(
    lobbyId: string,
    participantId: string,
  ): Observable<ApiSuccess<null>> {
    return this.http
      .delete<ApiSuccess<null>>(
        `${API_BASE}/lobbies/${lobbyId}/participants/${participantId}`,
      )
      .pipe(catchError(this.handleError));
  }

  startAuction(lobbyId: string): Observable<ApiSuccess<null>> {
    return this.http
      .post<ApiSuccess<null>>(`${API_BASE}/lobbies/${lobbyId}/start`, {})
      .pipe(catchError(this.handleError));
  }

  getAuctionRoom(lobbyId: string): Observable<ApiSuccess<any>> {
    return this.http
      .get<ApiSuccess<any>>(`${API_BASE}/lobbies/${lobbyId}/auction`)
      .pipe(catchError(this.handleError));
  }

  getLobbySquads(lobbyId: string): Observable<ApiSuccess<any>> {
    return this.http
      .get<ApiSuccess<any>>(`${API_BASE}/lobbies/${lobbyId}/squads`)
      .pipe(catchError(this.handleError));
  }

  toggleAuction(lobbyId: string, action: string): Observable<ApiSuccess<null>> {
    return this.http
      .post<ApiSuccess<null>>(`${API_BASE}/lobbies/${lobbyId}/auction/toggle`, {
        action,
      })
      .pipe(catchError(this.handleError));
  }

  placeBid(lobbyId: string, amount: number): Observable<ApiSuccess<null>> {
    return this.http
      .post<ApiSuccess<null>>(`${API_BASE}/lobbies/${lobbyId}/bid`, { amount })
      .pipe(catchError(this.handleError));
  }

  getAllPlayers(lobbyId: string): Observable<ApiSuccess<any[]>> {
    return this.http
      .get<ApiSuccess<any[]>>(`${API_BASE}/lobbies/${lobbyId}/all-players`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: {
    error?: { message?: string; error?: string };
    status?: number;
    message?: string;
  }) {
    const message =
      err?.error?.message ||
      err?.error?.error ||
      err?.message ||
      "An unexpected error occurred.";
    return throwError(() => new Error(message));
  }
}
