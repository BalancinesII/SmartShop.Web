import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { environment } from '../../../environments/environment';

describe('ChatService', () => {
  const streamUrl = `${environment.apiUrl}/Chat/message/stream`;
  const request = { sessionId: 'session-1', message: 'Do you have mugs?' };

  let service: ChatService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function chunk(text: string): string {
    return `event: chunk\ndata: ${JSON.stringify({ text })}\n\n`;
  }

  const done = 'event: done\ndata: {"sessionId":"session-1"}\n\n';

  // Simulates the XHR progress events: partialText is cumulative.
  function progress(req: TestRequest, partialText: string): void {
    req.event({ type: HttpEventType.DownloadProgress, loaded: partialText.length, partialText });
  }

  function subscribe() {
    const fragments: string[] = [];
    const state = { completed: false, error: undefined as unknown };

    const subscription = service.streamMessage(request).subscribe({
      next: (fragment) => fragments.push(fragment),
      complete: () => (state.completed = true),
      error: (error) => (state.error = error)
    });

    return { fragments, state, subscription };
  }

  it('posts the message to the stream endpoint as text with progress events', () => {
    subscribe();

    const req = http.expectOne(streamUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.responseType).toBe('text');
    expect(req.request.reportProgress).toBe(true);
    req.flush(chunk('Hi') + done);
  });

  it('emits each fragment as it arrives and completes on "done"', () => {
    const { fragments, state } = subscribe();
    const req = http.expectOne(streamUrl);

    let body = chunk('Yes, ');
    progress(req, body);
    expect(fragments).toEqual(['Yes, ']);
    expect(state.completed).toBe(false);

    body += chunk('we have ') + chunk('mugs.');
    progress(req, body);
    expect(fragments).toEqual(['Yes, ', 'we have ', 'mugs.']);

    body += done;
    progress(req, body);
    expect(state.completed).toBe(true);
    expect(state.error).toBeUndefined();
  });

  it('handles an event split across two progress events', () => {
    const { fragments } = subscribe();
    const req = http.expectOne(streamUrl);

    const body = chunk('Hello') + done;
    progress(req, body.slice(0, 20));
    expect(fragments).toEqual([]);

    progress(req, body);
    expect(fragments).toEqual(['Hello']);
  });

  it('reads events that only arrive with the final response', () => {
    const { fragments, state } = subscribe();

    http.expectOne(streamUrl).flush(chunk('All ') + chunk('at once') + done);

    expect(fragments).toEqual(['All ', 'at once']);
    expect(state.completed).toBe(true);
  });

  it('errors with the API message on an "error" event', () => {
    const { fragments, state } = subscribe();
    const req = http.expectOne(streamUrl);

    progress(req, chunk('Partial') + 'event: error\ndata: {"error":"The assistant response could not be completed."}\n\n');

    expect(fragments).toEqual(['Partial']);
    expect(state.completed).toBe(false);
    expect((state.error as Error).message).toBe('The assistant response could not be completed.');
  });

  it('errors when the stream ends without a "done" event', () => {
    const { state } = subscribe();

    http.expectOne(streamUrl).flush(chunk('Cut off'));

    expect(state.completed).toBe(false);
    expect(state.error).toBeInstanceOf(Error);
  });

  it('errors on an HTTP error such as a validation 400 or a 429', () => {
    const { fragments, state } = subscribe();

    http
      .expectOne(streamUrl)
      .flush('{"status":429}', { status: 429, statusText: 'Too Many Requests' });

    expect(fragments).toEqual([]);
    expect(state.error).toBeTruthy();
  });

  it('errors instead of throwing when an event carries malformed data', () => {
    const { state } = subscribe();

    progress(http.expectOne(streamUrl), 'event: chunk\ndata: not-json\n\n');

    expect(state.error).toBeInstanceOf(SyntaxError);
  });

  it('cancels the request when unsubscribed', () => {
    const { subscription } = subscribe();
    const req = http.expectOne(streamUrl);

    subscription.unsubscribe();

    expect(req.cancelled).toBe(true);
  });
});
