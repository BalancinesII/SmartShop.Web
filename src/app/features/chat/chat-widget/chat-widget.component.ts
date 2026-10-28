import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { ChatService } from '../../../core/services/chat.service';
import { ChatDisplayMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-widget',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    MatIconModule
  ],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent {
  private sanitizer = inject(DomSanitizer);
  private chatService = inject(ChatService);
  private destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  // True from sending the message until the stream finishes or fails.
  readonly sending = signal(false);
  // True while the reply is arriving; before the first fragment the widget
  // shows the "typing" bubble, afterwards a caret on the growing message.
  readonly streaming = signal(false);
  readonly messages = signal<ChatDisplayMessage[]>([
    { role: 'assistant', text: 'Hi! How can I help you with our catalog?' }
  ]);
  draft = '';

  // A GUID per browser session so the backend keeps the conversation history.
  private readonly sessionId = crypto.randomUUID();

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');

  constructor() {
    // Keep the latest text in view while the reply grows.
    afterRenderEffect(() => {
      this.messages();
      this.sending();
      const container = this.messagesContainer()?.nativeElement;
      if (container) container.scrollTop = container.scrollHeight;
    });
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  // Converts the basic markdown the AI returns (bold, line breaks)
  // a HTML seguro. Escapamos primero cualquier etiqueta real para evitar XSS,
  // y solo entonces aplicamos el formato que nosotros mismos generamos.
  renderMessage(text: string): SafeHtml {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const withLineBreaks = withBold.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(withLineBreaks);
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending()) return;

    this.messages.update((list) => [...list, { role: 'user', text }]);
    this.draft = '';
    this.sending.set(true);

    // Index the assistant reply will take once its first fragment arrives.
    const replyIndex = this.messages().length;

    this.chatService
      .streamMessage({ sessionId: this.sessionId, message: text })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fragment) => {
          if (!this.streaming()) {
            this.streaming.set(true);
            this.messages.update((list) => [...list, { role: 'assistant', text: fragment }]);
          } else {
            this.messages.update((list) =>
              list.map((message, index) =>
                index === replyIndex ? { ...message, text: message.text + fragment } : message
              )
            );
          }
        },
        complete: () => {
          this.sending.set(false);
          this.streaming.set(false);
        },
        error: () => {
          this.sending.set(false);
          this.streaming.set(false);
          // A partial reply is dropped: the API only saves complete answers, so
          // keeping it would show text the assistant will not remember.
          this.messages.update((list) => [
            ...list.slice(0, replyIndex),
            { role: 'assistant', text: 'Something went wrong. Please try again in a moment.', error: true }
          ]);
        }
      });
  }

  isStreamingMessage(index: number): boolean {
    return this.streaming() && index === this.messages().length - 1;
  }
}
