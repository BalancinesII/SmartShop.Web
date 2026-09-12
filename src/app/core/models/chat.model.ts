export interface SendMessageRequest {
  sessionId: string;
  message: string;
}

export interface SendMessageResponse {
  sessionId: string;
  response: string;
}

export interface ChatDisplayMessage {
  role: 'user' | 'assistant';
  text: string;
}
