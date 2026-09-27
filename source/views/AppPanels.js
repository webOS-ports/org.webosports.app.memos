/**
	Memo list on the left, one editor panel per memo on the right.

	Memos are held by a MemoStore, which persists to the db8 kind
	"com.palm.note:1" shared with com.palm.app.notes. Panels and list rows are
	both driven from store.memos, and rows are resolved to panels by memo
	identity rather than by matching title text, so memos that share a title (or
	have none) no longer open each other.
*/

enyo.kind({
	name: "AppPanels",
	kind: "Panels",
	fit: true,
	realtimeFit: true,
	arrangerKind: "CollapsingArranger",
	classes: "app-panels",

	//* Debounce for writes while typing, in ms.
	saveDelay: 400,
	//* Debounce before a search term is sent to db8, in ms.
	searchDelay: 300,

	events: {
		//* Asks the owner to confirm before deleting inEvent.memo.
		onDeleteRequested: ""
	},

	components: [
		{name: "MenuPanel", layoutKind: "FittableRowsLayout", classes: "menu-panel", components: [
			{name: "MenuHeader", kind: "PortsSearch", title: "Memos", onSearch: "searchInput",
				taglines: [
					"Memo-tastic!",
					"(Better than Notes)",
					"Random taglines are still awesome.",
					"Not as sticky as you'd think.",
					"Pastel colours. Mmm.",
					"Now with 100% more sliding!",
					"Exactly what is says on the tin.",
					"Skeumorphism is so 2009."
				]},
			{name: "MenuRepeater", kind: "List", fit: true, count: 0, onSetupItem: "setupMenuItem",
				components: [
					{name: "MenuItem", classes: "list-item", ontap: "menuItemTapped", components: [
						{name: "ItemColour", classes: "list-item-colour"},
						{name: "ItemText", classes: "list-item-text", components: [
							{name: "ItemTitle", classes: "list-item-title"},
							{name: "ItemPreview", classes: "list-item-preview"}
						]}
					]}
				]},
			{name: "EmptyMessage", classes: "empty-message", showing: false},
			{kind: "onyx.Toolbar", components: [
				{name: "NewButton", kind: "onyx.IconButton", src: "assets/icon-new.png",
					classes: "topbar-button", ontap: "newMemo"}
			]}
		]},
		{name: "ContentPanels", kind: "Panels", arrangerKind: "CardArranger", draggable: false,
			components: [
				{kind: "EmptyPanel"}
			]},
		// MemoStore is a plain Component, so it is not treated as a panel. The
		// delete confirmation is a Control and would be, so it lives in
		// memos.MainView and is reached through onDeleteRequested.
		{name: "Store", kind: "MemoStore", onError: "storeError"}
	],

	create: function() {
		this.inherited(arguments);
		this.store = this.$.Store;
		this.filter = "";
		//* memo -> ContentPanel, so rows resolve to panels by identity.
		this.panelsByMemo = [];
		this.$.EmptyMessage.setContent($L("No memos yet. Tap + to write one."));
	},

	rendered: function() {
		this.inherited(arguments);
		this.reload();
	},

	// --- Loading -----------------------------------------------------------

	/**
		Reloads from the store and rebuilds both the list and the panels.
		inSelectMemo, if given, is selected once the rebuild is done.
	*/
	reload: function(inSelectMemo) {
		var self = this;
		this.store.load(this.filter, function() {
			self.rebuild();
			if (inSelectMemo) {
				self.selectMemo(inSelectMemo);
			}
		});
	},

	rebuild: function() {
		var self = this;
		var memos = this.store.memos;

		this.$.ContentPanels.destroyClientControls();
		this.panelsByMemo = [];
		this.createEmptyPanel();

		enyo.forEach(memos, function(inMemo) {
			var panel = self.createPanel();
			panel.setMemo(inMemo);
			self.panelsByMemo.push({memo: inMemo, panel: panel});
		});

		this.$.ContentPanels.render();
		this.$.ContentPanels.reflow();

		this.$.MenuRepeater.setCount(memos.length);
		this.$.MenuRepeater.refresh();
		this.$.EmptyMessage.setShowing(memos.length === 0);
		this.updateCount();

		// With nothing to show, park on the empty panel. Whether the panels can
		// be dragged is decided by screen width in MainView.reflow(), so it is
		// deliberately not touched here.
		this.$.ContentPanels.setIndex(memos.length ? 1 : 0);
	},

	createPanel: function() {
		return this.$.ContentPanels.createComponent({
			kind: "ContentPanel",
			onMemoEdited: "memoEdited",
			onDeleteRequested: "deleteRequested"
		}, {owner: this});
	},

	createEmptyPanel: function() {
		return this.$.ContentPanels.createComponent({kind: "EmptyPanel"}, {owner: this});
	},

	//* Panel index for a memo, or -1. Index 0 is always the empty panel.
	panelIndexOf: function(inMemo) {
		for (var i = 0; i < this.panelsByMemo.length; i++) {
			if (this.panelsByMemo[i].memo === inMemo) {
				return i + 1;
			}
		}
		return -1;
	},

	panelFor: function(inMemo) {
		var index = this.panelIndexOf(inMemo);
		return index > 0 ? this.panelsByMemo[index - 1].panel : null;
	},

	currentPanel: function() {
		var index = this.$.ContentPanels.getIndex();
		return index > 0 ? (this.panelsByMemo[index - 1] || {}).panel : null;
	},

	selectMemo: function(inMemo) {
		var index = this.panelIndexOf(inMemo);
		if (index < 0) {
			return;
		}
		this.$.ContentPanels.setIndex(index);
		if (enyo.Panels.isScreenNarrow()) {
			this.setIndex(1);
		}
		var panel = this.panelFor(inMemo);
		if (panel && inMemo.isEmpty()) {
			panel.focusBody();
		}
	},

	// --- List --------------------------------------------------------------

	setupMenuItem: function(inSender, inEvent) {
		var memo = this.store.memos[inEvent.index];
		if (!memo) {
			return false;
		}
		this.$.ItemTitle.setContent(Memo.escapeHtml(memo.getDisplayTitle()));
		this.$.ItemPreview.setContent(Memo.escapeHtml(this.previewFor(memo)));
		this.$.ItemColour.applyStyle("background-color", memo.getCssColour());
		this.$.MenuItem.addRemoveClass("selected", this.panelIndexOf(memo) === this.$.ContentPanels.getIndex());
		return true;
	},

	/**
		Second line of a list row: the start of the body, minus whatever is
		already showing as the title. com.palm.app.notes shows a body preview in
		its grid; a title-only row is blank for memos that have no title.
	*/
	previewFor: function(inMemo) {
		var text = inMemo.getText().replace(/\s+/g, " ");
		var title = inMemo.getDisplayTitle();
		if (text.indexOf(title) === 0) {
			text = text.substring(title.length);
		}
		return enyo.trim(text).substring(0, 80);
	},

	menuItemTapped: function(inSender, inEvent) {
		var memo = this.store.memos[inEvent.index];
		if (memo) {
			this.selectMemo(memo);
			this.$.MenuRepeater.refresh();
		}
		return true;
	},

	updateCount: function() {
		var count = this.store.memos.length;
		var label;
		if (this.filter) {
			label = count === 1 ? $L("1 search result") : enyo.format($L("%s search results"), count);
		} else if (count === 0) {
			label = $L("No memos");
		} else {
			label = count === 1 ? $L("1 memo") : enyo.format($L("%s memos"), count);
		}
		this.$.MenuHeader.setTagline(label);
	},

	// --- Editing -----------------------------------------------------------

	newMemo: function() {
		var self = this;
		this.clearSearch(function() {
			var memo = self.store.createMemo();
			// Held in memory only; MemoStore.save() drops it again if the user
			// backs out without typing anything, so a stray tap leaves no row.
			self.store.track(memo);
			self.rebuild();
			self.selectMemo(memo);
		});
		return true;
	},

	//* Creates a memo prefilled from a launch parameter (universal search).
	newMemoWithText: function(inText) {
		var self = this;
		this.clearSearch(function() {
			var memo = self.store.createMemo(inText);
			self.store.save(memo, function() {
				self.reload(memo);
			});
		});
	},

	memoEdited: function(inSender, inEvent) {
		var self = this;
		var memo = inEvent.memo;
		// Coalesce keystrokes; one merge per pause rather than per character.
		enyo.job("saveMemo", function() {
			self.saveMemo(memo);
		}, this.saveDelay);
		return true;
	},

	saveMemo: function(inMemo, inDone) {
		var self = this;
		inDone = inDone || enyo.nop;
		if (!inMemo) {
			inDone(null);
			return;
		}
		var wasNew = inMemo.isNew();
		this.store.save(inMemo, function(err) {
			if (!err) {
				self.$.MenuRepeater.refresh();
				if (wasNew) {
					self.updateCount();
				}
			}
			inDone(err);
		});
	},

	/**
		Writes out whatever the open panel is holding, right now. Used when the
		window is deactivated, where the debounce would otherwise lose the last
		few keystrokes.
	*/
	flush: function() {
		var panel = this.currentPanel();
		if (!panel || !panel.memo) {
			return;
		}
		enyo.job.stop("saveMemo");
		panel.commit();
		this.saveMemo(panel.memo);
	},

	deleteRequested: function(inSender, inEvent) {
		if (inEvent.memo) {
			this.doDeleteRequested({memo: inEvent.memo});
		}
		return true;
	},

	//* Called once the owner has confirmed the delete.
	deleteMemo: function(inMemo) {
		var self = this;
		enyo.job.stop("saveMemo");
		this.store.remove(inMemo, function() {
			self.rebuild();
			self.setIndex(0);
		});
	},

	// --- Search ------------------------------------------------------------

	searchInput: function(inSender, inEvent) {
		var self = this;
		var value = inEvent.value || "";
		// db8 serves the query through the kind's nameSearch index, so the term
		// is passed through as text; it is never compiled into a RegExp.
		enyo.job("searchMemos", function() {
			self.applyFilter(value);
		}, this.searchDelay);
		return true;
	},

	applyFilter: function(inFilter) {
		var filter = enyo.trim(inFilter || "");
		if (filter === this.filter) {
			return;
		}
		// Anything unsaved in the open panel would be dropped by the reload.
		this.flush();
		this.filter = filter;
		this.reload();
	},

	//* Empties the search box and reloads the full list, then calls inDone.
	clearSearch: function(inDone) {
		inDone = inDone || enyo.nop;
		enyo.job.stop("searchMemos");
		this.$.MenuHeader.clearSearch();
		if (!this.filter) {
			inDone();
			return;
		}
		var self = this;
		this.flush();
		this.filter = "";
		this.store.load("", function() {
			self.rebuild();
			inDone();
		});
	},

	// --- Misc --------------------------------------------------------------

	handleBackGesture: function() {
		return this.setIndex(0);
	},

	storeError: function(inSender, inEvent) {
		// Surfacing this properly needs a banner; logging at least stops a failed
		// write from looking like a successful one.
		enyo.warn("Memos: " + (inEvent.message || "database error"));
		return true;
	}
});
