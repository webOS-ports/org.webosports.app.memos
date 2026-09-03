/**
	Confirmation before a memo is destroyed.

	com.palm.app.notes puts this in front of every delete, from both the grid and
	the edit view. Earlier builds of this app deleted on the first tap with no
	confirmation and no undo, so a mis-tap on the toolbar lost the memo.
*/

enyo.kind({
	name: "ConfirmDelete",
	kind: "onyx.Popup",
	classes: "confirm-delete",
	modal: true,
	floating: true,
	centered: true,
	scrim: true,
	autoDismiss: false,

	events: {
		//* Sent when the user confirms; inEvent.memo is the memo to delete.
		onConfirmed: ""
	},

	components: [
		{name: "Title", classes: "confirm-delete-title"},
		{name: "Text", classes: "confirm-delete-text"},
		{classes: "confirm-delete-buttons", components: [
			{name: "CancelButton", kind: "onyx.Button", classes: "confirm-delete-button",
				ontap: "cancelTapped"},
			{name: "DeleteButton", kind: "onyx.Button", classes: "confirm-delete-button onyx-negative",
				ontap: "deleteTapped"}
		]}
	],

	create: function() {
		this.inherited(arguments);
		// Set here rather than inline so the strings resolve through $L() at
		// runtime instead of when the kind is declared.
		this.$.Title.setContent($L("Are you sure you want to delete this memo?"));
		this.$.Text.setContent($L("You cannot undo this action."));
		this.$.CancelButton.setContent($L("Cancel"));
		this.$.DeleteButton.setContent($L("Delete"));
	},

	//* Opens the confirmation for a specific memo.
	confirm: function(inMemo) {
		this.memo = inMemo;
		this.show();
	},

	cancelTapped: function() {
		this.memo = null;
		this.hide();
		return true;
	},

	deleteTapped: function() {
		var memo = this.memo;
		this.memo = null;
		this.hide();
		if (memo) {
			this.doConfirmed({memo: memo});
		}
		return true;
	}
});
