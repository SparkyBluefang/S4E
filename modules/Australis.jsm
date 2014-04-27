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

const EXPORTED_SYMBOLS = ["AustralisTools"];

const CU = Components.utils;

const STATUS_BAR_ID = "status4evar-status-bar";
const DEFAULT_WIDGETS = ["status4evar-status-widget", "status4evar-download-button", "status4evar-progress-widget"];
const DEFAULT_POSITIONS = [0, 1, 2];

CU.import("resource:///modules/CustomizableUI.jsm");
CU.import("resource://gre/modules/Services.jsm");

CustomizableUI.registerArea(STATUS_BAR_ID, {
	type: CustomizableUI.TYPE_TOOLBAR,
	legacy: true,
	defaultPlacements: DEFAULT_WIDGETS
});

let AustralisTools = {
	migrateOnce: false,

	migrate: function()
	{
		if(this.migrateOnce)
		{
			return;
		}
		this.migrateOnce = true;

		DEFAULT_WIDGETS.forEach(function(id, index) {
			let placement = CustomizableUI.getPlacementOfWidget(id);
			if(!placement || placement.area === CustomizableUI.AREA_NAVBAR)
			{
				Services.console.logStringMessage("Moving widget: " + id + " [" + CustomizableUI.isWidgetRemovable(id) + "]");
				CustomizableUI.addWidgetToArea(id, STATUS_BAR_ID, DEFAULT_POSITIONS[index]);
			}
			else if(id === DEFAULT_WIDGETS[0])
			{
				Services.console.logStringMessage("Adding spring");
				CustomizableUI.addWidgetToArea("spring", STATUS_BAR_ID, DEFAULT_POSITIONS[index]);
			}
		});
	}
}

let statusBarHandler = {
	getSpringId: function(aArea)
	{
		let springId = null;

		let widgetIds = CustomizableUI.getWidgetIdsInArea(aArea);
		if(widgetIds)
		{
			let widgetId = null;
			for(let i = 0; i < widgetIds.length; i++)
			{
				widgetId = widgetIds[i];
				if(CustomizableUI.isSpecialWidget(widgetId) && widgetId.indexOf('spring') > 0)
				{
					springId = widgetId;
					break;
				}
			}
		}

		return springId;
	},

	onWidgetAdded: function(aWidgetId, aArea, aPosition)
	{
		if(aArea === STATUS_BAR_ID && aWidgetId === DEFAULT_WIDGETS[0])
		{
			let springId = this.getSpringId(aArea);
			if(springId)
			{
				CustomizableUI.removeWidgetFromArea(springId, STATUS_BAR_ID, DEFAULT_POSITIONS[0]);
			}
		}
	},

	onWidgetRemoved: function(aWidgetId, aArea)
	{
		if(aArea === STATUS_BAR_ID && aWidgetId === DEFAULT_WIDGETS[0])
		{
			CustomizableUI.addWidgetToArea("spring", STATUS_BAR_ID, DEFAULT_POSITIONS[0]);
		}
	}
}

CustomizableUI.addListener(statusBarHandler);

