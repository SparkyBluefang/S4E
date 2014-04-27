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

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

const s4e_service = CC["@caligonstudios.com/status4evar;1"].getService(CI.nsIStatus4Evar);

const STATUS_BAR_ID = "status4evar-status-bar";
const DEFAULT_WIDGETS = ["status4evar-status-widget", "status4evar-download-button", "status4evar-progress-widget"];
const DEFAULT_POSITIONS = [0, 1, 2];

CU.import("resource:///modules/CustomizableUI.jsm");

CustomizableUI.registerArea(STATUS_BAR_ID, {
	type: CustomizableUI.TYPE_TOOLBAR,
	legacy: true,
	defaultPlacements: DEFAULT_WIDGETS
});

if(s4e_service.firstRunAustralis)
{
	DEFAULT_WIDGETS.forEach(function(id, index) {
		let placement = CustomizableUI.getPlacementOfWidget(id);
		if(!placement || placement.area === CustomizableUI.AREA_NAVBAR)
		{
			CustomizableUI.addWidgetToArea(id, STATUS_BAR_ID, DEFAULT_POSITIONS[index]);
		}
		else if(id === DEFAULT_WIDGETS[0])
		{
			CustomizableUI.addWidgetToArea("spring", STATUS_BAR_ID, DEFAULT_POSITIONS[index]);
		}
	});
}

