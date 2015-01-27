/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Original code copyright (C) Mozilla Foundation. All Rights Reserved.
 * Original code copyright (C) 2013 Gijs Kruitbosch <gijskruitbosch@gmail.com>. All Rights Reserved.
 * Copyright (C) 2010-2015 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
 * 
 * Download listener code based on Mozilla Foundation code:
 * https://hg.mozilla.org/mozilla-central/file/eec9a82ad740/browser/base/content/browser.js#l7297
 * 
 * Original download notification code by Gijs Kruitbosch.
 * Adapted from the check-in patch:
 * https://hg.mozilla.org/mozilla-central/rev/8a1d8044a4c8
*/

"use strict";

const EXPORTED_SYMBOLS = ["S4EDownloadUI"];

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://status4evar/DownloadService.jsm");

CU.import("resource://gre/modules/Services.jsm");
CU.import("resource://gre/modules/PluralForm.jsm");
CU.import("resource://gre/modules/DownloadUtils.jsm");
CU.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
CU.import("resource://gre/modules/XPCOMUtils.jsm");

function S4EDownloadUI(window, gBrowser, service, getters)
{
	this._window = window;
	this._gBrowser = gBrowser;
	this._service = service;
	this._getters = getters;

	this._statePublic = this._statePrivate =
	{
		active: false,
		notify: false
	};
}

