/**
	Editor for a single memo.

	The panel is bound to a Memo instance rather than to raw strings, so colours
	are symbolic names, the title falls back to the derived one, and every edit
	reports whether it actually changed anything (which keeps the app from
	writing to db8 on every keystroke that made no difference).
*/

enyo.kind({
	name: "ContentPanel",
	layoutKind: "FittableRowsLayout",

	events: {
		//* Sent after the memo has been edited; inEvent.memo is the memo.
		onMemoEdited: "",
		//* Sent when the user asks to delete; the owner confirms first.
		onDeleteRequested: ""
	},

	published: {
		memo: null
	},

	components: [
		{name: "Topbar", kind: "onyx.Toolbar", components: [
			{kind: "onyx.InputDecorator", classes: "title-decorator", components: [
				{name: "TitleInput", kind: "onyx.Input", oninput: "titleEdited", onblur: "titleCommitted"}
			]},
			{name: "DeleteButton", kind: "onyx.IconButton", src: "assets/icon-trash.png",
				classes: "topbar-button", ontap: "deleteTapped"},
			{name: "SendButton", kind: "onyx.IconButton", src: "assets/icon-email.png",
				classes: "topbar-button", ontap: "sendTapped"}
		]},
		{name: "ContentScroller", kind: "Scroller", horizontal: "hidden", fit: true, touch: true,
			classes: "memo-body", components: [
				{name: "MemoText", kind: "RichText", classes: "memo-text", oninput: "textEdited",
					handlers: {ondragstart: ""}}
			]},
		{kind: "onyx.Toolbar", components: [
			{name: "Grabber", kind: "onyx.Grabber"},
			{name: "ColourPicker", kind: "ColourPicker", classes: "colour-picker-bar",
				onColourChanged: "colourEdited"}
		]}
	],

	create: function() {
		this.inherited(arguments);
		this.$.TitleInput.setPlaceholder($L("Title..."));
	},

	reflow: function() {
		this.inherited(arguments);
		// The grabber only means anything when the panels can be dragged.
		this.$.Grabber.applyStyle("visibility", enyo.Panels.isScreenNarrow() ? "hidden" : "visible");
	},

	//* Loads a memo into the editor.
	memoChanged: function() {
		if (!this.memo) {
			return;
		}
		this.$.TitleInput.setValue(this.memo.getTitle());
		// The display form: html-escaped, newlines as <br/>, and URLs turned into
		// links by the system text indexer. Memo.sanitize() reverses it on the way
		// back out, the same round trip com.palm.app.notes does.
		this.$.MemoText.setValue(this.memo.getDisplayText());
		this.applyColour(this.memo.getColour());
		// Keep the swatch in step with the memo. Without this the picker kept
		// whatever the previous panel had selected.
		this.$.ColourPicker.setColour(this.memo.getColour());
	},

	applyColour: function(inColour) {
		var css = Memo.cssColours[Memo.normaliseColour(inColour)];
		this.$.ContentScroller.applyStyle("background-color", css);
	},

	//* Moves focus into the body, for a memo the user just created.
	focusBody: function() {
		if (this.$.MemoText.hasNode()) {
			this.$.MemoText.focus();
		}
	},

	/**
		Pulls the current control values into the memo. Returns true if anything
		changed. Called on every edit and again before saving, so a save triggered
		by the window closing still captures the last keystroke.
	*/
	commit: function() {
		if (!this.memo) {
			return false;
		}
		var changed = this.memo.setText(this.$.MemoText.getValue());
		changed = this.memo.setTitle(this.$.TitleInput.getValue()) || changed;
		return changed;
	},

	titleEdited: function() {
		this.reportEdit();
		return true;
	},

	titleCommitted: function() {
		// An emptied title falls back to the derived one; show that immediately
		// rather than leaving the field blank.
		if (this.memo && !enyo.trim(this.$.TitleInput.getValue())) {
			this.$.TitleInput.setValue(this.memo.getTitle());
		}
		return true;
	},

	textEdited: function() {
		this.reportEdit();
		return true;
	},

	colourEdited: function(inSender, inEvent) {
		if (!this.memo) {
			return true;
		}
		this.memo.setColour(inEvent.colour);
		this.applyColour(inEvent.colour);
		this.reportEdit();
		return true;
	},

	reportEdit: function() {
		this.commit();
		this.doMemoEdited({memo: this.memo});
	},

	deleteTapped: function() {
		this.doDeleteRequested({memo: this.memo});
		return true;
	},

	sendTapped: function() {
		if (!this.memo) {
			return true;
		}
		this.commit();
		AppManager.sendMemo(this.memo);
		return true;
	}
});
