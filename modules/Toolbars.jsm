/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Copyright (C) 2010-2014 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
*/

"use strict";

const EXPORTED_SYMBOLS = ["S4EToolbars"];

const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://gre/modules/Services.jsm");

function S4EToolbars(window, gBrowser, toolbox, service, getters)
{
	this._window = window;
	this._gBrowser = gBrowser;
	this._toolbox = toolbox;
	this._service = service;
	this._getters = getters;
}

S4EToolbars.prototype =
{
	_window:   null,
	_gBrowser: null,
	_toolbox:  null,
	_service:  null,
	_getters:  null,

	__bound_updateWindowResizers: null,
	__old_updateWindowResizers:   null,

	setup: function()
	{
		this.updateSplitters(false);
		this.updateWindowGripper(false);

		this.__old_updateWindowResizers = this._gBrowser.updateWindowResizers;
		this.__bound_updateWindowResizers = this.updateWindowResizers.bind(this);
		this._gBrowser.updateWindowResizers = this.__bound_updateWindowResizers;

		if(!this._service.firstRun && this._service.firstRunAustralis)
		{
			CU.import("resource://status4evar/Australis.jsm", {}).AustralisTools.migrate();
		}
	},

	destroy: function()
	{
		this._gBrowser.updateWindowResizers = this.__old_updateWindowResizers;

		["_window", "_gBrowser", "_toolbox",  "_service", "_getters", "__bound_updateWindowResizers",
		"__old_updateWindowResizers"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	updateSplitters: function(action)
	{
		let document = this._window.document;

		let splitter_before = document.getElementById("status4evar-status-splitter-before");
		if(splitter_before)
		{
			splitter_before.parentNode.removeChild(splitter_before);
		}

		let splitter_after = document.getElementById("status4evar-status-splitter-after");
		if(splitter_after)
		{
			splitter_after.parentNode.removeChild(splitter_after);
		}

		let status = this._getters.statusWidget;
		if(!action || !status)
		{
			return;
		}

		let urlbar = document.getElementById("urlbar-container");
		let stop = document.getElementById("stop-button");
		let fullscreenflex = document.getElementById("fullscreenflex");

		let nextSibling = status.nextSibling;
		let previousSibling = status.previousSibling;

		function getSplitter(splitter, suffix)
		{
			if(!splitter)
			{
				splitter = document.createElement("splitter");
				splitter.id = "status4evar-status-splitter-" + suffix;
				splitter.setAttribute("resizebefore", "flex");
				splitter.setAttribute("resizeafter", "flex");
				splitter.className = "chromeclass-toolbar-additional status4evar-status-splitter";
			}
			return splitter;
		}

		if((previousSibling && previousSibling.flex > 0)
		|| (urlbar && stop && urlbar.getAttribute("combined") && stop == previousSibling))
		{
			status.parentNode.insertBefore(getSplitter(splitter_before, "before"), status);
		}

		if(nextSibling && nextSibling.flex > 0 && nextSibling != fullscreenflex)
		{
			status.parentNode.insertBefore(getSplitter(splitter_after, "after"), nextSibling);
		}
	},

	updateWindowGripper: function(action)
	{
		let document = this._window.document;

		let gripper = document.getElementById("status4evar-window-gripper");
		let toolbar = this._getters.statusBar;

		if(!action || !toolbar || !this._service.addonbarWindowGripper
		|| this._window.windowState != CI.nsIDOMChromeWindow.STATE_NORMAL || toolbar.toolbox.customizing)
		{
			if(gripper)
			{
				gripper.parentNode.removeChild(gripper);
			}
			return;
		}

		gripper = this.buildGripper(toolbar, gripper, "status4evar-window-gripper");

		toolbar.appendChild(gripper);
	},

	updateWindowResizers: function()
	{
		if(!this._window.gShowPageResizers)
		{
			return;
		}

		let toolbar = this._getters.statusBar;
		let show = this._window.windowState == this._window.STATE_NORMAL && (!toolbar || toolbar.collapsed);
		this._gBrowser.browsers.forEach(function(browser)
		{
			browser.showWindowResizer = show;
		});
	},

	buildGripper: function(toolbar, container, id)
	{
		if(!container)
		{
			let document = this._window.document;

			let gripper = document.createElement("resizer");
			gripper.dir = "bottomend";

			container = document.createElement("hbox");
			container.id = id;
			container.pack = "end";
			container.ordinal = 1000;
			container.appendChild(gripper);
		}

		let needFlex = 1;
		for(let node of toolbar.childNodes)
		{
			if(node.hasAttribute("flex") || node.flex)
			{
				needFlex = 0;
				break;
			}
		}
		container.flex = needFlex;

		return container;
	}
};

