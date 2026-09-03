var assert = require('assert');
var h = require('./harness.js');
var db = h.db, ls = h.localStorage;

var pass = 0, fail = 0;
function t(name, fn) {
  // Reset shared fakes between tests.
  db.records = []; db.nextId = 1; db.calls = []; db.fail = null;
  Object.keys(ls).forEach(function (k) { delete ls[k]; });
  global.__warnings = [];
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); fail++; }
}

console.log('\nMemo');

t('derives title from body, capped at 50 chars', function () {
  var m = new Memo();
  m.setText('Buy milk, eggs and a rather long list of other things too');
  assert.strictEqual(m.getTitle().length, 50);
  assert.strictEqual(m.getTitle(),
    'Buy milk, eggs and a rather long list of other things too'.substring(0, 50));
});

t('auto title keeps tracking the body', function () {
  var m = new Memo();
  m.setText('first');
  assert.strictEqual(m.getTitle(), 'first');
  m.setText('second');
  assert.strictEqual(m.getTitle(), 'second');
});

t('explicit title survives later body edits', function () {
  var m = new Memo();
  m.setText('first');
  m.setTitle('Shopping');
  m.setText('second');
  assert.strictEqual(m.getTitle(), 'Shopping');
});

t('clearing the title falls back to the derived one', function () {
  var m = new Memo();
  m.setText('hello world');
  m.setTitle('Custom');
  m.setTitle('');
  assert.strictEqual(m.getTitle(), 'hello world');
});

t('a legacy record keeps the title com.palm.app.notes wrote', function () {
  var m = new Memo({_kind: 'com.palm.note:1', text: 'body text', title: 'body text'});
  assert.strictEqual(m.getDisplayTitle(), 'body text');
});

t('sanitize strips RichText markup down to plain text', function () {
  var m = new Memo();
  m.setText('line one<br>line two<div>line three</div>&nbsp;<a href="x">link</a>');
  assert.strictEqual(m.getText(), 'line one\nline two\nline three link');
});

t('stored markup is neutralised on display, not destroyed on save', function () {
  var m = new Memo();
  // Stored verbatim, the way com.palm.app.notes stores it...
  m.setText('<' + 'script>alert(1)</' + 'script>hello');
  assert.strictEqual(m.getText(), '<' + 'script>alert(1)</' + 'script>hello');
  // ...but escaped everywhere it is rendered, so it cannot execute.
  assert.strictEqual(m.getDisplayText().indexOf('<' + 'script'), -1);
  assert.ok(m.getDisplayText().indexOf('&lt;script&gt;') >= 0);
});

t('typed angle brackets are preserved rather than eaten', function () {
  var m = new Memo();
  m.setText('use a < b and <three> here');
  assert.strictEqual(m.getText(), 'use a < b and <three> here');
});

t('display text escapes html so stored markup cannot inject', function () {
  var m = new Memo({text: 'a < b & c > d'});
  assert.strictEqual(m.getDisplayText(), 'a &lt; b &amp; c &gt; d');
});

t('colours normalise to symbolic names', function () {
  assert.strictEqual(Memo.normaliseColour('blue'), 'blue');
  assert.strictEqual(Memo.normaliseColour('lightblue'), 'blue');
  assert.strictEqual(Memo.normaliseColour('#F7EDB9'), 'yellow');
  assert.strictEqual(Memo.normaliseColour('rgb(255, 192, 203)'), 'pink');
  assert.strictEqual(Memo.normaliseColour(''), 'yellow');
  assert.strictEqual(Memo.normaliseColour('chartreuse'), 'yellow');
});

t('new memos cycle through the palette', function () {
  var m = new Memo(); m.setColour('blue');
  assert.strictEqual(Memo.getNextColour(m), 'yellow');
  m.setColour('salmon');
  assert.strictEqual(Memo.getNextColour(m), 'blue');
  assert.strictEqual(Memo.getNextColour(null), 'yellow');
});

t('position keys sort strictly between their neighbours', function () {
  var mid = Memo.getPositionBetween('a', 'z');
  assert.ok('a' < mid && mid < 'z', 'expected a < ' + mid + ' < z');
  var again = Memo.getPositionBetween('a', mid);
  assert.ok('a' < again && again < mid, 'expected a < ' + again + ' < ' + mid);
});

t('repeated top insertion always sorts first', function () {
  var first = new Memo({position: 'm'});
  var p1 = Memo.getTopPosition(first);
  assert.ok(p1 < 'm');
  var second = new Memo({position: p1});
  var p2 = Memo.getTopPosition(second);
  assert.ok(p2 < p1, p2 + ' should sort before ' + p1);
});

t('isEmpty distinguishes a blank memo from a titled one', function () {
  assert.strictEqual(new Memo().isEmpty(), true);
  var m = new Memo(); m.setTitle('x');
  assert.strictEqual(m.isEmpty(), false);
});

