import { diffLines } from "diff";

const content = document.querySelector<HTMLDivElement>("#content")!;
const renderStatus = document.querySelector<HTMLElement>("#renderStatus")!;

type DiffKind = "added" | "removed" | "unchanged";

interface DiffLine {
  kind: DiffKind;
  leftNumber: number | null;
  rightNumber: number | null;
  text: string;
}

interface SplitRow {
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

function getMarker(kind: DiffKind) {
  if (kind === "added") {
    return "+";
  }
  if (kind === "removed") {
    return "−";
  }
  return " ";
}

function createDiffLines(left: string, right: string) {
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

function appendText(target: HTMLElement, text: string) {
  const value = document.createElement("span");
  value.className = "diff-text";
  value.textContent = text;
  target.append(value);
}

function createInlineLine(line: DiffLine) {
  const row = document.createElement("div");
  row.className = `diff-line ${line.kind}`;
  const leftNumber = document.createElement("span");
  leftNumber.className = "diff-number";
  leftNumber.textContent = line.leftNumber === null ? "" : String(line.leftNumber);
  const rightNumber = document.createElement("span");
  rightNumber.className = "diff-number";
  rightNumber.textContent = line.rightNumber === null ? "" : String(line.rightNumber);
  const marker = document.createElement("span");
  marker.className = "diff-marker";
  marker.textContent = getMarker(line.kind);
  row.append(leftNumber, rightNumber, marker);
  appendText(row, line.text);
  return row;
}

function createSplitRows(lines: DiffLine[]) {
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
      rows.push({ left: removed[rowIndex] ?? null, right: added[rowIndex] ?? null });
    }
  }
  return rows;
}

function createSplitCell(line: DiffLine | null, side: "left" | "right") {
  const cell = document.createElement("div");
  const kind = line?.kind ?? "empty";
  cell.className = `diff-cell ${side} ${kind}`;
  const number = document.createElement("span");
  number.className = "diff-number";
  const displayNumber = side === "left" ? line?.leftNumber : line?.rightNumber;
  number.textContent = displayNumber ? String(displayNumber) : "";
  cell.append(number);
  if (line) {
    appendText(cell, line.text);
  }
  return cell;
}

function createSplitRow(row: SplitRow) {
  const element = document.createElement("div");
  element.className = "diff-row";
  const left = createSplitCell(row.left, "left");
  const right = createSplitCell(row.right, "right");
  element.append(left, right);
  return element;
}

export function renderDiff(left: string, right: string, view: "inline" | "split") {
  const allLines = createDiffLines(left, right);
  const lines = allLines.slice(0, 10_000);
  const truncated = allLines.length > lines.length;
  renderStatus.textContent = truncated ? "First 10,000 diff lines" : "";
  content.className = `diff-content ${view}`;
  if (view === "inline") {
    const elements = lines.map(createInlineLine);
    content.replaceChildren(...elements);
    return;
  }
  const rows = createSplitRows(lines);
  const elements = rows.map(createSplitRow);
  content.replaceChildren(...elements);
}
