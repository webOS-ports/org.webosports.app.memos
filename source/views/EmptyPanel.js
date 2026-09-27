/**
	Placeholder shown on the content side when no memo is selected.
*/

enyo.kind({
	name: "EmptyPanel",
	layoutKind: "FittableRowsLayout",
	classes: "empty-panel",
	components: [
		{kind: "onyx.Toolbar"},
		{name: "Message", classes: "empty-panel-message", fit: true},
		{kind: "onyx.Toolbar"}
	],
	create: function() {
		this.inherited(arguments);
		this.$.Message.setContent($L("Select a memo, or tap + to write one."));
	}
});