t('display text round-trips back through sanitize unchanged', function () {
  var m = new Memo();
  m.setText('line one\nline two & <three>');
  var displayed = m.getDisplayText();
  assert.strictEqual(displayed, 'line one<br/>line two &amp; &lt;three&gt;');
  // What the RichText hands back after the user edits nothing.
  var m2 = new Memo();
  m2.setText(displayed);
  assert.strictEqual(m2.getText(), m.getText(),
    'round trip changed the body: ' + JSON.stringify(m2.getText()));
});

t('links added by the text indexer survive the round trip as plain text', function () {
  var m = new Memo();
  m.setText('see http://example.com today');
  // Stand in for PalmSystem.runTextIndexer, which wraps URLs in anchors.
  var linkified = 'see <a href="http://example.com">http://example.com</a> today';
  var m2 = new Memo();
  m2.setText(linkified);
  assert.strictEqual(m2.getText(), 'see http://example.com today');
});

console.log('\nMemoStore: migration');

function newStore() { var s = new MemoStore(); s.create(); return s; }

t('legacy localStorage memos migrate into db8', function () {
  ls.webOSMemos = JSON.stringify([
    {title: 'One', colour: 'lightblue', text: 'first memo'},
    {title: 'Two', colour: '#F7EDB9', text: 'second memo'}
  ]);
  var s = newStore();
  var done = false;
  s.load('', function (err) { assert.ifError(err); done = true; });
  assert.ok(done);
  assert.strictEqual(db.records.length, 2);
  assert.strictEqual(db.records[0]._kind, 'com.palm.note:1');
  assert.strictEqual(db.records[0].color, 'blue');
  assert.strictEqual(db.records[1].color, 'yellow');
  assert.ok(db.records[0].createdTimestamp > 0);
});

t('migrated memos keep their original order', function () {
  ls.webOSMemos = JSON.stringify([
    {title: 'A', colour: 'pink', text: 'alpha'},
    {title: 'B', colour: 'pink', text: 'bravo'},
    {title: 'C', colour: 'pink', text: 'charlie'}
  ]);
  var s = newStore();
  s.load('', function () {});
  assert.deepStrictEqual(s.memos.map(function (m) { return m.getText(); }),
    ['alpha', 'bravo', 'charlie']);
});

t('migration runs once, not on every load', function () {
  ls.webOSMemos = JSON.stringify([{title: 'One', colour: 'pink', text: 'x'}]);
  var s = newStore();
  s.load('', function () {});
  s.load('', function () {});
  var s2 = newStore();
  s2.load('', function () {});
  assert.strictEqual(db.records.length, 1, 'memo was migrated more than once');
});

t('the localStorage copy is left intact as a backup', function () {
  var raw = JSON.stringify([{title: 'One', colour: 'pink', text: 'x'}]);
  ls.webOSMemos = raw;
  newStore().load('', function () {});
  assert.strictEqual(ls.webOSMemos, raw);
  assert.ok(ls.webOSMemosMigratedToDb8);
});

t('a failed migration is retried on the next launch', function () {
  ls.webOSMemos = JSON.stringify([{title: 'One', colour: 'pink', text: 'x'}]);
  db.fail = {errorText: 'db8 is down'};
  newStore().load('', function () {});
  assert.ok(!ls.webOSMemosMigratedToDb8, 'should not mark migrated after a failure');

  db.fail = null;
  newStore().load('', function () {});
  assert.strictEqual(db.records.length, 1);
  assert.ok(ls.webOSMemosMigratedToDb8);
});

t('blank legacy rows are dropped rather than migrated', function () {
  ls.webOSMemos = JSON.stringify([
    {title: '', colour: '', text: ''},
    {title: '', colour: '', text: 'real memo'},
    {title: '', colour: '', text: ''}
  ]);
  var s = newStore();
  s.load('', function () {});
  assert.strictEqual(db.records.length, 1);
  assert.strictEqual(db.records[0].text, 'real memo');
});

t('unreadable localStorage does not stop the app starting', function () {
  ls.webOSMemos = '{not json';
  var s = newStore();
  var err;
  s.load('', function (e) { err = e; });
  assert.ifError(err);
  assert.strictEqual(s.memos.length, 0);
  assert.ok(global.__warnings.length > 0);
});

console.log('\nMemoStore: CRUD');

t('save writes a new memo and reuses its id afterwards', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo();
  m.setText('hello');
  s.save(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 1);
  assert.ok(m.getId());

  m.setText('hello again');
  s.save(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 1, 'second save should merge, not insert');
  assert.strictEqual(db.records[0].text, 'hello again');
  assert.strictEqual(db.calls[db.calls.length - 1].method, 'merge');
});

t('an empty memo is never written', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo();
  s.track(m);
  s.save(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 0);
  assert.strictEqual(s.memos.length, 0, 'blank memo should not linger in the list');
});

