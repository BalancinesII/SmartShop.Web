export interface ServerSentEvent {
  event: string;
  data: string;
}

// Incremental text/event-stream parser. The network hands text over in
// arbitrary pieces, so an event can arrive split across several pieces:
// everything after the last blank line is kept until the rest arrives.
export class ServerSentEventParser {
  private buffer = '';

  push(text: string): ServerSentEvent[] {
    this.buffer += text.replace(/\r\n?/g, '\n');

    const blocks = this.buffer.split('\n\n');
    this.buffer = blocks.pop() ?? '';

    return blocks.map(parseBlock).filter((event): event is ServerSentEvent => event !== null);
  }
}

function parseBlock(block: string): ServerSentEvent | null {
  let event = 'message';
  const data: string[] = [];

  for (const line of block.split('\n')) {
    const separator = line.indexOf(':');
    // Lines starting with ':' are comments (often used as keep-alives).
    if (separator === 0) continue;

    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }

  return data.length > 0 ? { event, data: data.join('\n') } : null;
}
