import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SendMessageRequest, SendMessageResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/Chat`;

  constructor(private http: HttpClient) {}

  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(`${this.baseUrl}/message`, request);
  }
}
