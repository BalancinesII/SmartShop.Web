import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../../core/services/chat.service';
import { ChatDisplayMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent {
  private sanitizer = inject(DomSanitizer);
  private chatService = inject(ChatService);

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly messages = signal<ChatDisplayMessage[]>([
    { role: 'assistant', text: '¡Hola! ¿En qué puedo ayudarte con nuestro catálogo?' }
  ]);
  draft = '';

  // Un GUID por sesión de navegador para que el backend mantenga el historial.
  private readonly sessionId = crypto.randomUUID();

  toggle(): void {
    this.open.update((value) => !value);
  }

  // Convierte el markdown básico que devuelve la IA (negritas, saltos de línea)
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

    this.chatService.sendMessage({ sessionId: this.sessionId, message: text }).subscribe({
      next: (result) => {
        this.sending.set(false);
        this.messages.update((list) => [...list, { role: 'assistant', text: result.response }]);
      },
      error: () => {
        this.sending.set(false);
        this.messages.update((list) => [
          ...list,
          { role: 'assistant', text: 'Ha ocurrido un error. Inténtalo de nuevo en un momento.' }
        ]);
      }
    });
  }
}
