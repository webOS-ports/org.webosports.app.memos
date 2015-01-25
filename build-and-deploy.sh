#!/bin/bash


node enyo/tools/deploy.js -o deploy/org.webosports.app.memos

adb push deploy/org.webosports.app.memos /usr/palm/applications/org.webosports.app.memos

adb shell luna-send -n 1 luna://com.palm.applicationManager/rescan {}

adb shell systemctl restart luna-next