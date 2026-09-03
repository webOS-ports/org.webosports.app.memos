/**
	Memo model, backed by the db8 kind "com.palm.note:1" owned by
	com.palm.app.notes. The schema is shared with the legacy Mojo Notes app, so
	records written here are readable there and vice versa.

	Schema fields: createdTimestamp, modifiedTimestamp, font, position, text,
	title, color.
*/

enyo.kind({
	name: "Memo",
	kind: "enyo.Object",
	// enyo.kind() normally returns a deferred constructor and swaps in the real
	// one on first use, which drops statics assigned after this call. The
	// Memo.* helpers below are used before any memo is constructed, so this kind
	// is created eagerly.
	noDefer: true,

	published: {
		//* db8 record, always kept in the on-disk shape
		data: null
	},

	constructor: function(inSeed) {
		this.inherited(arguments);
		this.data = enyo.mixin({
			_kind: Memo.KIND,
			text: "",
			title: "",
			color: Memo.defaultColour,
			position: "m",
			createdTimestamp: 0,
			modifiedTimestamp: 0
		}, inSeed || {});
	},

	//* Raw record to hand to db8.
	serialize: function() {
		return this.data;
	},

	isNew: function() {
		return !this.data._id;
	},

	getId: function() {
		return this.data._id;
	},

	//* Applied after a put/merge so subsequent saves merge rather than duplicate.
	applyDbResult: function(inResult) {
		if (!inResult) {
			return;
		}
		if (inResult.id) {
			this.data._id = inResult.id;
		}
		if (inResult.rev) {
			this.data._rev = inResult.rev;
		}
	},

	//* Drops the db8 identity, leaving a record that would be re-created on save.
	clearId: function() {
		delete this.data._id;
		delete this.data._rev;
	},

	getText: function() {
		return this.data.text;
	},

	setText: function(inText) {
		var text = Memo.sanitize(inText);
		if (text === this.data.text) {
			return false;
		}
		// Decide before mutating, so an auto title keeps tracking the body.
		var wasAuto = this.isTitleAuto();
		this.data.text = text;
		if (wasAuto) {
			this.data.title = Memo.deriveTitle(text);
		}
		return true;
	},

	/**
		The legacy app has no user-editable title; it always stores the first 50
		characters of the body. Memos does expose a title field, so an explicit
		title is preserved and only the derived form is written when the user has
		not set one.

		There is no schema field to record "the user typed this", and db8 records
		round-trip through com.palm.app.notes, so the distinction is recomputed by
		comparing the stored title against what the body would derive rather than
		persisted as a flag.
	*/
	isTitleAuto: function() {
		return !this.data.title || this.data.title === Memo.deriveTitle(this.data.text);
	},

	getTitle: function() {
		return this.data.title || "";
	},

	setTitle: function(inTitle) {
		var title = enyo.trim(inTitle || "") || Memo.deriveTitle(this.data.text);
		if (title === this.data.title) {
			return false;
		}
		this.data.title = title;
		return true;
	},

	//* Title for list rows: never blank as long as the memo has a body.
	getDisplayTitle: function() {
		return this.data.title || Memo.deriveTitle(this.data.text) || $L("Untitled memo");
	},

	//* Body run through the system text indexer so URLs become tappable.
	getDisplayText: function() {
		var text = this.data.text;
		if (text.length > Memo.MAX_LENGTH_FOR_RUN_TEXT_INDEXER) {
			return Memo.escapeHtml(text).replace(/\n/g, "<br/>");
		}
		return webos.runTextIndexer(Memo.escapeHtml(text)).replace(/\n/g, "<br/>");
	},

	getColour: function() {
		return Memo.normaliseColour(this.data.color);
	},

	setColour: function(inColour) {
		var colour = Memo.normaliseColour(inColour);
		if (colour === this.data.color) {
			return false;
		}
		this.data.color = colour;
		return true;
	},

	//* CSS colour for the given memo, resolved from the symbolic name.
	getCssColour: function() {
		return Memo.cssColours[this.getColour()];
	},

	getPosition: function() {
		return this.data.position;
	},

	setPosition: function(inPosition) {
		this.data.position = inPosition;
	},

	//* True when the memo holds nothing worth persisting.
	isEmpty: function() {
		return !this.data.text && !this.data.title;
	},

	stampCreated: function() {
		var now = Memo.now();
		this.data.createdTimestamp = this.data.createdTimestamp || now;
		this.data.modifiedTimestamp = now;
	},

	stampModified: function() {
		this.data.modifiedTimestamp = Memo.now();
	},

	//* Matches the memo against a plain (non-regex) search term.
	matches: function(inTerm) {
		var term = (inTerm || "").toLowerCase();
		if (!term) {
			return true;
		}
		return this.data.text.toLowerCase().indexOf(term) >= 0 ||
			this.getDisplayTitle().toLowerCase().indexOf(term) >= 0;
	}
});

Memo.KIND = "com.palm.note:1";
Memo.MAX_LENGTH_FOR_RUN_TEXT_INDEXER = 512;
Memo.TITLE_LENGTH = 50;

//* Symbolic colour names, in picker order. Shared with com.palm.app.notes.
Memo.defaultColour = "yellow";
Memo.colours = ["blue", "yellow", "green", "pink", "salmon"];

Memo.cssColours = {
	blue: "#BEE1F0",
	yellow: "#F7EDB9",
	green: "#CDEBB4",
	pink: "#F5C9DC",
	salmon: "#F7BFA8"
};

