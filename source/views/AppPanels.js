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
		storageObject = [];
	
		var c = this.$.ContentPanels.getPanels();
		
		for(var panel in c) {
			// Check the kind is ContentPanel to exlcude EmptyPanel
			if(c[panel].kind == "ContentPanel") {
				var row = {};
				row.title = c[panel].$.TitleInput.getValue();
				row.colour = c[panel].$.ContentScroller.hasNode().style.backgroundColor;
				row.text = c[panel].$.MemoText.getValue();
				storageObject.push(row);
			}
		}
		localStorage.webOSMemos = JSON.stringify(storageObject);
	},

	loadMemos: function() {

		this.$.ContentPanels.destroyClientControls();
		this.createEmptyPanel();
		this.$.MenuRepeater.setCount(0);
		
		//If localStorage exists, loop through and populate 
		if(localStorage.webOSMemos) {
			storageObject = JSON.parse(localStorage.webOSMemos);
			
			var idx = 0;
			for(var key in storageObject) {
				if(!isNaN(key)){
					p = this.createPanel();
					p.$.TitleInput.setValue(storageObject[key].title);
					p.$.ContentScroller.addStyles("background-color: " + storageObject[key].colour);
					p.$.MemoText.setValue(storageObject[key].text);
					p.render();
					idx++;
				}
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

	createEmptyPanel: function(inSender) {
		var c = this.$.ContentPanels;
		return c.createComponent(
			{kind: "EmptyPanel"},
			{owner: this}
		);
	},
	
	setupMenuItem: function(inSender, inEvent) {
		
		// index +1 to pass the EmptyPanel
		if(storageObject[inEvent.index] && !this.$.MenuHeader.searchActive()) {
			this.$.ItemTitle.setContent(storageObject[inEvent.index].title);
			this.$.ItemColour.addStyles("background-color: " + storageObject[inEvent.index].colour + "!important;");
		}
		else if(searchResults[inEvent.index]) {
			this.$.ItemTitle.setContent(searchResults[inEvent.index].title);
			this.$.ItemColour.addStyles("background-color: " + searchResults[inEvent.index].colour + "!important;");
		}
		
		return true;
	},

	newMemo: function(inSender, inEvent) {
		this.clearSearch();
		var count = 0;
		for(var idx in storageObject){
			if(!isNaN(idx)){
				count++;
			}
		}
		p = this.createPanel();
		p.render();
		this.$.ContentPanels.reflow();
		
		var cp = this.$.ContentPanels;
		cp.setIndex(cp.getPanels().length);
		
		if(enyo.Panels.isScreenNarrow()){
			this.setIndex(1);
			// re-redner to get the focus back
			p.render();
		}
		
		storageObject[count++] = {title: "", colour: "", text: ""};
		this.$.MenuRepeater.setCount(count);
		this.$.MenuRepeater.refresh();
		this.saveMemos();
		
		this.draggable = true;

	},

	deleteMemo: function(inSender) {
		this.clearSearch();
		// index-1 to exclude the empty Panel
		storageObject.splice(this.$.ContentPanels.index-1,1);
		this.$.ContentPanels.setIndex(0);
		localStorage.webOSMemos = JSON.stringify(storageObject);
		this.loadMemos();
		this.setIndex(0);
	},

	panelTitleChanged: function(inSender, inEvent) {
		enyo.job(null, enyo.bind( this, function(){
			this.saveMemos();
			this.$.MenuRepeater.refresh();
			}), 200);
		
	},

	panelColourChanged: function(inSender, inEvent) {
		this.saveMemos();
		this.$.MenuRepeater.refresh();
	},

	memoChanged: function(inSender, inEvent) {
		enyo.job(null, enyo.bind( this, "saveMemos" ),200);
	},

	menuItemTapped: function(inSender, inEvent) {

		if(!this.$.MenuHeader.searchActive()) {
			// index +1 to pass the EmptyPanel
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
		
		if(enyo.Panels.isScreenNarrow()) {
			this.setIndex(1);
		}
			
	},

	searchMemos: function(inSender, inEvent) {
		searchResults = {};
		
		var r = this.$.MenuRepeater;
		var m = 0;
		// TODO: setting to change case sensitive search on/off
		var searchTerm = new RegExp(inEvent.value, "i");
		
		for(var item in storageObject) {
			if(!isNaN(item)){
				
				if(storageObject[item].title.match(searchTerm) || storageObject[item].text.match(searchTerm)) {
					searchResults[m] = {title: storageObject[item].title, colour: storageObject[item].colour};
					m++;
				}
			}
		}

		r.setCount(m);
		r.refresh();
	},

	clearSearch: function(){
		searchResults = {};

		// TODO - expose a clearSearch method on PortsSearch Kind
		this.$.MenuHeader.$.SearchInput.setValue("");

	}
});