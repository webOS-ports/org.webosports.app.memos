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

enyo.kind({
	name: "EmptyPanel", layoutKind: "FittableRowsLayout", components:[
		{kind: "onyx.Toolbar"},
		{fit: true},
		{kind: "onyx.Toolbar"}
	]
});

var storageObject = {};
var searchResults = {};

enyo.kind({
	name: "AppPanels",
	kind: "Panels",
	fit: true,
	realtimeFit: true,
	arrangerKind: "CollapsingArranger",
	classes: "app-panels",
	components:[
		{name: "MenuPanel",
		layoutKind: "FittableRowsLayout",
		style: "width: 33%",
		components:[
			{name: "MenuHeader",
			kind: "PortsSearch",
			title: "Memos",
			onSearch: "searchMemos",
			taglines:[
				"Memo-tastic!",
				"(Better than Notes)",
				"Random taglines are still awesome.",
				"Not as sticky as you'd think.",
				"Pastel colours. Mmm.",
				"Now with 100% more sliding!",
				"Exactly what is says on the tin.",
				"Skeumorphism is so 2009."
			]},
			{name: "MenuRepeater",
			kind: "List",
			fit: true,
			count: 0,
			onSetupItem: "setupMenuItem",
			components:[
				{classes: "list-item",
				index: 0,
				ontap: "menuItemTapped",
/*
				handlers: {
					onmousedown: "pressed",
					ondragstart: "released",
					onmouseup: "released"
				},
*/
				components:[
					{name: "ItemTitle", style: "position: absolute; margin-top: 6px;"},
					{name: "ItemColour",
					kind: "onyx.Button",
					classes: "colour-button",
					style: "background-color: #F7EDB9; float: right;"},
				],
				pressed: function() {
					this.addClass("onyx-selected");
				},
				released: function() {
					this.removeClass("onyx-selected");
				}}
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
		onTransitionFinish: "gcPanels",
		components:[
			{kind: "EmptyPanel"}
		]}
	],
	rendered: function(inSender) {
		this.inherited(arguments);
		this.loadMemos();
	},
	handleBackGesture: function(inSender, inEvent) {
		return this.setIndex(0);
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
		//Erase existing panel data
		var c = this.$.ContentPanels.getPanels();
		
		for(var panel in c) {
			if(c[panel].kind == "ContentPanel")
				c[panel].destroy();
		}
		
		this.$.MenuRepeater.setCount(0);
		
		//If localStorage exists, loop through and populate 
		if(localStorage.webOSMemos) {
			storageObject = JSON.parse(localStorage.webOSMemos);
		
			var idx = 0;
			for(var key in storageObject) {
				p = this.createPanel();
				p.$.TitleInput.setValue(storageObject[key].title);
				p.$.ContentScroller.addStyles("background-color: " + storageObject[key].colour + "!important;");
				p.$.MemoText.setValue(storageObject[key].text);
				p.render();
				idx++;
			}
			
			this.$.ContentPanels.reflow();
			this.$.MenuRepeater.setCount(idx);
			this.$.MenuRepeater.refresh();
		}
		
		if(this.$.MenuRepeater.count == 0) {
			this.draggable = false;
			this.$.ContentPanels.setIndex(0);
		}
		else {
			this.draggable = true;
			this.$.ContentPanels.setIndex(1);
		}
	},
	createPanel: function(inSender) {
		var c = this.$.ContentPanels;
		return c.createComponent(
			{kind: "ContentPanel",
			onTitleChanged: "panelTitleChanged",
			onColourChanged: "panelColourChanged",
			onMemoChanged: "memoChanged",
			onDeleteTapped: "deleteMemo"},
			{owner: this}
		);
	},
	setupMenuItem: function(inSender, inEvent) {
		var c = this.$.ContentPanels.getPanels();
		enyo.log(inEvent);
		if(c[inEvent.index + 1] && !this.$.MenuHeader.searchActive()) {
			this.$.ItemTitle.setContent(c[inEvent.index + 1].$.TitleInput.getValue());
			this.$.ItemColour.addStyles("background-color: " + c[inEvent.index + 1].$.ContentScroller.hasNode().style.backgroundColor + "!important;");
		}
		else if(searchResults[inEvent.index]) {
			this.$.ItemTitle.setContent(searchResults[inEvent.index].title);
			this.$.ItemTitle.addStyles("background-color: " + searchResults[inEvent.index].colour + "!important;");
		}
		
		return true;
	},
	newMemo: function(inSender, inEvent) {
		var count = 0;
		for(idx in storageObject)
			count++;
			
		p = this.createPanel();
		p.render();
		this.$.ContentPanels.reflow();
		
		var cp = this.$.ContentPanels;
		cp.setIndex(cp.getPanels().length);
		
		if(enyo.Panels.isScreenNarrow())
			this.setIndex(1);
		
		storageObject[count++] = {title: "", colour: "", text: ""};
		this.$.MenuRepeater.setCount(count);
		this.$.MenuRepeater.refresh();
		this.saveMemos();
		
		this.draggable = true;
	},
	deleteMemo: function(inSender) {
		delete storageObject[this.$.ContentPanels.getActive().index];
		this.$.ContentPanels.getActive().gc = true;
		this.$.ContentPanels.setIndex(0);
	},
	gcPanels: function(inSender, inEvent) {
		var p = this.$.ContentPanels.getPanels()[inEvent.fromIndex];
		if(p && p.kind == "ContentPanel" && p.getGc()) {
			p.destroy();
			
			this.$.MenuRepeater.setCount(this.$.ContentPanels.getPanels().length - 1);
			this.$.MenuRepeater.refresh();
		
			this.saveMemos();
		
			if(this.$.MenuRepeater.count == 0)
				this.draggable = false;
				
			this.setIndex(0);
		}
	},
	panelTitleChanged: function(inSender, inEvent) {
		this.$.MenuRepeater.refresh();
		this.saveMemos();
	},
	panelColourChanged: function(inSender, inEvent) {
		this.$.MenuRepeater.refresh();
		this.saveMemos();
	},
	memoChanged: function(inSender, inEvent) {
		this.saveMemos();
	},
	menuItemTapped: function(inSender, inEvent) {
		if(!this.$.MenuHeader.searchActive()) {
			this.$.ContentPanels.setIndex(inEvent.index + 1);
		}
		else {
			var c = this.$.ContentPanels.getPanels();
			
			for(var panel in c) {
				if(c[panel].kind == "ContentPanel" && searchResults[inEvent.index].title == c[panel].$.TitleInput.getValue()) {
					this.$.ContentPanels.setIndex(panel);
					break;
				}
			}
			
		}
		
		if(enyo.Panels.isScreenNarrow())
			this.setIndex(1);
	},
	searchMemos: function(inSender, inEvent) {
		searchResults = {};
		
		var r = this.$.MenuRepeater;
		var p = this.$.ContentPanels.getPanels();
		var m = 0;
		for(var item in p) {
			if(p[item].kind == "ContentPanel") {
				if(p[item].$.TitleInput.getValue().match(inEvent.value) || p[item].$.MemoText.getValue().match(inEvent.value)) {
					searchResults[m] = {title: p[item].$.TitleInput.getValue(), colour: p[item].$.ContentScroller.hasNode().style.backgroundColor };
					m++;
				}
			}
		}
		r.setCount(m);
		r.refresh();
	}
});

enyo.kind({
	name: "App",
	layoutKind: "FittableRowsLayout",
	components: [
		{kind: "Signals",
		ondeviceready: "deviceready",
		onbackbutton: "handleBackGesture",
		onCoreNaviDragStart: "handleCoreNaviDragStart",
		onCoreNaviDrag: "handleCoreNaviDrag",
		onCoreNaviDragFinish: "handleCoreNaviDragFinish",},
		{name: "AppPanels", kind: "AppPanels", fit: true},
		{kind: "CoreNavi", fingerTracking: true}
	],
	//Handlers
	reflow: function(inSender) {
		this.inherited(arguments);
		if(enyo.Panels.isScreenNarrow()) {
			this.$.AppPanels.setArrangerKind("CoreNaviArranger");
			this.$.AppPanels.setDraggable(false);
			this.$.AppPanels.$.ContentPanels.addStyles("box-shadow: 0");
		}
		else {
			this.$.AppPanels.setArrangerKind("CollapsingArranger");
			this.$.AppPanels.setDraggable(true);
			this.$.AppPanels.$.ContentPanels.addStyles("box-shadow: -4px 0px 4px rgba(0,0,0,0.3)");
		}
	},
	handleBackGesture: function(inSender, inEvent) {
		this.$.AppPanels.setIndex(0);
	},
	handleCoreNaviDragStart: function(inSender, inEvent) {
		this.$.AppPanels.dragstartTransition(this.$.AppPanels.draggable == false ? this.reverseDrag(inEvent) : inEvent);
	},
	handleCoreNaviDrag: function(inSender, inEvent) {
		this.$.AppPanels.dragTransition(this.$.AppPanels.draggable == false ? this.reverseDrag(inEvent) : inEvent);
	},
	handleCoreNaviDragFinish: function(inSender, inEvent) {
		this.$.AppPanels.dragfinishTransition(this.$.AppPanels.draggable == false ? this.reverseDrag(inEvent) : inEvent);
	},
	//Utility Functions
	reverseDrag: function(inEvent) {
		inEvent.dx = -inEvent.dx;
		inEvent.ddx = -inEvent.ddx;
		inEvent.xDirection = -inEvent.xDirection;
		return inEvent;
	}
});
