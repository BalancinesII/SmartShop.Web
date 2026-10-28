import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ChatWidgetComponent } from './chat-widget.component';
import { ChatService } from '../../../core/services/chat.service';

describe('ChatWidgetComponent', () => {
  let stream: Subject<string>;
  let element: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<ChatWidgetComponent>>;

  beforeEach(() => {
    stream = new Subject<string>();

    TestBed.configureTestingModule({
      imports: [ChatWidgetComponent],
      providers: [{ provide: ChatService, useValue: { streamMessage: () => stream } }]
    });

    fixture = TestBed.createComponent(ChatWidgetComponent);
    element = fixture.nativeElement;
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
  });

  function send(text: string): void {
    fixture.componentInstance.draft = text;
    fixture.componentInstance.send();
    fixture.detectChanges();
  }

  function messageTexts(): string[] {
    return Array.from(element.querySelectorAll('.message:not(.typing)')).map((m) => m.textContent ?? '');
  }

  it('shows the typing indicator until the first fragment arrives', () => {
    send('Hi');

    expect(element.querySelector('.typing')).not.toBeNull();

    stream.next('Hello');
    fixture.detectChanges();

    expect(element.querySelector('.typing')).toBeNull();
  });

  it('paints the reply as fragments arrive', () => {
    send('Hi');

    stream.next('Hello');
    fixture.detectChanges();
    expect(messageTexts().at(-1)).toBe('Hello');
    expect(element.querySelector('.message.streaming')).not.toBeNull();

    stream.next(', how can I help?');
    fixture.detectChanges();
    expect(messageTexts().at(-1)).toBe('Hello, how can I help?');

    stream.complete();
    fixture.detectChanges();
    expect(element.querySelector('.message.streaming')).toBeNull();
    expect(fixture.componentInstance.sending()).toBe(false);
  });

  it('replaces a partial reply with an error message when the stream fails', () => {
    send('Hi');
    stream.next('Partial');
    fixture.detectChanges();

    stream.error(new Error('boom'));
    fixture.detectChanges();

    const texts = messageTexts();
    expect(texts).not.toContain('Partial');
    expect(texts.at(-2)).toBe('Hi');
    expect(element.querySelector('.message.error')?.textContent).toContain('Something went wrong');
    expect(fixture.componentInstance.sending()).toBe(false);
  });
});
