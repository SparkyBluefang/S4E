/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Copyright (C) 2010-2015 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
*/

"use strict";

const EXPORTED_SYMBOLS = ["Status4Evar"];

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

const s4e_service = CC["@caligonstudios.com/status4evar;1"].getService(CI.nsIStatus4Evar);
const uuidService = CC["@mozilla.org/uuid-generator;1"].getService(CI.nsIUUIDGenerator);

CU.import("resource://gre/modules/Services.jsm");
CU.import("resource://gre/modules/XPCOMUtils.jsm");
CU.import("resource://gre/modules/AddonManager.jsm");

CU.import("resource://status4evar/Australis.jsm");
CU.import("resource://status4evar/Status.jsm");
CU.import("resource://status4evar/Progress.jsm");
CU.import("resource://status4evar/DownloadUI.jsm");
CU.import("resource://status4evar/Toolbars.jsm");

function Status4Evar(window, gBrowser, toolbox, menuPanelUI)
{
	this._id = uuidService.generateUUID();
	this._window = window;

	this.getters = new S4EWindowGetters(this._window);
	this.toolbars = new S4EToolbars(this._window, gBrowser, toolbox, s4e_service, this.getters);
	this.statusService = new S4EStatusService(this._window, s4e_service, this.getters);
	this.progressMeter = new S4EProgressService(gBrowser, s4e_service, this.getters, this.statusService);
	this.downloadStatus = new S4EDownloadUI(this._window, gBrowser, s4e_service, this.getters);
	this.sizeModeService = new SizeModeService(this._window, gBrowser, this);
	this.menuPanelListener = new MenuPanelListener(menuPanelUI, this);
}

Status4Evar.prototype =
{
	_id: null,
	_window:  null,

	getters:           null,
	toolbars:          null,
	statusService:     null,
	progressMeter:     null,
	downloadStatus:    null,
	sizeModeService:   null,
	menuPanelListener: null,

	setup: function()
	{
		this._window.addEventListener("unload", this, false);

		this.toolbars.setup();
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
		this._window.removeEventListener("unload", this, false);

		this.getters.destroy();
		this.statusService.destroy();
		this.downloadStatus.destroy();
		this.progressMeter.destroy();
		this.toolbars.destroy();
		this.sizeModeService.destroy();
		this.menuPanelListener.destroy();

		["_window", "getters", "statusService", "downloadStatus", "progressMeter",
		"toolbars", "sizeModeService", "menuPanelListener"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	handleEvent: function(aEvent)
	{
		switch(aEvent.type)
		{
			case "unload":
				this.destroy();
				break;
		}
	},

	beforeCustomization: function()
	{
		Services.console.logStringMessage("S4E Calling beforeCustomization: " + this._id);

		this.toolbars.updateSplitters(false);
		this.toolbars.updateWindowGripper(false);

		this.statusService.setNoUpdate(true);
		let status_label = this.getters.statusWidgetLabel;
		if(status_label)
		{
			status_label.value = this.getters.strings.getString("statusText");
		}

		this.menuPanelListener.uninit();
		this.downloadStatus.customizing(true);
	},

	updateWindow: function()
	{
		Services.console.logStringMessage("S4E Calling updateWindow: " + this._id);

		this.statusService.setNoUpdate(false);
		this.getters.resetGetters();
		this.statusService.buildTextOrder();
		this.statusService.buildBinding();
		this.downloadStatus.init();
		this.downloadStatus.customizing(false);
		this.menuPanelListener.init();
		this.toolbars.updateSplitters(true);

		s4e_service.updateWindow(this._window);
		// This also handles the following:
		// * buildTextOrder()
		// * updateStatusField(true)
		// * updateWindowGripper(true)
	},

	resetDownloadUI: function()
	{
		Services.console.logStringMessage("S4E Calling resetDownloadUI: " + this._id);

		this.getters.resetGetters();
		this.downloadStatus.updateButton();
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
			["browserBottomBox",       "browser-bottombox"],
			["downloadButton",         "status4evar-download-button"],
			["downloadButtonTooltip",  "status4evar-download-tooltip"],
			["downloadButtonProgress", "status4evar-download-progress-bar"],
			["downloadButtonLabel",    "status4evar-download-label"],
			["downloadButtonAnchor",   "status4evar-download-anchor"],
			["downloadNotifyAnchor",   "status4evar-download-notification-anchor"],
			["menuButton",             "PanelUI-menu-button"],
			["menuPanel",              "PanelUI-popup"],
			["statusBar",              "status4evar-status-bar"],
			["statusWidget",           "status4evar-status-widget"],
			["statusWidgetLabel",      "status4evar-status-text"],
			["strings",                "bundle_status4evar"],
			["throbberProgress",       "status4evar-throbber-widget"],
			["toolbarProgress",        "status4evar-progress-bar"],
			["urlbarProgress",         "urlbar-progress-alt"]
		],

	lazy: function(id)
	{
		if(this[id])
		{
			return this[id];
		}

		return this[id] = this._window.document.getElementById(id);
	},

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
			if(!ub)
			{
				return null;
			}

			["setStatus", "setStatusType", "updateOverLinkLayout"].forEach(function(func)
			{
				if(!(func in ub))
				{
					ub[func] = function() {};
				}
			});

			delete this.urlbar;
			return this.urlbar = ub;
		});

		delete this.statusOverlay;
		this.__defineGetter__("statusOverlay", function()
		{
			let so = this._window.XULBrowserWindow.statusTextField;
			if(!so)
			{
				return null;
			}

			delete this.statusOverlay;
			return this.statusOverlay = so;
		});
	},

	destroy: function()
	{
		this._getterMap.forEach(function(getter)
		{
			let [prop, id] = getter;
			delete this[prop];
		}, this);

		["urlbar", "statusOverlay", "_window"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	}
};