S4EDownloadUI.prototype =
{
	_window:              null,
	_gBrowser:            null,
	_service:             null,
	_getters:             null,

	_listening:           false,

	_binding:             false,
	_customizing:         false,

	_statePublic:         null,
	_statePrivate:        null,

	_dlNotifyTimer:       0,
	_dlNotifyGlowTimer:   0,

	init: function()
	{
		if(!this._getters.downloadButton)
		{
			this.uninit();
			return;
		}

		if(this._listening)
		{
			return;
		}

		this._lastTime = Infinity;

		this.updateBinding();
		this.updateButton();
		S4EDownloadService.addListener(this);
	},

	uninit: function()
	{
		if(!this._listening)
		{
			return;
		}

		S4EDownloadService.removeListener(this);
		this.releaseBinding();
	},

	destroy: function()
	{
		this.uninit();

		["_window", "_gBrowser", "_service", "_getters", "_statePublic", "_statePrivate"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	updateBinding: function()
	{
		if(!this._listening)
		{
			this.releaseBinding();
			return;
		}

		switch(this.downloadButtonAction)
		{
			case 1: // Default
				this.attachBinding();
				break;
			default:
				this.releaseBinding();
				break;
		}
	},

	attachBinding: function()
	{
		if(this._binding)
		{
			return;
		}

		let db = this._window.DownloadsButton;

		db._getAnchorS4EBackup = db.getAnchor;
		db.getAnchor = this.getAnchor.bind(this);

		db._releaseAnchorS4EBackup = db.releaseAnchor;
		db.releaseAnchor = function() {};

		this._binding = true;
	},

	releaseBinding: function()
	{
		if(!this._binding)
		{
			return;
		}

		let db = this._window.DownloadsButton;

		db.getAnchor = db._getAnchorS4EBackup;
		db.releaseAnchor = db._releaseAnchorS4EBackup;

		this._binding = false;
	},

	customizing: function(val)
	{
		this._customizing = val;
	},

	updateState: function(event)
	{
		let state = {}
		Object.assign(state, event);
		state.time = state.time || -1;

		if(state.active)
		{
			state.lastTime     = (state.private ? this._statePrivate : this._statePublic).time || Infinity;
			state.progressType = (state.paused ? "paused" : "active") + (state.totalSize == 0 ? "-unknown" : "");

			let dlStatus = this._getters.strings.getString(state.paused ? "pausedDownloads" : "activeDownloads");
			state.countStr = PluralForm.get(state.count, dlStatus).replace("#1", state.count);
			[state.timeStr, state.time] = DownloadUtils.getTimeLeft(state.time, state.lastTime);
		}

		if(state.private)
		{
			this._statePrivate = state;
		}
		else
		{
			this._statePublic = state;
		}

		if(state.private == this.isPrivateWindow)
		{
			this.updateButton(state);
			if(state.notify)
			{
				this.notify();
			}
			state.notify = false;
		}
	},

	get state()
	{
		return this.isPrivateWindow ? this._statePrivate : this._statePublic;
	},

	updateButton: function(state)
	{
		let download_button = this._getters.downloadButton;
		if(!download_button)
		{
			return;
		}

		state = state || this.state;

		let download_tooltip = this._getters.downloadButtonTooltip;
		let download_progress = this._getters.downloadButtonProgress;
		let download_label = this._getters.downloadButtonLabel;

		if(state.notify && !this.isUIShowing)
		{
			this.callAttention(download_button);
		}

		if(!state.active)
		{
			if(download_button.getAttribute("cui-areatype") == "toolbar")
			{
				download_button.collapsed = true;
			}
			download_label.textContent = download_tooltip.label = this._getters.strings.getString("noDownloads");

			download_progress.collapsed = true;
			download_progress.value = 0;

			return;
		}

		switch(this._service.downloadProgress)
		{
			case 2:
				download_progress.value = state.progressMax;
				break;
			case 3:
				download_progress.value = state.progressMin;
				break;
			default:
				download_progress.value = state.progressAvg;
				break;
		}
		download_progress.setAttribute("pmType", state.progressType);
		download_progress.collapsed = (this._service.downloadProgress == 0);

		download_label.textContent = this.buildString(this._service.downloadLabel, state.paused, state.countStr, state.timeStr);
		download_tooltip.label = this.buildString(this._service.downloadTooltip, state.paused, state.countStr, state.timeStr);

		this.clearAttention(download_button);
		download_button.collapsed = false;
	},

	callAttention: function(download_button)
	{
		if(this._dlNotifyGlowTimer != 0)
		{
			this._window.clearTimeout(this._dlNotifyGlowTimer);
			this._dlNotifyGlowTimer = 0;
		}

		download_button.setAttribute("attention", "true");

		if(this._service.downloadNotifyTimeout)
		{
			this._dlNotifyGlowTimer = this._window.setTimeout(function(self, button)
			{
				self._dlNotifyGlowTimer = 0;
				button.removeAttribute("attention");
			}, this._service.downloadNotifyTimeout, this, download_button);
		}
	},

	clearAttention: function(download_button)
	{
		if(this._dlNotifyGlowTimer != 0)
		{
			this._window.clearTimeout(this._dlNotifyGlowTimer);
			this._dlNotifyGlowTimer = 0;
		}

		download_button.removeAttribute("attention");
	},

	notify: function()
	{
		let download_button = this._getters.downloadButton;
		if(!download_button
		|| (download_button.getAttribute("cui-areatype") == "toolbar" && !download_button.hasAttribute("forcevisible")))
		{
			return;
		}

		if(this._dlNotifyTimer == 0 && this._service.downloadNotifyAnimate)
		{
			let download_notify_anchor = this._getters.downloadNotifyAnchor;
			let button_anchor = ((download_button.getAttribute("cui-areatype") == "toolbar")
							? ((download_button.hasAttribute("cui-anchorid"))
								? this._getters.lazy(download_button.getAttribute("cui-anchorid"))
								: this._getters.downloadButtonAnchor)
							: this._getters.menuButton);
			if(button_anchor)
			{
				if(!download_notify_anchor.style.transform)
				{
					let bAnchorRect = button_anchor.getBoundingClientRect();
					let nAnchorRect = download_notify_anchor.getBoundingClientRect();

					let translateX = bAnchorRect.left - nAnchorRect.left;
					translateX += .5 * (bAnchorRect.width  - nAnchorRect.width);

					let translateY = bAnchorRect.top  - nAnchorRect.top;
					translateY += .5 * (bAnchorRect.height - nAnchorRect.height);

					download_notify_anchor.style.transform = "translate(" +  translateX + "px, " + translateY + "px)";
				}

				download_notify_anchor.setAttribute("notification", "finish");
				this._dlNotifyTimer = this._window.setTimeout(function(self, anchor)
				{
					self._dlNotifyTimer = 0;
					anchor.removeAttribute("notification");
					anchor.style.transform = "";
				}, 1000, this, download_notify_anchor);
			}
		}
	},

	clearFinished: function()
	{
		let download_button = this._getters.downloadButton;
		if(download_button)
		{
			this.clearAttention(download_button);
		}
	},

	getAnchor: function(aCallback)
	{
		if(this._customizing)
		{
			aCallback(null);
			return;
		}

		aCallback(this._getters.downloadButtonAnchor);
	},

	openUI: function(aEvent)
	{
		this.clearFinished();

		switch(this.downloadButtonAction)
		{
			case 1: // Firefox Default
				this._window.DownloadsPanel.showPanel();
				break;
			case 2: // Show Library
				this._window.PlacesCommandHook.showPlacesOrganizer("Downloads");
				break;
			case 3: // Show Tab
				let found = this._gBrowser.browsers.some(function(browser, index)
				{
					if("about:downloads" == browser.currentURI.spec)
					{
						this._gBrowser.selectedTab = this._gBrowser.tabContainer.childNodes[index];
						return true;
					}
				}, this);

				if(!found)
				{
					this._window.openUILinkIn("about:downloads", "tab");
				}
				break;
			case 4: // External Command
				let command = this._service.downloadButtonActionCommand;
				if(commend)
				{
					this._window.goDoCommand(command);
				}
				break;
			default: // Nothing
				break;
		}

		aEvent.stopPropagation();
	},

	get isPrivateWindow()
	{
		return PrivateBrowsingUtils.isWindowPrivate(this._window);
	},

	get isUIShowing()
	{
		switch(this.downloadButtonAction)
		{
			case 1: // Firefox Default
				return this._window.DownloadsPanel.isPanelShowing;
			case 2: // Show Library
				var organizer = Services.wm.getMostRecentWindow("Places:Organizer");
				if(organizer)
				{
					let selectedNode = organizer.PlacesOrganizer._places.selectedNode;
					let downloadsItemId = organizer.PlacesUIUtils.leftPaneQueries["Downloads"];
					return selectedNode && selectedNode.itemId === downloadsItemId;
				}
				return false;
			case 3: // Show tab
				let currentURI = this._gBrowser.currentURI;
				return currentURI && currentURI.spec == "about:downloads";
			default: // Nothing
				return false;
		}
	},

	get downloadButtonAction()
	{
		let action = this._service.downloadButtonAction;
		// Firefox Default
		if(action == 1)
		{
			let download_button = this._getters.downloadButton;
			if(!download_button || download_button.getAttribute("cui-areatype") != "toolbar")
			{
				// Show tab
				action = 3;
			}
		}

		return action;
	},

	buildString: function(mode, paused, countStr, timeStr)
	{
		switch(mode)
		{
			case 0:
				return countStr;
			case 1:
				return paused ? countStr : timeStr;
			default:
				let compStr = countStr;
				if(!paused)
				{
					compStr += " (" + timeStr + ")";
				}
				return compStr;
		}
	}
};

