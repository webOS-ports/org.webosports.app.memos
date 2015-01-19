enyo.depends(
	"$lib/layout",
	"$lib/onyx",	// To theme Onyx using Theme.less, change this line to $lib/onyx/source,
	//"Theme.less",	// uncomment this line, and follow the steps described in Theme.less
	"$lib/webos-lib",
	// CSS/LESS style files
	"style",
	// Model and data definitions
	"data",
	// View kind definitions
	"views",
	// Include our default entry point
	"app.js"
);
