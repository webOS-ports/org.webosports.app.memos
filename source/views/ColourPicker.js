enyo.kind({
	name: "ColourPicker",
	kind: "onyx.RadioGroup",
	classes: "colour-picker",
	events: {
		onChanged: ""
	},
	components:[
		{kind: "onyx.Button", classes: "colour-button", style: "background-color: lightblue", ontap: "clicked"},
		{kind: "onyx.Button", classes: "colour-button", style: "background-color: #F7EDB9", active: true, ontap: "clicked"},
		{kind: "onyx.Button", classes: "colour-button", style: "background-color: lightgreen", ontap: "clicked"},
		{kind: "onyx.Button", classes: "colour-button", style: "background-color: pink", ontap: "clicked"},
		{kind: "onyx.Button", classes: "colour-button", style: "background-color: salmon", ontap: "clicked"},
	],
	clicked: function() {
		this.doChanged({value: this.active.hasNode().style.backgroundColor});
	},
});