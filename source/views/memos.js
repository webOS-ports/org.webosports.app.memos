/**
	Application shell: panels, webOS window events and launch handling.
*/

enyo.kind({
	name: "memos.MainView",
	layoutKind: "FittableRowsLayout",

	components: [
		{kind: "Signals",
			ondeviceready: "deviceReady",
			onbackbutton: "handleBackGesture",
			// Flush pending edits when the card is minimised or closed; the save
			// debounce would otherwise drop the last few keystrokes.
			ondeactivate: "handleDeactivate",
			// Relaunching a running app delivers new launch parameters.
			onrelaunch: "handleRelaunch",
			onCoreNaviDragStart: "handleCoreNaviDragStart",
			onCoreNaviDrag: "handleCoreNaviDrag",
			onCoreNaviDragFinish: "handleCoreNaviDragFinish"},
		{name: "AppPanels", kind: "AppPanels", fit: true, onDeleteRequested: "deleteRequested"},
		{kind: "CoreNavi", fingerTracking: true},
		// Kept out of AppPanels: enyo.Panels treats every child control as a
		// panel, so a popup declared in there would be arranged as one.
		{name: "ConfirmDelete", kind: "ConfirmDelete", onConfirmed: "deleteConfirmed"}
	],

	create: function() {
		this.inherited(arguments);
		// com.palm.app.notes allows every orientation; match it.
		webos.setWindowOrientation("free");
	},

	rendered: function() {
		this.inherited(arguments);
		this.handleLaunchParams(this.launchParams());
	},

	launchParams: function() {
		return window.PalmSystem ? webos.launchParams() : {};
	},

	/**
		Acts on launch parameters. The appinfo.json universalSearch action passes
		the typed text as "text", which opens straight into a new memo holding it.
	*/
	handleLaunchParams: function(inParams) {
		if (inParams && inParams.text) {
			this.$.AppPanels.newMemoWithText(inParams.text);
		}
	},

	//Handlers
	reflow: function() {
		this.inherited(arguments);
		if (enyo.Panels.isScreenNarrow()) {
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

	deviceReady: function() {
		return true;
	},

	deleteRequested: function(inSender, inEvent) {
		this.$.ConfirmDelete.confirm(inEvent.memo);
		return true;
	},

	deleteConfirmed: function(inSender, inEvent) {
		this.$.AppPanels.deleteMemo(inEvent.memo);
		return true;
	},

	handleDeactivate: function() {
		this.$.AppPanels.flush();
		return true;
	},

	handleRelaunch: function(inSender, inEvent) {
		this.handleLaunchParams(inEvent);
		return true;
	},

	handleBackGesture: function() {
		this.$.AppPanels.setIndex(0);
	},

	handleCoreNaviDragStart: function(inSender, inEvent) {
		this.$.AppPanels.dragstartTransition(this.$.AppPanels.draggable === false ? this.reverseDrag(inEvent) : inEvent);
	},

	handleCoreNaviDrag: function(inSender, inEvent) {
		this.$.AppPanels.dragTransition(this.$.AppPanels.draggable === false ? this.reverseDrag(inEvent) : inEvent);
	},

	handleCoreNaviDragFinish: function(inSender, inEvent) {
		this.$.AppPanels.dragfinishTransition(this.$.AppPanels.draggable === false ? this.reverseDrag(inEvent) : inEvent);
	},

	//Utility Functions
	reverseDrag: function(inEvent) {
		inEvent.dx = -inEvent.dx;
		inEvent.ddx = -inEvent.ddx;
		inEvent.xDirection = -inEvent.xDirection;
		return inEvent;
	}
});
