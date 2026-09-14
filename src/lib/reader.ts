export const maxVisibleLines = 10_000;
export const maxSearchMatches = 1_000;
export const maxHighlightedCharacters = 100_000;

export interface HighlightToken {
  content: string;
  darkColor: string;
  lightColor: string;
  offset: number;
}

export interface TextSegment {
  key: number;
  matchIndex: number | null;
  text: string;
}

export interface SourceLine {
  number: number;
  segments: TextSegment[];
  text: string;
}

interface SegmentResult {
  matchCount: number;
  segments: TextSegment[];
}

function makePlainSegment(text: string): TextSegment {
  return { key: 0, matchIndex: null, text };
}

function splitSearchSegments(
  text: string,
  query: string,
  initialMatchCount: number,
): SegmentResult {
  if (!query || initialMatchCount >= maxSearchMatches) {
    return { matchCount: initialMatchCount, segments: [makePlainSegment(text)] };
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escapedQuery, "gi");
  const matches = text.matchAll(pattern);
  const segments: TextSegment[] = [];
  let matchCount = initialMatchCount;
  let offset = 0;

  for (const match of matches) {
    if (matchCount >= maxSearchMatches) {
      break;
    }

    const position = match.index;
    const prefix = text.slice(offset, position);
    if (prefix) {
      segments.push({ key: offset, matchIndex: null, text: prefix });
    }

    const matchText = match[0];
    segments.push({ key: position, matchIndex: matchCount, text: matchText });
    matchCount += 1;
    offset = position + matchText.length;
  }

  const remainder = text.slice(offset);
  if (remainder || segments.length === 0) {
    segments.push({ key: offset, matchIndex: null, text: remainder });
  }

  return { matchCount, segments };
}

export function getTextLines(text: string) {
  return text.split(/\r\n|\n|\r/).slice(0, maxVisibleLines);
}

export function buildSourceLines(text: string, query: string) {
  const textLines = getTextLines(text);
  const sourceLines: SourceLine[] = [];
  let matchCount = 0;

  for (const [index, line] of textLines.entries()) {
    const result = splitSearchSegments(line, query, matchCount);
    matchCount = result.matchCount;
    sourceLines.push({ number: index + 1, segments: result.segments, text: line });
  }

  return { matchCount, sourceLines };
}
