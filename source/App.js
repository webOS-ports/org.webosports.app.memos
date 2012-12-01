var storageObject = {};

enyo.kind({
	name: "App",
	kind: "Panels",
	fit: true,
	realtimeFit: true,
	arrangerKind: "CollapsingArranger",
	draggable: false,
	components:[
			{name: "MenuPanel",
			layoutKind: "FittableRowsLayout",
			components:[
				{kind: "onyx.Toolbar", components:[
					{content: "Memos"},
					{kind: "onyx.InputDecorator", style: "float: right", components:[
						{kind: "onyx.Input", disabled: true},
						{kind: "Image", src: "assets/search-input-search.png", style: "width: 20px; height: 20px;"}
					]}
				]},
				{kind: "Scroller",
				horizontal: "hidden",
				classes: "enyo-fill",
				fit: true,
				components:[
					{name: "MenuRepeater",
					kind: "Repeater",
					count: 0,
					onSetupItem: "setupMenuItem",
					components:[
						{classes: "list-item",
						ontap: "menuItemTapped",
						components:[
							{name: "ItemTitle", style: "position: absolute; margin-top: 6px;"},
							{kind: "onyx.Button",
							classes: "colour-button",
							style: "background-color: #F7EDB9; float: right;"},
						]}
					]}
				]},
				{kind: "onyx.Toolbar", components:[
					{kind: "onyx.IconButton",
					src: "assets/icon-new.png",
					style: "float: right",
					ontap: "newMemo"},
				]}
			]},
			{name: "ContentPanels",
			kind: "Panels",
			arrangerKind: "CardArranger",
			draggable: false,
			components:[
				{kind: "EmptyPanel"}
			]}
	],
	rendered: function(inSender) {
		//localStorage.clear();
		this.inherited(arguments);
		this.loadMemos();
	},
	saveMemos: function() {
		storageObject = {};
	
		var c = this.$.ContentPanels.getPanels();
		
		idx = 0;
		for(var panel in c) {
			if(c[panel].kind == "ContentPanel") {
				storageObject[idx] = {};
				storageObject[idx].title = c[panel].$.TitleInput.getValue();
				storageObject[idx].colour = c[panel].$.ContentScroller.hasNode().style.backgroundColor;
				storageObject[idx].text = c[panel].$.MemoText.getValue();
				idx++;
			}
		}
		
		localStorage.webOSMemos = JSON.stringify(storageObject);
	},
	loadMemos: function() {
		var c = this.$.ContentPanels.getPanels();
		
		for(var panel in c) {
			if(c[panel].kind == "ContentPanel")
				c[panel].destroy();
		}
		
		this.$.MenuRepeater.setCount(0);
		
		if(localStorage.webOSMemos) {
			storageObject = JSON.parse(localStorage.webOSMemos);
			enyo.log(storageObject);
			enyo.log(this.$.ContentPanels.getPanels());
		
			var idx = 0;
			for(var key in storageObject) {
				p = this.createPanel();
				p.$.TitleInput.setValue(storageObject[key].title);
				p.$.ContentScroller.addStyles("background-color: " + storageObject[key].colour + "!important;");
				p.$.MemoText.setValue(storageObject[key].text);
				idx++;
			}
			
			this.$.MenuRepeater.setCount(idx);
			this.$.ContentPanels.reflow();
		}
		
		if(this.$.MenuRepeater.count == 0) {
			this.draggable = false;
			this.$.ContentPanels.setIndex(0);
		}
		else {
			this.draggable = true;
			this.$.ContentPanels.setIndex(2);
		}
	},
	createPanel: function(inSender) {
		var c = this.$.ContentPanels;
		var p = c.createComponent(
			{kind: "ContentPanel",
			onTitleChanged: "panelTitleChanged",
			onColourChanged: "panelColourChanged",
			onMemoChanged: "memoChanged",
			onDeleteTapped: "deleteMemo"},
			{owner: this}
		);
		p.render();
		
		return p;
	},
	setupMenuItem: function(inSender, inEvent) {
		var c = this.$.ContentPanels.getPanels();
		if(c[inEvent.index + 1]) {
			var t = c[inEvent.index + 1].$.TitleInput.getValue();
			inEvent.item.controls[0].controls[0].setContent(t);
			var bg = c[inEvent.index + 1].$.ContentScroller.hasNode().style.backgroundColor;
			inEvent.item.controls[0].controls[1].addStyles("background-color: " + bg + "!important;");
		}
		return true;
	},
	newMemo: function(inSender, inEvent) {
		var count = 0;
		for(idx in storageObject)
			count++;
		this.createPanel();
		this.$.ContentPanels.next();
		
		storageObject[count++] = {title: "", colour: "", text: ""};
		localStorage.webOSMemos = JSON.stringify(storageObject);
		this.$.MenuRepeater.setCount(count);
		
		this.draggable = true;
	},
	deleteMemo: function(inSender) {
		delete storageObject[this.$.ContentPanels.getActive().index];
		this.$.ContentPanels.getActive().destroy();
		this.$.ContentPanels.next();
		this.$.MenuRepeater.setCount(this.$.ContentPanels.getPanels().length - 1);
		
		this.saveMemos();
		
		if(this.$.MenuRepeater.count == 0) {
			this.draggable = false;
			this.setIndex(0);
		}
	},
	panelTitleChanged: function(inSender, inEvent) {
		this.$.MenuRepeater.build();
		this.saveMemos();
	},
	panelColourChanged: function(inSender, inEvent) {
		this.$.MenuRepeater.build();
		this.saveMemos();
	},
	memoChanged: function(inSender, inEvent) {
		this.saveMemos();
	},
	menuItemTapped: function(inSender, inEvent) {
		this.$.ContentPanels.setIndex(inEvent.index + 1);
	}
});

enyo.kind({
	name: "EmptyPanel", layoutKind: "FittableRowsLayout", components:[
		{kind: "onyx.Toolbar"},
		{fit: true},
		{kind: "onyx.Toolbar"}
	]
});

enyo.kind({
	name: "ContentPanel",
	layoutKind: "FittableRowsLayout",
	events: {
		onTitleChanged: "",
		onColourChanged: "",
		onMemoChanged: "",
		onDeleteTapped: ""
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
		components:[
			{name: "MemoText",
			kind: "RichText",
			content: "foo",
			style: "position: absolute; top: 0; bottom: 0; left: 0; right: 0; padding: 20px 32px;",
			oninput: "memoChanged"},
		]},
		{kind: "onyx.Toolbar", components:[
			{kind: "onyx.Grabber"},
			{kind: "ColourPicker",
			style: "position: absolute; left: 50%; margin-left: -92px;",
			onChanged: "colorChanged"},
		]}
	],
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
