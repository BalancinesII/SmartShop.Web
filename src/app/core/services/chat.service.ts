import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatStreamChunk,
  ChatStreamError,
  SendMessageRequest,
  SendMessageResponse
} from '../models/chat.model';
import { ServerSentEvent, ServerSentEventParser } from '../utils/server-sent-event-parser';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/Chat`;

  constructor(private http: HttpClient) {}

  sendMessage(request: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(`${this.baseUrl}/message`, request);
  }

  // Emits the assistant's reply in text fragments as the API streams them and
  // completes on the "done" event. Errors on an HTTP error (400, 429…), on an
  // "error" event, or if the stream ends without "done" (connection cut).
  // Unsubscribing aborts the request, which also stops Claude on the server.
  streamMessage(request: SendMessageRequest): Observable<string> {
    return new Observable<string>((subscriber) => {
      const parser = new ServerSentEventParser();
      let processed = 0;

      // Returns true once the stream has reached a final event.
      const handle = (events: ServerSentEvent[]): boolean => {
        for (const { event, data } of events) {
          if (event === 'chunk') {
            subscriber.next((JSON.parse(data) as ChatStreamChunk).text);
          } else if (event === 'done') {
            subscriber.complete();
            return true;
          } else if (event === 'error') {
            subscriber.error(new Error((JSON.parse(data) as ChatStreamError).error));
            return true;
          }
        }
        return false;
      };

      // POST + SSE: EventSource only supports GET, so the stream is read with
      // HttpClient's download progress events (XHR backend), whose partialText
      // holds everything received so far. Only the new part is parsed each time.
      const subscription = this.http
        .post(`${this.baseUrl}/message/stream`, request, {
          observe: 'events',
          reportProgress: true,
          responseType: 'text'
        })
        .subscribe({
          next: (httpEvent) => {
            let received: string | undefined;
            if (httpEvent.type === HttpEventType.DownloadProgress) received = httpEvent.partialText;
            else if (httpEvent.type === HttpEventType.Response) received = httpEvent.body ?? '';
            if (received === undefined) return;

            const fresh = received.slice(processed);
            processed = received.length;

            let finished: boolean;
            try {
              finished = handle(parser.push(fresh));
            } catch (error) {
              // Malformed event data (JSON.parse): fail the stream, don't throw here.
              subscriber.error(error);
              return;
            }

            if (!finished && httpEvent.type === HttpEventType.Response) {
              subscriber.error(new Error('The chat stream ended before the response was complete.'));
            }
          },
          error: (error) => subscriber.error(error)
        });

      return () => subscription.unsubscribe();
    });
  }
}
