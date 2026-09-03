/**
	Colour picker over the shared palette.

	Emits the symbolic colour name ("blue", "yellow", ...) that the
	com.palm.note:1 schema stores, not a CSS value. Earlier builds read
	`this.active.hasNode().style.backgroundColor` back out of the DOM, which gave
	a browser-dependent string that could not round-trip through db8 and threw
	whenever the control had not been rendered yet.
*/

enyo.kind({
	name: "ColourPicker",
	kind: "onyx.RadioGroup",
	classes: "colour-picker",

	events: {
		//* inEvent.colour is a name from Memo.colours
		onColourChanged: ""
	},

	create: function() {
		this.inherited(arguments);
		// Guards the selection against being reported as a user choice while the
		// picker is being built or synced to a memo.
		this.syncing = true;
		try {
			this.buildButtons();
		} finally {
			this.syncing = false;
		}
	},

	buildButtons: function() {
		var definitions = enyo.map(Memo.colours, function(inColour) {
			return {
				name: "colour_" + inColour,
				kind: "onyx.Button",
				classes: "colour-button colour-" + inColour,
				// Sourced from Memo.cssColours so the swatch, the editor
				// background and the list chip cannot drift apart.
				style: "background-color: " + Memo.cssColours[inColour] + ";",
				colourName: inColour
			};
		});
		this.createComponents(definitions, {owner: this});
	},

	//* Moves the selection to inColour without reporting a change.
	setColour: function(inColour) {
		var button = this.$["colour_" + Memo.normaliseColour(inColour)];
		if (!button || button === this.getActive()) {
			return;
		}
		this.syncing = true;
		try {
			// Go through the button so enyo.Group sees a normal activation and
			// the button's own active flag stays in step with the group's.
			button.setActive(true);
		} finally {
			this.syncing = false;
		}
	},

	getColour: function() {
		var active = this.getActive();
		return (active && active.colourName) || Memo.defaultColour;
	},

	activeChanged: function() {
		this.inherited(arguments);
		if (this.syncing) {
			return;
		}
		var active = this.getActive();
		if (active && active.colourName) {
			this.doColourChanged({colour: active.colourName});
		}
	}
});