Memo.now = function() {
	return new Date().getTime();
};

/**
	Legacy records may carry a colour this build does not know about, and
	pre-1.0.8 localStorage records carry a raw CSS value scraped from the DOM.
	Both are folded back onto a known symbolic name.
*/
Memo.normaliseColour = function(inColour) {
	if (!inColour) {
		return Memo.defaultColour;
	}
	var colour = String(inColour).toLowerCase();
	if (Memo.colours.indexOf(colour) >= 0) {
		return colour;
	}
	return Memo.legacyCssColours[colour.replace(/\s+/g, "")] || Memo.defaultColour;
};

//* CSS values written by the localStorage builds, mapped back to names.
Memo.legacyCssColours = {
	"lightblue": "blue",
	"rgb(173,216,230)": "blue",
	"#f7edb9": "yellow",
	"rgb(247,237,185)": "yellow",
	"lightgreen": "green",
	"rgb(144,238,144)": "green",
	"pink": "pink",
	"rgb(255,192,203)": "pink",
	"salmon": "salmon",
	"rgb(250,128,114)": "salmon"
};

//* New memos cycle through the palette so consecutive notes differ.
Memo.getNextColour = function(inMemo) {
	if (!inMemo) {
		return Memo.defaultColour;
	}
	var index = (Memo.colours.indexOf(inMemo.getColour()) + 1) % Memo.colours.length;
	return Memo.colours[index];
};

Memo.deriveTitle = function(inText) {
	var text = (inText || "").replace(/\s+/g, " ");
	return enyo.trim(text).substring(0, Memo.TITLE_LENGTH);
};

/**
	Turns what enyo.RichText hands back into the plain text com.palm.app.notes
	stores. Mirrors sanitizeInputText there: anchors (added by the text indexer)
	are unwrapped, block markup becomes newlines, and entities are decoded to
	undo the escaping getDisplayText() applied.

	Deliberately no blanket tag strip. A user who types "a < b" or "<three>" gets
	that stored verbatim, exactly as the legacy app stored it; nothing is
	executable because getDisplayText() escapes on the way back out.
*/
Memo.sanitize = function(inText) {
	if (!inText) {
		return "";
	}
	return String(inText)
		.replace(/<\/?(a)[^>]*>/ig, "")
		.replace(/<div>/ig, "\n")
		.replace(/<\/div>/ig, "")
		.replace(/<br\s*\/?>/ig, "\n")
		.replace(/&nbsp;/ig, " ")
		// &amp; must be decoded last, or "&amp;lt;" would collapse all the way
		// to "<" instead of to "&lt;".
		.replace(/&lt;/ig, "<")
		.replace(/&gt;/ig, ">")
		.replace(/&amp;/ig, "&")
		.replace(/\s+$/, "");
};

Memo.escapeHtml = function(inText) {
	return String(inText || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
};

/**
	Fractional ordering key generator, ported from com.palm.app.notes. Produces a
	string that sorts strictly between left and right, so a memo can be inserted
	between two neighbours without renumbering the rest.
*/
Memo.getPositionBetween = function(left, right) {
	var distance, leftCharCode, firstMismatchIndex;

	function findFirstMismatchIndex() {
		for (var index = 0;
			index < left.length &&
				index < right.length &&
				left.charAt(index) === right.charAt(index);
			index++) {
		}
		return index;
	}

	function middleChar(leftCharCode, rightCharCode) {
		return String.fromCharCode(leftCharCode + (rightCharCode - leftCharCode) / 2);
	}

	firstMismatchIndex = findFirstMismatchIndex();

	// same length, chars mismatch & are adjacent
	if (right.length === left.length && right.length === firstMismatchIndex) {
		return left + "m";
	}

	// ran out of chars on right before a match
	if (right.length === firstMismatchIndex) {
		var charCodeOf_z = "z".charCodeAt(0);
		leftCharCode = left.charCodeAt(firstMismatchIndex);
		distance = charCodeOf_z - leftCharCode;

		if (distance > 1) {
			return left.substring(0, firstMismatchIndex) + middleChar(leftCharCode, charCodeOf_z);
		}
		return left.substring(0, firstMismatchIndex + 1) +
			Memo.getPositionBetween(left.substring(firstMismatchIndex + 1), "");
	}

	// ran out of chars on the left
	if (left.length === firstMismatchIndex) {
		var charCodeOf_a = "a".charCodeAt(0);
		var rightCharCode = right.charCodeAt(firstMismatchIndex);
		distance = rightCharCode - charCodeOf_a;

		if (distance > 1) {
			return left + middleChar(charCodeOf_a, rightCharCode);
		}
		return left + "a" + Memo.getPositionBetween("", right.substring(firstMismatchIndex + 1));
	}

	// same length, no match
	leftCharCode = left.charCodeAt(firstMismatchIndex);
	distance = right.charCodeAt(firstMismatchIndex) - leftCharCode;

	if (distance > 1) {
		return left.substring(0, firstMismatchIndex) +
			middleChar(leftCharCode, right.charCodeAt(firstMismatchIndex));
	}
	return left.substring(0, firstMismatchIndex + 1) +
		Memo.getPositionBetween(left.substring(firstMismatchIndex + 1), right.substring(firstMismatchIndex + 1));
};

//* Position that sorts ahead of every existing memo.
Memo.getTopPosition = function(inFirstMemo) {
	var first = (inFirstMemo && inFirstMemo.getPosition()) || "z";
	return Memo.getPositionBetween("a", first);
};