t('emptying an existing memo deletes it', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo();
  m.setText('temporary');
  s.save(m, function () {});
  assert.strictEqual(db.records.length, 1);

  m.setText('');
  m.setTitle('');
  s.save(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 0);
  assert.strictEqual(s.memos.length, 0);
});

t('new memos sort above existing ones', function () {
  var s = newStore();
  s.load('', function () {});
  var a = s.createMemo(); a.setText('older'); s.save(a, function () {});
  s.load('', function () {});
  var b = s.createMemo(); b.setText('newer'); s.save(b, function () {});
  s.load('', function () {});
  assert.deepStrictEqual(s.memos.map(function (m) { return m.getText(); }), ['newer', 'older']);
});

t('delete removes the record and the list entry', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo(); m.setText('doomed'); s.save(m, function () {});
  s.remove(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 0);
  assert.strictEqual(s.memos.length, 0);
  assert.strictEqual(m.isNew(), true);
});

t('a failed save reports the error instead of looking successful', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo(); m.setText('x');
  db.fail = {errorText: 'quota exceeded'};
  var seen;
  s.save(m, function (e) { seen = e; });
  assert.ok(seen, 'expected the failure to reach the caller');
  assert.strictEqual(seen.errorText, 'quota exceeded');
});

console.log('\nMemoStore: search');

t('search goes through db8 with the term as data, not a regex', function () {
  var s = newStore();
  s.load('', function () {});
  ['alpha memo', 'bravo memo', 'charlie'].forEach(function (txt) {
    var m = s.createMemo(); m.setText(txt); s.save(m, function () {});
  });

  s.load('memo', function (e) { assert.ifError(e); });
  assert.strictEqual(s.memos.length, 2);
  var call = db.calls[db.calls.length - 1];
  assert.strictEqual(call.method, 'search');
  assert.strictEqual(call.params.query.where[0].val, 'memo');
  assert.strictEqual(call.params.query.where[0].collate, 'primary');
  assert.strictEqual(call.params.query.orderBy, 'position');
});

t('regex metacharacters in a search term do not throw', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo(); m.setText('a (paren) memo'); s.save(m, function () {});
  ['(', '[', '*', '\\', '?', '+('].forEach(function (term) {
    s.load(term, function (e) { assert.ifError(e); });
  });
});

t('find is ordered by position, matching com.palm.app.notes', function () {
  var s = newStore();
  s.load('', function () {});
  assert.strictEqual(db.calls[db.calls.length - 1].method, 'find');
  assert.strictEqual(db.calls[db.calls.length - 1].params.query.orderBy, 'position');
  assert.strictEqual(db.calls[db.calls.length - 1].params.query.from, 'com.palm.note:1');
});

console.log('\nInterop with com.palm.app.notes');

t('records written here match the com.palm.note:1 schema', function () {
  var s = newStore();
  s.load('', function () {});
  var m = s.createMemo();
  m.setText('interop check');
  s.save(m, function () {});

  var allowed = ['_id', '_rev', '_kind', 'createdTimestamp', 'modifiedTimestamp',
    'font', 'position', 'text', 'title', 'color'];
  var rec = db.records[0];
  Object.keys(rec).forEach(function (k) {
    assert.ok(allowed.indexOf(k) >= 0, 'unexpected field written to db8: ' + k);
  });
  assert.strictEqual(typeof rec.text, 'string');
  assert.strictEqual(typeof rec.title, 'string');
  assert.strictEqual(typeof rec.position, 'string');
  assert.strictEqual(typeof rec.createdTimestamp, 'number');
  assert.strictEqual(typeof rec.modifiedTimestamp, 'number');
  assert.ok(Memo.colours.indexOf(rec.color) >= 0, 'color must be a symbolic name');
});

t('a memo written by the legacy app loads and edits cleanly', function () {
  db.records.push({
    _id: 'legacy1', _rev: 3, _kind: 'com.palm.note:1',
    text: 'Written in Mojo', title: 'Written in Mojo',
    color: 'green', position: 'm',
    createdTimestamp: 1300000000000, modifiedTimestamp: 1300000000000
  });
  ls.webOSMemosMigratedToDb8 = '1';

  var s = newStore();
  s.load('', function () {});
  assert.strictEqual(s.memos.length, 1);
  var m = s.memos[0];
  assert.strictEqual(m.getColour(), 'green');
  assert.strictEqual(m.getDisplayTitle(), 'Written in Mojo');

  m.setText('Edited in Enyo');
  s.save(m, function (e) { assert.ifError(e); });
  assert.strictEqual(db.records.length, 1, 'should merge onto the existing record');
  assert.strictEqual(db.records[0]._id, 'legacy1');
  assert.strictEqual(db.records[0].text, 'Edited in Enyo');
  assert.strictEqual(db.records[0].position, 'm', 'position must survive an edit');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
