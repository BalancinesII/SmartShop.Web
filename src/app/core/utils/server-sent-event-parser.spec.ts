import { ServerSentEventParser } from './server-sent-event-parser';

describe('ServerSentEventParser', () => {
  let parser: ServerSentEventParser;

  beforeEach(() => (parser = new ServerSentEventParser()));

  it('parses complete events with their name and data', () => {
    const events = parser.push('event: chunk\ndata: {"text":"Hi"}\n\nevent: done\ndata: {}\n\n');

    expect(events).toEqual([
      { event: 'chunk', data: '{"text":"Hi"}' },
      { event: 'done', data: '{}' }
    ]);
  });

  it('keeps an event split across pieces until it is complete', () => {
    expect(parser.push('event: chu')).toEqual([]);
    expect(parser.push('nk\ndata: {"text":')).toEqual([]);
    expect(parser.push('"Hi"}\n')).toEqual([]);

    expect(parser.push('\n')).toEqual([{ event: 'chunk', data: '{"text":"Hi"}' }]);
  });

  it('accepts CRLF line endings', () => {
    expect(parser.push('event: chunk\r\ndata: x\r\n\r\n')).toEqual([{ event: 'chunk', data: 'x' }]);
  });

  it('defaults the event name to "message" and joins multi-line data', () => {
    expect(parser.push('data: line 1\ndata: line 2\n\n')).toEqual([
      { event: 'message', data: 'line 1\nline 2' }
    ]);
  });

  it('ignores comments and events without data', () => {
    expect(parser.push(': keep-alive\n\nevent: ping\n\n')).toEqual([]);
  });
});
