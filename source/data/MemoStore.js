/**
	Persistence for memos.

	Records live in the db8 kind "com.palm.note:1", which is owned by
	com.palm.app.notes and already grants org.webosports.app.memos full CRUD in
	that app's configuration/db/permissions/com.palm.note. Using it means memos
	written here show up in the legacy app, are picked up by backup (the kind is
	marked "sync": true), and can be fed by com.palm.dataimport.

	Earlier builds of this app kept everything in localStorage under
	"webOSMemos". Those records are migrated into db8 on first run; see
	ensureMigrated().

	When there is no PalmServiceBridge (desktop browser, debug.html) the store
	falls back to localStorage so the app stays runnable outside a device.
*/

enyo.kind({
	name: "MemoStore",
	kind: "enyo.Component",
	//* See the note in Memo.js: statics are attached below this call.
	noDefer: true,

	//* localStorage keys, kept for migration and for the browser fallback.
	legacyKey: "webOSMemos",
	migratedKey: "webOSMemosMigratedToDb8",
	fallbackKey: "webOSMemosFallback",

	published: {
		//* Memo instances, ordered by db8 "position"
		memos: null
	},

	events: {
		//* Sent whenever a db8 call fails; inEvent.message is displayable.
		onError: ""
	},

	create: function() {
		this.inherited(arguments);
		this.memos = [];
	},

	//* True on a real device, where db8 is reachable.
	hasDb: function() {
		return !!window.PalmServiceBridge;
	},

	/**
		Issues a db8 request. inDone is called with (err, response); err is null
		on success. Every caller is expected to handle err rather than assume the
		call succeeded, which is what the localStorage build could not do.
	*/
	dbCall: function(inMethod, inParams, inDone) {
		var self = this;
		var request = new enyo.ServiceRequest({
			service: "luna://com.palm.db",
			method: inMethod
		});
		request.response(this, function(inSender, inResponse) {
			inDone(null, inResponse);
		});
		request.error(this, function(inSender, inError) {
			var message = (inError && (inError.errorText || inError.errorMessage)) ||
				"db8 " + inMethod + " failed";
			self.doError({message: message, error: inError});
			inDone(inError, null);
		});
		request.go(inParams);
		return request;
	},

	// --- Loading -----------------------------------------------------------

	/**
		Loads memos matching inFilter into this.memos, then calls inDone(err).
		An empty filter loads everything ordered by position.
	*/
	load: function(inFilter, inDone) {
		var self = this;
		var filter = enyo.trim(inFilter || "");
		inDone = inDone || enyo.nop;

		if (!this.hasDb()) {
			this.loadFallback(filter);
			inDone(null);
			return;
		}

		this.ensureMigrated(function() {
			var method = filter ? "search" : "find";
			var query = {
				from: Memo.KIND,
				orderBy: "position"
			};
			if (filter) {
				// Served by the kind's "nameSearch" index: case- and
				// accent-insensitive token matching, done in the database.
				query.where = [{
					prop: "text",
					op: "?",
					val: filter,
					collate: "primary",
					tokenize: "all"
				}];
			}
			self.dbCall(method, {query: query}, function(err, response) {
				if (err) {
					inDone(err);
					return;
				}
				self.memos = enyo.map(response.results || [], function(inRecord) {
					return new Memo(inRecord);
				});
				inDone(null);
			});
		});
	},

	//* Every stored record in the browser fallback, unfiltered.
	readFallbackRecords: function() {
		var raw = window.localStorage[this.fallbackKey] || window.localStorage[this.legacyKey];
		if (!raw) {
			return [];
		}
		try {
			return MemoStore.upgradeRecords(enyo.json.parse(raw) || []);
		} catch (e) {
			enyo.warn("MemoStore: could not parse stored memos, starting empty");
			return [];
		}
	},

	writeFallbackRecords: function(inRecords) {
		window.localStorage[this.fallbackKey] = enyo.json.stringify(inRecords);
	},

	//* Browser-only path so debug.html keeps working without a device.
	loadFallback: function(inFilter) {
		var memos = enyo.map(this.readFallbackRecords(), function(inRecord) {
			return new Memo(inRecord);
		});
		memos.sort(function(a, b) {
			return a.getPosition() < b.getPosition() ? -1 : (a.getPosition() > b.getPosition() ? 1 : 0);
		});
		if (inFilter) {
			memos = enyo.filter(memos, function(inMemo) {
				return inMemo.matches(inFilter);
			});
		}
		this.memos = memos;
	},

	/**
		Writes one memo into the browser fallback store.

		An upsert against everything on disk, deliberately not a dump of
		this.memos: while a search filter is active this.memos holds only the
		matching subset, and rewriting the store from it would delete every memo
		that did not match the search.
	*/
	fallbackUpsert: function(inMemo) {
		if (!inMemo.getId()) {
			inMemo.applyDbResult({id: MemoStore.nextLocalId(), rev: 1});
		}
		var id = inMemo.getId();
		var records = this.readFallbackRecords();
		var index = -1;
		for (var i = 0; i < records.length; i++) {
			if (records[i]._id === id) {
				index = i;
				break;
			}
		}
		if (index >= 0) {
			records[index] = inMemo.serialize();
		} else {
			records.push(inMemo.serialize());
		}
		this.writeFallbackRecords(records);
	},

	fallbackDelete: function(inMemo) {
		var id = inMemo.getId();
		if (!id) {
			return;
		}
		this.writeFallbackRecords(enyo.filter(this.readFallbackRecords(), function(inRecord) {
			return inRecord._id !== id;
		}));
	},

	// --- Migration ---------------------------------------------------------

	/**
		Moves any pre-db8 localStorage memos into db8, once. The localStorage copy
		is deliberately left in place as a backup; only a marker is written, so a
		failed or partial migration can be retried and nothing is destroyed.
	*/
	ensureMigrated: function(inDone) {
		var self = this;
		if (window.localStorage[this.migratedKey]) {
			inDone();
			return;
		}
		var raw = window.localStorage[this.legacyKey];
		if (!raw) {
			window.localStorage[this.migratedKey] = String(Memo.now());
			inDone();
			return;
		}

		var records;
		try {
			records = enyo.json.parse(raw) || [];
		} catch (e) {
			enyo.warn("MemoStore: unreadable legacy memos, skipping migration");
			window.localStorage[this.migratedKey] = String(Memo.now());
			inDone();
			return;
		}

		records = enyo.filter(records, function(inRecord) {
			return inRecord && (inRecord.text || inRecord.title);
		});
		if (!records.length) {
			window.localStorage[this.migratedKey] = String(Memo.now());
			inDone();
			return;
		}

		var objects = enyo.map(MemoStore.upgradeRecords(records), function(inRecord) {
			var memo = new Memo(inRecord);
			memo.stampCreated();
			return memo.serialize();
		});

		enyo.log("MemoStore: migrating " + objects.length + " memo(s) from localStorage to db8");
		this.dbCall("put", {objects: objects}, function(err) {
			if (err) {
				// Leave the marker unset so the next launch retries.
				enyo.warn("MemoStore: migration failed, will retry on next launch");
			} else {
				window.localStorage[self.migratedKey] = String(Memo.now());
			}
			inDone();
		});
	},

	// --- Mutation ----------------------------------------------------------

	//* Builds an unsaved memo that sorts above everything currently loaded.
	createMemo: function(inText) {
		var memo = new Memo();
		memo.setColour(Memo.getNextColour(this.memos[0]));
		memo.setPosition(Memo.getTopPosition(this.memos[0]));
		if (inText) {
			memo.setText(inText);
		}
		memo.stampCreated();
		return memo;
	},

	//* Adds a memo to the in-memory list without touching the database.
	track: function(inMemo) {
		if (enyo.indexOf(inMemo, this.memos) < 0) {
			this.memos.unshift(inMemo);
		}
	},

	indexOf: function(inMemo) {
		return enyo.indexOf(inMemo, this.memos);
	},

	/**
		Persists one memo. An empty memo is never written: if it already exists it
		is deleted, otherwise it is simply dropped. This is what keeps a stray tap
		on "new memo" from leaving a permanent blank row.
	*/
	save: function(inMemo, inDone) {
		var self = this;
		inDone = inDone || enyo.nop;

		if (inMemo.isEmpty()) {
			this.remove(inMemo, inDone);
			return;
		}

		inMemo.stampModified();

		if (!this.hasDb()) {
			this.fallbackUpsert(inMemo);
			this.track(inMemo);
			inDone(null);
			return;
		}

		var method = inMemo.isNew() ? "put" : "merge";
		this.dbCall(method, {objects: [inMemo.serialize()]}, function(err, response) {
			if (err) {
				inDone(err);
				return;
			}
			inMemo.applyDbResult((response.results || [])[0]);
			self.track(inMemo);
			inDone(null);
		});
	},

	/**
		Deletes a memo from the list and, if it was ever written, from db8.
		Removing an unsaved memo is not an error.
	*/
	remove: function(inMemo, inDone) {
		var self = this;
		inDone = inDone || enyo.nop;

		function forget() {
			var index = self.indexOf(inMemo);
			if (index >= 0) {
				self.memos.splice(index, 1);
			}
		}

		if (inMemo.isNew()) {
			// Never persisted, so there is nothing to erase.
			forget();
			inDone(null);
			return;
		}

		if (!this.hasDb()) {
			this.fallbackDelete(inMemo);
			inMemo.clearId();
			forget();
			inDone(null);
			return;
		}

		this.dbCall("del", {ids: [inMemo.getId()]}, function(err) {
			if (err) {
				inDone(err);
				return;
			}
			inMemo.clearId();
			forget();
			inDone(null);
		});
	}
});

