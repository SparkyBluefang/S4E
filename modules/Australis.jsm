/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Copyright (C) 2013 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
*/

"use strict";

const EXPORTED_SYMBOLS = [];

const CU = Components.utils;

CU.import("resource:///modules/CustomizableUI.jsm");

CustomizableUI.registerArea("status4evar-status-bar", {
	type: CustomizableUI.TYPE_TOOLBAR,
	legacy: true,
	defaultPlacements: ["status4evar-status-widget", "status4evar-download-button", "status4evar-progress-widget"]
});