function SizeModeService(window, gBrowser, s4e)
{
	this._window = window;
	this._gBrowser = gBrowser;
	this._s4e = s4e;
	this._mm = this._window.messageManager;

	this.lastFullScreen = this._window.fullScreen;
	this.lastwindowState = this._window.windowState;

	this._mm.addMessageListener("status4evar@caligonstudios.com:video-detect-answer", this)
	this._mm.loadFrameScript("chrome://status4evar/content/content-thunk.js", true);

	this._window.addEventListener("sizemodechange", this, false);
}

SizeModeService.prototype =
{
	_window:         null,
	_gBrowser:       null,
	_s4e:            null,
	_mm:             null,

	lastFullScreen:  null,
	lastwindowState: null,

	destroy: function()
	{
		this._window.removeEventListener("sizemodechange", this, false);

		this._mm.removeDelayedFrameScript("chrome://status4evar/content/content-thunk.js");
		this._mm.removeMessageListener("status4evar@caligonstudios.com:video-detect-answer", this);

		["_window", "_gBrowser", "_s4e", "_mm"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	handleEvent: function(e)
	{
		if(this._window.fullScreen != this.lastFullScreen && s4e_service.advancedStatusDetectFullScreen)
		{
			this.lastFullScreen = this._window.fullScreen;

			if(this.lastFullScreen && s4e_service.advancedStatusDetectVideo)
			{
				Services.console.logStringMessage("S4E: full screen enter");
				this._gBrowser.selectedBrowser.messageManager.sendAsyncMessage("status4evar@caligonstudios.com:video-detect");
			}
			else
			{
				Services.console.logStringMessage("S4E: full screen exit");
				this._s4e.statusService.setFullScreenState(this.lastFullScreen, false);
			}
		}

		if(this._window.windowState != this.lastwindowState)
		{
			this.lastwindowState = this._window.windowState;
			this._s4e.toolbars.updateWindowGripper(true);
		}
	},

	receiveMessage: function(message)
	{
		if(message.name == "status4evar@caligonstudios.com:video-detect-answer")
		{
			Services.console.logStringMessage("S4E: video detect response (" + message.data.isVideo + ")");
			this._s4e.statusService.setFullScreenState(this.lastFullScreen, message.data.isVideo);
		}
	},

	QueryInterface: XPCOMUtils.generateQI([ CI.nsIDOMEventListener, CI.nsIMessageListener ])
};

function MenuPanelListener(menuPanelUI, s4e)
{
	this._menuPanelUI = menuPanelUI;
	this._s4e = s4e;
}

MenuPanelListener.prototype =
{
	_menuPanelUI: null,
	_s4e:         null,
	_listening:   false,

	init: function()
	{
		let area = AustralisTools.areaForWidget(AustralisTools.WIDGET_ID_DOWNLOAD);
		if(this._listening || area !== AustralisTools.TYPE_MENU_PANEL
		|| ((typeof this._menuPanelUI.isReady === "boolean") ? this._menuPanelUI.isReady : this._menuPanelUI.isReady()))
		{
			return;
		}

		this._s4e.getters.menuPanel.addEventListener("popupshowing", this);
		this._listening = true;
	},

	uninit: function()
	{
		if(!this._listening)
		{
			return;
		}

		this._s4e.getters.menuPanel.removeEventListener("popupshowing", this);
		this._listening = false;
	},

	destroy: function()
	{
		this.uninit();

		["_menuPanelUI", "_s4e"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	handleEvent: function(aEvent)
	{
		switch(aEvent.type)
		{
			case "popupshowing":
				this._s4e.resetDownloadUI();
				this.uninit();
				break;
		}
	}
};

