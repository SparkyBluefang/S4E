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

const EXPORTED_SYMBOLS = ["S4EDownloadService"];

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

const DownloadManager = CC["@mozilla.org/download-manager;1"].getService(CI.nsIDownloadManager);
const DownloadManagerUIClassic = Components.classesByID["{7dfdf0d1-aff6-4a34-bad1-d0fe74601642}"].getService(CI.nsIDownloadManagerUI);

CU.import("resource://gre/modules/Services.jsm");
CU.import("resource://gre/modules/PluralForm.jsm");
CU.import("resource://gre/modules/DownloadUtils.jsm");
CU.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
CU.import("resource://gre/modules/XPCOMUtils.jsm");

function S4EDownloadService(window, service, getters)
{
	this._window = window;
	this._service = service;
	this._getters = getters;
}

S4EDownloadService.prototype =
{
	_window:              null,
	_service:             null,
	_getters:             null,

	_hasPBAPI:            false,
	_listening:           false,
	_binding:             false,
	_customizing:         false,

	_lastTime:            Infinity,

	_dlActive:            false,
	_dlPaused:            false,
	_dlFinished:          false,

	_dlCountStr:          null,
	_dlTimeStr:           null,

	_dlProgressAvg:       0,
	_dlProgressMax:       0,
	_dlProgressMin:       0,
	_dlProgressType:      "active",

	_dlNotifyFinishTimer: 0,
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

		this._hasPBAPI = ('addPrivacyAwareListener' in DownloadManager);

		if(this._hasPBAPI)
		{
			DownloadManager.addPrivacyAwareListener(this);
		}
		else
		{
			DownloadManager.addListener(this);
			Services.obs.addObserver(this, "private-browsing", true);
		}

		this._listening = true;
		this._lastTime = Infinity;

		this.updateBinding();
		this.updateStatus();
	},

	uninit: function()
	{
		if(!this._listening)
		{
			return;
		}

		this._listening = false;

		DownloadManager.removeListener(this);
		if(!this._hasPBAPI)
		{
			Services.obs.removeObserver(this, "private-browsing");
		}

		this.releaseBinding();
	},

	destroy: function()
	{
		this.uninit();

		["_window", "_service", "_getters"].forEach(function(prop)
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

		switch(this._service.downloadButtonAction)
		{
			case 1: // Default
			case 2: // Show Panel
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

		DownloadsButton._getAnchorInternal = DownloadsButton.getAnchor;
		DownloadsButton.getAnchor = this.getAnchor.bind(this);

		DownloadsButton._releaseAnchorInternal = DownloadsButton.releaseAnchor;
		DownloadsButton.releaseAnchor = function() {};

		this._binding = true;
	},

	releaseBinding: function()
	{
		if(!this._binding)
		{
			return;
		}

		DownloadsButton.getAnchor = DownloadsButton._getAnchorInternal;
		DownloadsButton.releaseAnchor = DownloadsButton._releaseAnchorInternal;

		this._binding = false;
	},

	customizing: function(val)
	{
		this._customizing = val;
	},

	updateStatus: function(lastState)
	{
		if(!this._getters.downloadButton)
		{
			this.uninit();
			return;
		}

		let isPBW = (this._hasPBAPI && PrivateBrowsingUtils.isWindowPrivate(this._window))

		let numActive = ((isPBW) ? DownloadManager.activePrivateDownloadCount : DownloadManager.activeDownloadCount);
		if(numActive == 0)
		{
			this._dlActive = false;
			this._dlFinished = (lastState && lastState == CI.nsIDownloadManager.DOWNLOAD_FINISHED);
			this.updateButton();
			this._lastTime = Infinity;
			return;
		}

		let numPaused = 0;
		let activeTotalSize = 0;
		let activeTransferred = 0;
		let activeMaxProgress = -Infinity;
		let activeMinProgress = Infinity;
		let pausedTotalSize = 0;
		let pausedTransferred = 0;
		let pausedMaxProgress = -Infinity;
		let pausedMinProgress = Infinity;
		let maxTime = -Infinity;

		let dls = ((isPBW) ? DownloadManager.activePrivateDownloads : DownloadManager.activeDownloads);
		while(dls.hasMoreElements())
		{
			let dl = dls.getNext().QueryInterface(CI.nsIDownload);
			if(dl.state == CI.nsIDownloadManager.DOWNLOAD_DOWNLOADING)
			{
				if(dl.size > 0)
				{
					if(dl.speed > 0)
					{
						maxTime = Math.max(maxTime, (dl.size - dl.amountTransferred) / dl.speed);
					}

					activeTotalSize += dl.size;
					activeTransferred += dl.amountTransferred;

					let currentProgress = ((dl.amountTransferred * 100) / dl.size);
					activeMaxProgress = Math.max(activeMaxProgress, currentProgress);
					activeMinProgress = Math.min(activeMinProgress, currentProgress);
				}
			}
			else if(dl.state == CI.nsIDownloadManager.DOWNLOAD_PAUSED)
			{
				numPaused++;
				if(dl.size > 0)
				{
					pausedTotalSize += dl.size;
					pausedTransferred += dl.amountTransferred;

					let currentProgress = ((dl.amountTransferred * 100) / dl.size);
					pausedMaxProgress = Math.max(pausedMaxProgress, currentProgress);
					pausedMinProgress = Math.min(pausedMinProgress, currentProgress);
				}
			}
		}

		let dlPaused = (numActive == numPaused);
		let dlStatus =       ((dlPaused) ? this._getters.strings.getString("pausedDownloads")
		                                 : this._getters.strings.getString("activeDownloads"));
		let dlCount =        ((dlPaused) ? numPaused         : (numActive - numPaused));
		let dlTotalSize =    ((dlPaused) ? pausedTotalSize   : activeTotalSize);
		let dlTransferred =  ((dlPaused) ? pausedTransferred : activeTransferred);
		let dlMaxProgress =  ((dlPaused) ? pausedMaxProgress : activeMaxProgress);
		let dlMinProgress =  ((dlPaused) ? pausedMinProgress : activeMinProgress);
		let dlProgressType = ((dlPaused) ? "paused"          : "active");

		[this._dlTimeStr, this._lastTime] = DownloadUtils.getTimeLeft(maxTime, this._lastTime);
		this._dlCountStr =     PluralForm.get(dlCount, dlStatus).replace("#1", dlCount);
		this._dlProgressAvg =  ((dlTotalSize == 0) ? 100 : ((dlTransferred * 100) / dlTotalSize));
		this._dlProgressMax =  ((dlTotalSize == 0) ? 100 : dlMaxProgress);
		this._dlProgressMin =  ((dlTotalSize == 0) ? 100 : dlMinProgress);
		this._dlProgressType = dlProgressType + ((dlTotalSize == 0) ? "-unknown" : "");
		this._dlPaused =       dlPaused;
		this._dlActive =       true;
		this._dlFinished =     false;

		this.updateButton();
	},

	updateButton: function()
	{
		let download_button = this._getters.downloadButton;
		let download_tooltip = this._getters.downloadButtonTooltip;
		let download_progress = this._getters.downloadButtonProgress;
		let download_label = this._getters.downloadButtonLabel;
		if(!download_button)
		{
			return;
		}

		if(!this._dlActive)
		{
			download_button.collapsed = true;
			download_label.value = download_tooltip.label = this._getters.strings.getString("noDownloads");

			download_progress.collapsed = true;
			download_progress.value = 0;

			if(this._dlFinished && this._hasPBAPI && !this.isUIShowing)
			{
				this.callAttention(download_button);
			}
			return;
		}

		switch(this._service.downloadProgress)
		{
			case 2:
				download_progress.value = this._dlProgressMax;
				break;
			case 3:
				download_progress.value = this._dlProgressMin;
				break;
			default:
				download_progress.value = this._dlProgressAvg;
				break;
		}
		download_progress.setAttribute("pmType", this._dlProgressType);
		download_progress.collapsed = (this._service.downloadProgress == 0);

		download_label.value = this.buildString(this._service.downloadLabel);
		download_tooltip.label = this.buildString(this._service.downloadTooltip);

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

	clearFinished: function()
	{
		this._dlFinished = false;
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

		switch(this._service.downloadButtonAction)
		{
			case 1: // Default
				if(DownloadsCommon.useToolkitUI)
				{
					DownloadManagerUIClassic.show(this._window);
				}
				else
				{
					DownloadsPanel.showPanel();
				}
				break;
			case 2: // Show Panel
				DownloadsPanel.showPanel();
				break;
			case 3: // Show Library
				this._window.PlacesCommandHook.showPlacesOrganizer("Downloads");
				break;
			case 4: // Show Classic
				DownloadManagerUIClassic.show(this._window);
				break;
			default: // Nothing
				break;
		}

		aEvent.stopPropagation();
	},

	get isUIShowing()
	{
		switch(this._service.downloadButtonAction)
		{
			case 1: // Default
				if(DownloadsCommon.useToolkitUI)
				{
					return DownloadManagerUIClassic.visible;
				}
				else
				{
					return DownloadsPanel.isPanelShowing;
				}
			case 2: // Show Panel
				return DownloadsPanel.isPanelShowing;
			case 3: // Show Library
				var organizer = Services.wm.getMostRecentWindow("Places:Organizer");
				if(organizer)
				{
					let selectedNode = organizer.PlacesOrganizer._places.selectedNode;
					let downloadsItemId = organizer.PlacesUIUtils.leftPaneQueries["Downloads"];
					return selectedNode && selectedNode.itemId === downloadsItemId;
				}
				return false;
			case 4: // Show Classic
				return DownloadManagerUIClassic.visible;
			default: // Nothing
				return false;
		}
	},

	buildString: function(mode)
	{
		switch(mode)
		{
			case 0:
				return this._dlCountStr;
			case 1:
				return ((this._dlPaused) ? this._dlCountStr : this._dlTimeStr);
			default:
				let compStr = this._dlCountStr;
				if(!this._dlPaused)
				{
					compStr += " (" + this._dlTimeStr + ")";
				}
				return compStr;
		}
	},

	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress, aDownload)
	{
		this.updateStatus(aDownload.state);
	},

	onDownloadStateChange: function(aState, aDownload)
	{
		this.updateStatus(aDownload.state);

		if(aDownload.state == CI.nsIDownloadManager.DOWNLOAD_FINISHED && this._hasPBAPI && this._dlNotifyFinishTimer == 0 && this._service.downloadNotifyAnimate)
		{
			let download_button = this._getters.downloadButton;
			if(download_button)
			{
				download_button.setAttribute("notification", "finish");
				this._dlNotifyFinishTimer = this._window.setTimeout(function(self, button)
				{
					self._dlNotifyFinishTimer = 0;
					button.removeAttribute("notification");
				}, 1000, this, download_button);
			}
		}
	},

	onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus, aDownload) {},
	onSecurityChange: function(aWebProgress, aRequest, aState, aDownload) {},

	observe: function(subject, topic, data)
	{
		if(topic == "private-browsing" && (data == "enter" || data == "exit"))
		{
			this._window.setTimeout(function(self)
			{
				self.updateStatus();
			}, 0, this);
		}
	},

	QueryInterface: XPCOMUtils.generateQI([ CI.nsIDownloadProgressListener, CI.nsISupportsWeakReference, CI.nsIObserver ])
};

