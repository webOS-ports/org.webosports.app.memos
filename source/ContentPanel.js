enyo.kind({
	name: "ContentPanel",
	layoutKind: "FittableRowsLayout",
	events: {
		onTitleChanged: "",
		onColourChanged: "",
		onMemoChanged: "",
		onDeleteTapped: ""
	},
	published: {
		gc: false,
		searchMatch: false
	},
	components:[
		{name: "Topbar", kind: "onyx.Toolbar", components:[
			{kind: "onyx.InputDecorator", components:[
				{name: "TitleInput",
				kind: "onyx.Input",
				defaultFocus: true,
				placeholder: "Title...",
				oninput: "inputChanged"}
			]},
			{kind: "onyx.IconButton", src: "assets/icon-trash.png", style: "float: right", ontap: "doDeleteTapped"},
			//{kind: "onyx.IconButton", src: "assets/icon-email.png", style: "float: right"}
		]},
		{name: "ContentScroller",
		kind: "Scroller",
		horizontal: "hidden",
		style: "background-color: #F7EDB9",
		fit: true,
		touch: true,
		components:[
			{name: "MemoText",
			kind: "RichText",
			content: "",
			style: "position: absolute; top: 0; bottom: 0; left: 0; right: 0; padding: 20px 32px;",
			oninput: "memoChanged",
			handlers: {
				ondragstart: ""
			}},
		]},
		{kind: "onyx.Toolbar", components:[
			{name: "Grabber", kind: "onyx.Grabber"},
			{kind: "ColourPicker",
			style: "position: absolute; left: 50%; margin-left: -92px;",
			onChanged: "colorChanged"},
		]}
	],
	reflow: function(inSender) {
		this.inherited(arguments);
		if(enyo.Panels.isScreenNarrow()) {
			this.$.Grabber.applyStyle("visibility", "hidden");
		}
		else {
			this.$.Grabber.applyStyle("visibility", "shown");
		}
	},
	inputChanged: function(inSender) {
		this.doTitleChanged({index: this.container.index, value: this.$.TitleInput.getValue()});
	},
	colorChanged: function(inSender, inEvent) {
		this.$.ContentScroller.addStyles("background-color: " + inEvent.value + ";");
		this.doColourChanged({index: this.container.index, value: inEvent.value});
	},
	memoChanged: function(inSender) {
		this.doMemoChanged({index: this.container.index, value: this.$.MemoText.getValue()});
	}
});