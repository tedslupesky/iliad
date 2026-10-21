import { useCallback, useEffect, useState } from "react";
import {
  Book,
  BookInfo,
  GREEK_BOOK_LETTERS,
  LINES_PER_PAGE,
  englishFor,
  loadBook,
  loadIndex,
  pageCount,
} from "./data";

type Position = { book: number; page: number };

// Position lives in the URL hash (#3.2 = book 3, page 2) so reloads and
// bookmarks land on the same page.
function readHash(): Position {
  const m = window.location.hash.match(/^#(\d+)\.(\d+)$/);
  return m ? { book: +m[1], page: +m[2] } : { book: 1, page: 1 };
}

export default function App() {
  const [index, setIndex] = useState<BookInfo[] | null>(null);
  const [pos, setPos] = useState<Position>(readHash);
  const [book, setBook] = useState<Book | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);

  useEffect(() => {
    loadIndex().then(setIndex);
    const onHash = () => setPos(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let live = true;
    loadBook(pos.book).then((b) => live && setBook(b));
    return () => {
      live = false;
    };
  }, [pos.book]);

  const go = useCallback((p: Position) => {
    setPos(p);
    window.location.hash = `${p.book}.${p.page}`;
  }, []);

  const pages = index ? pageCount(index[pos.book - 1]) : 1;
  const hasPrev = pos.book > 1 || pos.page > 1;
  const hasNext = index ? pos.book < index.length || pos.page < pages : false;

  const prev = useCallback(() => {
    if (!index) return;
    if (pos.page > 1) go({ book: pos.book, page: pos.page - 1 });
    else if (pos.book > 1) go({ book: pos.book - 1, page: pageCount(index[pos.book - 2]) });
  }, [index, pos, go]);

  const next = useCallback(() => {
    if (!index) return;
    if (pos.page < pages) go({ book: pos.book, page: pos.page + 1 });
    else if (pos.book < index.length) go({ book: pos.book + 1, page: 1 });
  }, [index, pos, pages, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "e") setShowEnglish((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const ready = book && book.book === pos.book;
  const start = (pos.page - 1) * LINES_PER_PAGE;
  const lines = ready ? book.greek.slice(start, start + LINES_PER_PAGE) : [];
  const english = ready ? englishFor(book, lines) : [];
  const range = lines.length ? `${lines[0].n}–${lines[lines.length - 1].n}` : "";

  return (
    <div className={`app ${showEnglish ? "with-english" : ""}`}>
      <header className="bar">
        <div className="title">
          <span className="greek-title">Ἰλιάς {GREEK_BOOK_LETTERS[pos.book - 1]}</span>
          <span className="meta">
            Book {pos.book} · lines {range} · page {pos.page} of {pages}
          </span>
        </div>
        <nav className="controls">
          <button onClick={prev} disabled={!hasPrev} aria-label="Previous page">
            ← Prev
          </button>
          <button onClick={next} disabled={!hasNext} aria-label="Next page">
            Next →
          </button>
          <button
            className={`toggle ${showEnglish ? "on" : ""}`}
            onClick={() => setShowEnglish((s) => !s)}
            aria-pressed={showEnglish}
          >
            English
          </button>
        </nav>
      </header>

      <main className="panes">
        <article className="greek" lang="grc">
          {lines.map((l) => (
            <div key={l.n} className={`line ${l.p ? "para" : ""}`}>
              <span className="num">{l.n % 5 === 0 ? l.n : ""}</span>
              <span className="text">{l.t}</span>
            </div>
          ))}
        </article>

        {showEnglish && (
          <aside className="english" lang="en">
            <h2>Translation · A. T. Murray</h2>
            {english.map((s) => (
              <p key={s.n}>
                <span className="num">{s.n}</span> {s.t}
              </p>
            ))}
          </aside>
        )}
      </main>
    </div>
  );
}
