/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Status-4-Evar.
 *
 * The Initial Developer of the Original Code is 
 * Matthew Turnbull <sparky@bluefang-logic.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

"use strict";

const EXPORTED_SYMBOLS = ["Status4Evar"];

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

const s4e_service = CC["@caligonstudios.com/status4evar;1"].getService(CI.nsIStatus4Evar);

CU.import("resource://gre/modules/Services.jsm");
CU.import("resource://gre/modules/XPCOMUtils.jsm");
CU.import("resource://gre/modules/AddonManager.jsm");

CU.import("resource://status4evar/Status.jsm");
CU.import("resource://status4evar/Progress.jsm");
CU.import("resource://status4evar/Downloads.jsm");
CU.import("resource://status4evar/Toolbars.jsm");

function Status4Evar(window, gBrowser, gNavToolbox)
{
	this._window = window;
	this._gNavToolbox = gNavToolbox;

	S4EToolbars.setup(this._window, this._gNavToolbox, s4e_service);

	this.getters = new S4EWindowGetters(this._window);
	this.statusService = new S4EStatusService(this._window, s4e_service, this.getters);
	this.progressMeter = new S4EProgressService(gBrowser, s4e_service, this.getters, this.statusService);
	this.downloadStatus = new S4EDownloadService(this._window, s4e_service, this.getters);
	this.sizeModeService = new SizeModeService(this._window, this.statusService);

	this.__bound_beforeCustomization = this.beforeCustomization.bind(this)
	this.__bound_updateWindow = this.updateWindow.bind(this);
	this.__bound_destroy = this.destroy.bind(this)

	this._gNavToolbox.addEventListener("beforecustomization", this.__bound_beforeCustomization, false);
	this._gNavToolbox.addEventListener("aftercustomization", this.__bound_updateWindow, false);
	this._window.addEventListener("unload", this.__bound_destroy, false);
}

