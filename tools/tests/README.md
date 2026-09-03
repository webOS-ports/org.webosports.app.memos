Tests
=====

Two levels, neither of which needs a device.

`data-tests.js` runs the model and persistence layer (`source/data/`) under node,
against a stub of the parts of enyo they use and a fake db8. It covers the
com.palm.note:1 record shape, the localStorage migration, search, and the text
round trip shared with com.palm.app.notes.

    node tools/tests/data-tests.js

`../../smoke.html` boots the real app in a browser and drives it: creating,
editing, colouring and deleting a memo, and checking that nothing throws. Serve
the app directory and open it, or run it headless:

    python3 -m http.server 8731 &
    chromium --headless --virtual-time-budget=10000 \
        --dump-dom http://127.0.0.1:8731/smoke.html | grep -o 'data-smoke="[^"]*"'

The browser test is worth keeping in the loop: enyo defers kind creation, and
that behaviour is not reproduced by the node stub.
