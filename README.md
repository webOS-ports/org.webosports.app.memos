Memos
=========

An EnyoJS rewrite of com.palm.app.notes

Storage
-------

Memos are stored in the db8 kind `com.palm.note:1`, which is owned by
com.palm.app.notes and shared with it: notes written in either app show up in
the other, and the kind is marked `"sync": true` so they are covered by backup.
The CRUD permission for `org.webosports.app.memos` is declared in that app's
`configuration/db/permissions/com.palm.note`.

Builds before 1.0.8 kept memos in `localStorage` under `webOSMemos`. Those are
migrated into db8 on first launch; the localStorage copy is left in place as a
backup and a marker key records that the migration ran.

Off-device (`debug.html` in a desktop browser) there is no db8, so the store
falls back to `localStorage` under `webOSMemosFallback`.

Tests
-----

    node tools/tests/data-tests.js

and `smoke.html`, which boots the real app in a browser. See
`tools/tests/README.md`.
