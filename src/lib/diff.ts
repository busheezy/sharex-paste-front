import { diffLines } from "diff";

export type DiffKind = "added" | "removed" | "unchanged";

export interface DiffLine {
  kind: DiffKind;
  leftNumber: number | null;
  rightNumber: number | null;
  text: string;
}

export interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

function getLines(value: string) {
  const lines = value.split(/\r\n|\n|\r/);
  if (lines.at(-1) === "") {
    return lines.slice(0, -1);
  }
  return lines;
}

function getKind(added?: boolean, removed?: boolean): DiffKind {
  if (added) {
    return "added";
  }
  if (removed) {
    return "removed";
  }
  return "unchanged";
}

export function getMarker(kind: DiffKind) {
  if (kind === "added") {
    return "+";
  }
  if (kind === "removed") {
    return "−";
  }
  return " ";
}

export function createDiffLines(left: string, right: string) {
  const changes = diffLines(left, right);
  const counters = { left: 1, right: 1 };
  return changes.flatMap((change) => {
    const kind = getKind(change.added, change.removed);
    return getLines(change.value).map((text) => {
      const leftNumber = kind === "added" ? null : counters.left++;
      const rightNumber = kind === "removed" ? null : counters.right++;
      return { kind, leftNumber, rightNumber, text } satisfies DiffLine;
    });
  });
}

export function createSplitRows(lines: DiffLine[]) {
  const rows: SplitRow[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.kind === "unchanged") {
      rows.push({ left: line, right: line });
      continue;
    }

    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (lines[index]?.kind === "removed") {
      removed.push(lines[index]!);
      index += 1;
    }
    while (lines[index]?.kind === "added") {
      added.push(lines[index]!);
      index += 1;
    }
    index -= 1;

    const count = Math.max(removed.length, added.length);
    for (let rowIndex = 0; rowIndex < count; rowIndex += 1) {
      const left = removed[rowIndex] ?? null;
      const right = added[rowIndex] ?? null;
      rows.push({ left, right });
    }
  }
  return rows;
}
