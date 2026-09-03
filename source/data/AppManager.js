/**
	Cross-app launches.

	com.palm.app.notes hands a memo to the email app through
	com.palm.applicationManager/open; this is the same call. The toolbar button
	and its icon already shipped in this app but were commented out and never
	wired to anything.
*/

AppManager = {
	//* Opens the email composer prefilled with the memo body.
	sendMemo: function(inMemo, inDone) {
		inDone = inDone || enyo.nop;

		if (!window.PalmServiceBridge) {
			enyo.warn("AppManager: no service bridge, cannot send memo");
			inDone({errorText: "Sharing is not available here"});
			return null;
		}

		var request = new enyo.ServiceRequest({
			service: "luna://com.palm.applicationManager",
			method: "open"
		});
		request.response(function() {
			inDone(null);
		});
		request.error(function(inSender, inError) {
			enyo.warn("AppManager: could not launch email app");
			inDone(inError || {errorText: "Could not open the email app"});
		});
		request.go({
			id: "com.palm.app.email",
			params: {
				summary: inMemo.getDisplayTitle() || $L("Just a quick memo"),
				text: inMemo.getDisplayText()
			}
		});
		return request;
	}
};

enyo.AppManager = AppManager;
