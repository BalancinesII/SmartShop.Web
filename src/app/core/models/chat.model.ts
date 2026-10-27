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
  error?: boolean;
}

// Payloads of the events sent by POST /api/Chat/message/stream.
export interface ChatStreamChunk {
  text: string;
}

export interface ChatStreamError {
  error: string;
}
