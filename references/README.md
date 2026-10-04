# Reference documents

Source material for question content. **The documents themselves are not in this repo.** They are free
public downloads that are too large to version, so fetch them on whichever machine needs them and drop
them here. `*.pdf` in this folder is gitignored.

## Why the files are not committed

Committing them would be a permanent cost for no gain:

- **Size.** The driving manual alone is 68.3 MB. This repo's `.git` is 0.8 MB. Adding it grows the
  repository ~85x, and every future clone pays that.
- **Permanence.** A pushed blob is unreclaimable with `git rm`. The only real removal is a history
  rewrite, which changes every commit hash on `new_designs` and forces a full re-clone for everyone.
- **Licensing.** These are copyrighted government publications. This repository is **public**, so
  committing one makes it permanently and publicly redistributable. That is a decision for the
  maintainer, not a default.

The documents are free to download, so storing them in git would buy a download that costs nothing
while storing copyrighted work forever. Hence: fetch, don't commit.

If a document ever genuinely needs to be in-repo — for licensing reasons, or because the source is
going offline — set up **Git LFS** first and get an explicit decision from the maintainer. Do not just
remove the gitignore rule.

## Documents

### `MANUAL_Vehiculo_4Ruedas_2023 SA.pdf`

The source of truth for the 80 hard questions.

| | |
|---|---|
| Title | Manual del conductor de vehículos clade 4 ruedas (4R) |
| Publisher | Gobierno de la Ciudad de Buenos Aires (GCBA) |
| Edition | 2023 |
| Pages | 200 |
| Size | 68.3 MB |
| Where | Free public GCBA publication — search for the GCBA driving manual (*manual del conductor*), or ask the maintainer for the copy |

**Everything needed to read it is already in the repo.** The 80 hard questions in
`src/data/questions.hard.ts` each carry a printed-page citation, so you can proofread them against the
manual without this README telling you anything about extraction. What is *not* in the repo is the
manual itself.

Two extraction traps, recorded in full at `source_of_truth.manual_pitfalls` in
`openspec/changes/driving-safety-question-bank/state.yaml`, because they cost real time and will cost
it again to whoever touches this next:

1. **The text layer has no accents.** `cinturón` extracts as `cintur?n`. Every search must be
   diacritic-insensitive, or it silently returns zero hits and the fact looks like it is not there.
2. **The speed-limit table is a graphic and is not in the text layer at all.** Searching for `60 km/h`
   returns zero pages. This is why speed limits cite Ley 24.449 art. 51 instead of the manual. A number
   that will not search for does not mean the manual lacks it.

Also: PDF page index is offset by one from the printed page. `pages[i]` is printed page `i+1`, which is
why citations read `(p<n>)` using the printed number.
