// Minimal enyo stub, just enough to load and exercise the data layer in node.
var fs = require('fs');
var path = require('path');

var enyo = {};
global.enyo = enyo;

function resolveKind(k) {
  if (typeof k === 'function') return k;
  if (typeof k === 'string') {
    var parts = k.split('.');
    var o = global;
    for (var i = 0; i < parts.length; i++) { o = o && o[parts[i]]; }
    if (!o) throw new Error('unknown kind ' + k);
    return o;
  }
  return Object;
}

function wrap(fn, superFn) {
  return function () {
    var prev = this.inherited;
    this.inherited = function (args) {
      return superFn ? superFn.apply(this, args ? Array.prototype.slice.call(args) : []) : undefined;
    };
    try { return fn.apply(this, arguments); }
    finally { this.inherited = prev; }
  };
}

enyo.kind = function (props) {
  var name = props.name;
  var base = props.kind ? resolveKind(props.kind) : Object;
  var userCtor = Object.prototype.hasOwnProperty.call(props, 'constructor') ? props.constructor : null;

  var ctor = function () {
    if (userCtor) {
      wrap(userCtor, function () { base.apply(this, arguments); }).apply(this, arguments);
    } else {
      base.apply(this, arguments);
    }
  };
  ctor.prototype = Object.create(base.prototype);
  ctor.prototype.constructor = ctor;

  Object.keys(props).forEach(function (key) {
    if (key === 'name' || key === 'kind' || key === 'constructor') return;
    if (key === 'published') {
      Object.keys(props.published).forEach(function (p) {
        ctor.prototype[p] = props.published[p];
      });
      return;
    }
    if (key === 'events') {
      Object.keys(props.events).forEach(function (e) {
        var method = 'do' + e.charAt(2).toUpperCase() + e.substring(3);
        ctor.prototype[method] = function (payload) {
          if (this._eventLog) this._eventLog.push({event: e, payload: payload});
        };
      });
      return;
    }
    var v = props[key];
    ctor.prototype[key] = (typeof v === 'function') ? wrap(v, base.prototype[key]) : v;
  });

  // Install under its dotted name.
  var segs = name.split('.');
  var target = global;
  for (var i = 0; i < segs.length - 1; i++) {
    target[segs[i]] = target[segs[i]] || {};
    target = target[segs[i]];
  }
  target[segs[segs.length - 1]] = ctor;
  return ctor;
};

enyo.Object = function () {};
enyo.Object.prototype.create = function () {};
enyo.Component = function () {};
enyo.Component.prototype = Object.create(enyo.Object.prototype);
enyo.Component.prototype.create = function () {};

enyo.mixin = function (a, b) { a = a || {}; Object.keys(b || {}).forEach(function (k) { a[k] = b[k]; }); return a; };
enyo.clone = function (o) { return enyo.mixin({}, o); };
enyo.trim = function (s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); };
enyo.map = function (a, f, ctx) { return Array.prototype.map.call(a || [], f, ctx); };
enyo.filter = function (a, f, ctx) { return Array.prototype.filter.call(a || [], f, ctx); };
enyo.forEach = function (a, f, ctx) { return Array.prototype.forEach.call(a || [], f, ctx); };
enyo.indexOf = function (v, a) { return Array.prototype.indexOf.call(a || [], v); };
enyo.json = {parse: JSON.parse, stringify: JSON.stringify};
enyo.nop = function () {};
enyo.log = function () {};
enyo.warn = function (m) { (global.__warnings = global.__warnings || []).push(m); };
enyo.format = function (t) { var a = arguments, i = 0; return t.replace(/%./g, function () { return a[++i]; }); };

global.$L = function (s) { return s; };
global.webos = {runTextIndexer: function (t) { return t; }};

// --- Fake db8 -----------------------------------------------------------
var db = {
  records: [],
  nextId: 1,
  calls: [],
  fail: null
};
global.__db = db;

enyo.ServiceRequest = function (params) {
  this.service = params.service;
  this.method = params.method;
  this._ok = null;
  this._err = null;
};
enyo.ServiceRequest.prototype.response = function (ctx, fn) {
  this._ok = typeof ctx === 'function' ? ctx : fn.bind(ctx);
  return this;
};
enyo.ServiceRequest.prototype.error = function (ctx, fn) {
  this._err = typeof ctx === 'function' ? ctx : fn.bind(ctx);
  return this;
};
enyo.ServiceRequest.prototype.go = function (params) {
  var self = this;
  db.calls.push({service: this.service, method: this.method, params: params});

  if (db.fail) {
    var e = db.fail;
    return void self._err(self, e);
  }

  var res;
  switch (this.method) {
    case 'find':
      res = {returnValue: true, results: db.records.slice().sort(cmpPosition)};
      break;
    case 'search':
      var term = params.query.where[0].val.toLowerCase();
      res = {returnValue: true, results: db.records.filter(function (r) {
        return (r.text || '').toLowerCase().indexOf(term) >= 0;
      }).sort(cmpPosition)};
      break;
    case 'put':
      res = {returnValue: true, results: params.objects.map(function (o) {
        var rec = JSON.parse(JSON.stringify(o));
        rec._id = 'id' + (db.nextId++);
        rec._rev = 1;
        db.records.push(rec);
        return {id: rec._id, rev: rec._rev};
      })};
      break;
    case 'merge':
      res = {returnValue: true, results: params.objects.map(function (o) {
        var idx = db.records.findIndex(function (r) { return r._id === o._id; });
        if (idx < 0) throw new Error('merge of unknown id ' + o._id);
        var rec = JSON.parse(JSON.stringify(o));
        rec._rev = db.records[idx]._rev + 1;
        db.records[idx] = rec;
        return {id: rec._id, rev: rec._rev};
      })};
      break;
    case 'del':
      params.ids.forEach(function (id) {
        var idx = db.records.findIndex(function (r) { return r._id === id; });
        if (idx >= 0) db.records.splice(idx, 1);
      });
      res = {returnValue: true, results: []};
      break;
    default:
      throw new Error('unexpected db method ' + this.method);
  }
  self._ok(self, res);
  return this;
};

function cmpPosition(a, b) {
  return a.position < b.position ? -1 : (a.position > b.position ? 1 : 0);
}

// --- Fake localStorage / PalmServiceBridge ------------------------------
var store = {};
global.window = {
  localStorage: store,
  PalmServiceBridge: function () {}
};
global.localStorage = store;

// --- Load the app's data layer -----------------------------------------
var root = process.env.MEMOS_ROOT || path.resolve(__dirname, '..', '..');
['source/data/Memo.js', 'source/data/MemoStore.js'].forEach(function (f) {
  var code = fs.readFileSync(path.join(root, f), 'utf8');
  (0, eval)(code);
});

module.exports = {enyo: enyo, db: db, localStorage: store};
