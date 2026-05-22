const TELEGRAM_MAX = 4000;

export class MessageChunker {
  static split(text: string, max: number = TELEGRAM_MAX): string[] {
    if (text.length <= max) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > max) {
      const slice = remaining.slice(0, max);
      let breakAt = slice.lastIndexOf('\n');
      if (breakAt < max / 2) breakAt = max;
      chunks.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).replace(/^\n+/, '');
    }
    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
  }
}
