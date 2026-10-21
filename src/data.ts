export type GreekLine = { n: number; t: string; p?: boolean };
export type EnglishSegment = { n: number; t: string };
export type Book = { book: number; greek: GreekLine[]; english: EnglishSegment[] };
export type BookInfo = { book: number; lines: number };

export const LINES_PER_PAGE = 25;

export const GREEK_BOOK_LETTERS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ";

const cache = new Map<number, Promise<Book>>();

export function loadIndex(): Promise<BookInfo[]> {
  return fetch("/data/index.json").then((r) => r.json());
}

export function loadBook(book: number): Promise<Book> {
  let p = cache.get(book);
  if (!p) {
    const file = `/data/book-${String(book).padStart(2, "0")}.json`;
    p = fetch(file).then((r) => r.json());
    cache.set(book, p);
  }
  return p;
}

export function pageCount(info: BookInfo): number {
  return Math.ceil(info.lines / LINES_PER_PAGE);
}

/** English segments whose line range overlaps the given Greek lines. */
export function englishFor(book: Book, lines: GreekLine[]): EnglishSegment[] {
  if (lines.length === 0) return [];
  const first = lines[0].n;
  const last = lines[lines.length - 1].n;
  return book.english.filter((seg, i) => {
    const next = book.english[i + 1]?.n ?? Infinity;
    return seg.n <= last && next > first;
  });
}
