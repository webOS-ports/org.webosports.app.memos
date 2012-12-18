#webos-ports-lib

*A selection of additional enyo2 kinds to aid development for Open webOS*

##PortsHeader

An onyx.Toolbar that displays the app icon, a custom title and an optional random tagline.

**Example:**

     {kind: "PortsHeader",
     title: "FooApp",
     taglines: [
          "My foo-st app",
          "Banana boat.",
          "Fweeeeeeep. F'tang."
     ]}

##PortsSearch

A variant of the PortsHeader that contains an animated, expandable search bar. onSearch is fired every time the field receives input, passing it's contents through via inEvent.value.

**Example:**

     {kind: "PortsSearch",
     title: "SearchyFooApp",
     taglines: [
          "My foo-st app",
          "Banana boat.",
          "Fweeeeeeep. F'tang."
     ],
     onSearch: "searchFieldChanged"}

##BackGesture

A kind that listens for the webOS Back Gesture and fires onBack. Both 2.x and Open webOS are supported, as well as the Esc key on desktop browsers.

**Example:**

     {kind: "BackGesture", onBack: "doBackFoo"}