Status4Evar.prototype =
{
	_window:         null,
	_gNavToolbox:    null,

	__bound_beforeCustomization: null,
	__bound_updateWindow:        null,
	__bound_destroy:             null,

	getters:         null,
	statusService:   null,
	progressMeter:   null,
	downloadStatus:  null,
	sizeModeService: null,

	setup: function()
	{
		this.updateWindow();

		// OMFG HAX! If a page is already loading, fake a network start event
		if(this._window.XULBrowserWindow._busyUI)
		{
			let nsIWPL = CI.nsIWebProgressListener;
			this.progressMeter.onStateChange(0, null, nsIWPL.STATE_START | nsIWPL.STATE_IS_NETWORK, 0);
		}
	},

	destroy: function()
	{
		this._window.removeEventListener("unload", this.__bound_destroy, false);
		this._gNavToolbox.removeEventListener("aftercustomization", this.__bound_updateWindow, false);
		this._gNavToolbox.removeEventListener("beforecustomization", this.__bound_beforeCustomization, false);

		this.getters.destroy();
		this.statusService.destroy();
		this.downloadStatus.destroy();
		this.progressMeter.destroy();
		this.sizeModeService.destroy();

		["_window", "_gNavToolbox", "getters", "statusService", "downloadStatus", "progressMeter", "sizeModeService",
		"__bound_beforeCustomization", "__bound_destroy", "__bound_updateWindow" ].forEach(function(prop)
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

		let status = this.getters.statusWidget;
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
		let addon_bar = this.getters.addonbar;

		if(!action || !addon_bar || !s4e_service.addonbarWindowGripper
		|| this._window.windowState != CI.nsIDOMChromeWindow.STATE_NORMAL || addon_bar.toolbox.customizing)
		{
			if(gripper)
			{
				gripper.parentNode.removeChild(gripper);
			}
			return;
		}

		if(!gripper)
		{
			gripper = document.createElement("resizer");
			gripper.id = "status4evar-window-gripper";
			gripper.dir = "bottomend";
		}

		addon_bar.appendChild(gripper);
	},

	beforeCustomization: function()
	{
		this.updateSplitters(false);
		this.updateWindowGripper(false);

		this.statusService.setNoUpdate(true);
		let status_label = this.getters.statusWidgetLabel;
		if(status_label)
		{
			status_label.value = this.getters.strings.getString("statusText");
		}

		this.downloadStatus.customizing(true);
	},

	updateWindow: function()
	{
		this.statusService.setNoUpdate(false);
		this.getters.resetGetters();
		this.statusService.buildTextOrder();
		this.statusService.buildBinding();
		this.downloadStatus.init();
		this.downloadStatus.customizing(false);
		this.updateSplitters(true);

		s4e_service.updateWindow(this._window);
		// This also handles the following:
		// * buildTextOrder()
		// * updateStatusField(true)
		// * updateWindowGripper(true)
	},

	launchOptions: function(currentWindow)
	{
		AddonManager.getAddonByID("status4evar@caligonstudios.com", function(aAddon)
		{
			let optionsURL = aAddon.optionsURL;
			let windows = Services.wm.getEnumerator(null);
			while (windows.hasMoreElements())
			{
				let win = windows.getNext();
				if (win.document.documentURI == optionsURL)
				{
					win.focus();
					return;
				}
			}

			let features = "chrome,titlebar,toolbar,centerscreen";
			try
			{
				let instantApply = Services.prefs.getBoolPref("browser.preferences.instantApply");
				features += instantApply ? ",dialog=no" : ",modal";
			}
			catch(e)
			{
				features += ",modal";
			}
			currentWindow.openDialog(optionsURL, "", features);
		});
	}

};

function S4EWindowGetters(window)
{
	this._window = window;
}

S4EWindowGetters.prototype =
{
	_window:    null,
	_getterMap:
		[
			["addonbar",               "addon-bar"],
			["addonbarCloseButton",    "addonbar-closebutton"],
			["browserBottomBox",       "browser-bottombox"],
			["downloadButton",         "status4evar-download-button"],
			["downloadButtonTooltip",  "status4evar-download-tooltip"],
			["downloadButtonProgress", "status4evar-download-progress-bar"],
			["downloadButtonLabel",    "status4evar-download-label"],
			["downloadButtonAnchor",   "status4evar-download-anchor"],
			["statusWidget",           "status4evar-status-widget"],
			["statusWidgetLabel",      "status4evar-status-text"],
			["statusOverlay",          "statusbar-display"],
			["strings",                "bundle_status4evar"],
			["toolbarProgress",        "status4evar-progress-bar"],
			["urlbarProgress",         "urlbar-progress-alt"]
		],

	resetGetters: function()
	{
		let document = this._window.document;

		this._getterMap.forEach(function(getter)
		{
			let [prop, id] = getter;
			delete this[prop];
			this.__defineGetter__(prop, function()
			{
				delete this[prop];
				return this[prop] = document.getElementById(id);
			});
		}, this);

		delete this.urlbar;
		this.__defineGetter__("urlbar", function()
		{
			let ub = document.getElementById("urlbar");
			if(ub)
			{
				["setStatus", "setStatusType", "updateOverLinkLayout"].forEach(function(func)
				{
					if(!(func in ub))
					{	
						ub.__proto__[func] = function() {};
					}
				});
			}
			delete this.urlbar;
			return this.urlbar = ub;
		});
	},

	destroy: function()
	{
		this._getterMap.forEach(function(getter)
		{
			let [prop, id] = getter;
			delete this[prop];
		}, this);

		delete this.urlbar;
		delete this._window;
	}
};

function SizeModeService(window, statusService)
{
	this._window = window;
	this._statusService = statusService;

	this.lastFullScreen = this._window.fullScreen;
	this.lastwindowState = this._window.windowState;
	this._window.addEventListener("sizemodechange", this, false);
}

SizeModeService.prototype =
{
	_window:         null,
	_statusService:  null,

	lastFullScreen:  null,
	lastwindowState: null,

	destroy: function()
	{
		this._window.removeEventListener("sizemodechange", this, false);
	},

	handleEvent: function(e)
	{
		if(this._window.fullScreen != this.lastFullScreen)
		{
			this.lastFullScreen = this._window.fullScreen;
			this._statusService.clearStatusField();
			this._statusService.updateStatusField(true);
		}

		if(this._window.windowState != this.lastwindowState)
		{
			this.lastwindowState = this._window.windowState;
			this._updateWindowGripper(true);
		}
	},

	QueryInterface: XPCOMUtils.generateQI([ CI.nsIDOMEventListener ])
};

