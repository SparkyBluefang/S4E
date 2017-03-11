/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Copyright (C) 2017 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
*/

"use strict";

const EXPORTED_SYMBOLS = ["L10n"];

const CU = Components.utils;

CU.import("resource://gre/modules/Services.jsm");

const strings = Services.strings.createBundle("chrome://status4evar/locale/overlay.properties");

var L10n = {
	get: function(key)
	{
		return strings.GetStringFromName(key);
	}
}
