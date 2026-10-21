# Iliad Reader

Read the Iliad one page of Greek at a time, with Murray's English translation
in a side pane.

```sh
npm install
npm run dev        # http://localhost:5173
```

Keys: `←` / `→` previous / next page, `e` toggle English. The current page is
kept in the URL hash (`#3.2` = book 3, page 2).

## Text

- Greek: Homer, *Iliad*, ed. Monro & Allen (Oxford, 1920)
- English: A. T. Murray (Loeb, 1924)

Both come from the [Perseus Digital Library](https://github.com/PerseusDL/canonical-greekLit)
(CC BY-SA 4.0). `npm run data` re-downloads the TEI XML and regenerates
`public/data/`, which is committed so the app runs without Python.