/**
	Normalises a stored record into the com.palm.note:1 shape.

	Pre-db8 localStorage records look like {title, colour, text}: a British
	"colour" spelling holding a raw CSS value scraped from the DOM, and no
	position or timestamps. Those are mapped onto the schema's "color",
	"position" and timestamp fields here.
*/
MemoStore.upgradeRecord = function(inRecord, inPosition) {
	if (!inRecord) {
		return {};
	}
	if (inRecord._kind === Memo.KIND && inRecord.position) {
		return inRecord;
	}

	var record = enyo.clone(inRecord);
	record._kind = Memo.KIND;
	record.text = Memo.sanitize(record.text);
	record.color = Memo.normaliseColour(record.color || record.colour);
	delete record.colour;

	if (!record.title) {
		record.title = Memo.deriveTitle(record.text);
	}
	if (!record.position) {
		record.position = inPosition || "m";
	}
	return record;
};

/**
	Upgrades a whole list in one pass, handing out ascending ordering keys so
	migrated memos keep the order the localStorage array had.
*/
MemoStore.upgradeRecords = function(inRecords) {
	var position = "a";
	return enyo.map(inRecords || [], function(inRecord) {
		var record = MemoStore.upgradeRecord(inRecord, position);
		position = Memo.getPositionBetween(record.position, "z");
		return record;
	});
};

/**
	Ids for the browser fallback, where there is no database to allocate them.
	Only ever seen off-device; db8 assigns the real ones.
*/
MemoStore.localIdCounter = 0;
MemoStore.nextLocalId = function() {
	MemoStore.localIdCounter++;
	return "local-" + Memo.now() + "-" + MemoStore.localIdCounter;
};
