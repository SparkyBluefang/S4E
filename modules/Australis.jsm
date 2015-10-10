/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Copyright (C) 2013-2015 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
*/

"use strict";

const EXPORTED_SYMBOLS = ["AustralisTools"];

const CU = Components.utils;

const STATUS_BAR_ID = "status4evar-status-bar";
const LEGACY_SHIM_ID = "status4evar-legacy-widget";
const WIDGET_ID_STATUS = "status4evar-status-widget";
const WIDGET_ID_PROGRESS = "status4evar-progress-widget";
const WIDGET_ID_DOWNLOAD = "status4evar-download-button";

const DEFAULT_WIDGETS = [WIDGET_ID_STATUS, WIDGET_ID_PROGRESS, WIDGET_ID_DOWNLOAD];

CU.import("resource:///modules/CustomizableUI.jsm");
CU.import("resource://gre/modules/Services.jsm");
CU.import("resource://services-common/stringbundle.js");

const strings = new StringBundle("chrome://status4evar/locale/overlay.properties");

CustomizableUI.registerArea(STATUS_BAR_ID, {
	type: CustomizableUI.TYPE_TOOLBAR,
	defaultPlacements: DEFAULT_WIDGETS
});

var AustralisTools = {
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
			if(!placement || placement.area === CustomizableUI.AREA_NAVBAR || placement.area === STATUS_BAR_ID)
			{
				Services.console.logStringMessage("S4E Australis migration - moving widget: " + id + " [" + CustomizableUI.isWidgetRemovable(id) + "]");
				CustomizableUI.addWidgetToArea(id, STATUS_BAR_ID, index);
			}
			else if(id === DEFAULT_WIDGETS[0])
			{
				Services.console.logStringMessage("S4E Australis migration - adding spring");
				CustomizableUI.addWidgetToArea("spring", STATUS_BAR_ID, index);
			}
		});

		CustomizableUI.setToolbarVisibility(STATUS_BAR_ID, true);
	},

	updateLegacyShim: function(action)
	{
		if(action)
		{
			this.initLegacyShim();

			let placement = CustomizableUI.getPlacementOfWidget(LEGACY_SHIM_ID);
			if(!placement) {
				CustomizableUI.addWidgetToArea(LEGACY_SHIM_ID, STATUS_BAR_ID);
				CustomizableUI.setToolbarVisibility(STATUS_BAR_ID, true);
			}
		}
		else
		{
			this.destroyLegacyShim();
		}
	},

	initLegacyShim: function()
	{
		CustomizableUI.createWidget({
			id: LEGACY_SHIM_ID,
			type: "custom",
			defaultArea: STATUS_BAR_ID,
			onBuild: function(doc)
			{
				let item = doc.createElement("toolbaritem");
				item.id = LEGACY_SHIM_ID;
				item.setAttribute("removable", true);
				item.setAttribute("label", strings.get("legacyWidgetTitle"));
				item.setAttribute("class", "panel-wide-item");
				item.setAttribute("closemenu", "none");
				item.appendChild(doc.getElementById("status-bar") || palette.querySelector("status-bar"));

				item.watcher = new doc.defaultView.MutationObserver(function(mutations)
				{
					if(!item.hasChildNodes())
					{
						Services.console.logStringMessage("S4E Repairing widget: " + LEGACY_SHIM_ID);
						item.appendChild(doc.getElementById("status-bar"));
					}
				});
				item.watcher.observe(item, { childList: true });

				return item;
			}
		});
	},

	destroyLegacyShim: function()
	{
		let widgetInfo = CustomizableUI.getWidget(LEGACY_SHIM_ID);
		if(widgetInfo)
		{
			widgetInfo.disabled = true;

			widgetInfo.instances.forEach(function(instance)
			{
				let item = instance.node;

				item.watcher.disconnect();

				if(item.firstChild && item.firstChild.id === "status-bar")
				{
					item.ownerDocument.getElementById("addon-bar").appendChild(item.firstChild);
				}
			});
		}

		CustomizableUI.destroyWidget(LEGACY_SHIM_ID);
	},

	get TYPE_MENU_PANEL() CustomizableUI.TYPE_MENU_PANEL,
	get TYPE_TOOLBAR() CustomizableUI.TYPE_TOOLBAR,
	get WIDGET_ID_STATUS() WIDGET_ID_STATUS,
	get WIDGET_ID_PROGRESS() WIDGET_ID_PROGRESS,
	get WIDGET_ID_DOWNLOAD() WIDGET_ID_DOWNLOAD,

	areaForWidget: function(widgetId)
	{
		let placement = CustomizableUI.getPlacementOfWidget(widgetId);
		if(placement)
		{
			return CustomizableUI.getAreaType(placement.area);
		}

		return null;
	}
}

var statusBarHandler = {

	customizing: false,

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

	updateWindows: function()
	{
		for(let window of CustomizableUI.windows)
		{
			if(window.caligon && window.caligon.status4evar) {
				window.caligon.status4evar.updateWindow();
			}
		}
	},

	onWidgetAdded: function(aWidgetId, aArea, aPosition)
	{
		if(aArea === STATUS_BAR_ID && aWidgetId === DEFAULT_WIDGETS[0])
		{
			let springId = this.getSpringId(aArea);
			if(springId)
			{
				CustomizableUI.removeWidgetFromArea(springId, STATUS_BAR_ID, 0);
			}
		}

		if(!this.customizing && DEFAULT_WIDGETS.indexOf(aWidgetId))
		{
			this.updateWindows();
		}
	},

	onWidgetRemoved: function(aWidgetId, aArea)
	{
		if(aArea === STATUS_BAR_ID && aWidgetId === DEFAULT_WIDGETS[0])
		{
			CustomizableUI.addWidgetToArea("spring", STATUS_BAR_ID, 0);
		}

		if(!this.customizing && DEFAULT_WIDGETS.indexOf(aWidgetId))
		{
			this.updateWindows();
		}
	},

	onCustomizeStart: function(aWindow)
	{
		this.customizing = true;
		if(aWindow.caligon && aWindow.caligon.status4evar) {
			aWindow.caligon.status4evar.beforeCustomization();
		}
	},

	onCustomizeEnd: function(aWindow)
	{
		this.customizing = false;
		this.updateWindows();
	}
}

CustomizableUI.addListener(statusBarHandler);

