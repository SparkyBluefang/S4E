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

	let supportsJSTransfer = false;
	try
	{
		supportsJSTransfer = (Services.vc.compare("25.*", Services.appinfo.version) < 0);
	} catch(e) {}

	let tryJSTransfer = true;
	try
	{
		tryJSTransfer = Services.prefs.getBoolPref("browser.download.useJSTransfer");
	} catch(e) {}

	if(supportsJSTransfer && tryJSTransfer)
	{
		try
		{
			this._handler = new JSTransferHandler(this);
			Services.console.logStringMessage("S4EDownloadService using JSTransferHandler backend");
		}
		catch(e)
		{
			CU.reportError(e);
		}
	}

	if(this._handler == null)
	{
		this._handler = new DownloadManagerHandler(this);
		Services.console.logStringMessage("S4EDownloadService using DownloadManagerHandler backend");
	}
}

S4EDownloadService.prototype =
{
	_window:              null,
	_service:             null,
	_getters:             null,

	_handler:             null,
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

		this._handler.start();
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
		this._handler.stop();

		this.releaseBinding();
	},

	destroy: function()
	{
		this.uninit();
		this._handler.destroy();

		["_window", "_service", "_getters", "_handler"].forEach(function(prop)
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

		let db = this._window.DownloadsButton;

		db._getAnchorInternal = db.getAnchor;
		db.getAnchor = this.getAnchor.bind(this);

		db._releaseAnchorInternal = db.releaseAnchor;
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

		db.getAnchor = db._getAnchorInternal;
		db.releaseAnchor = db._releaseAnchorInternal;

		this._binding = false;
	},

	customizing: function(val)
	{
		this._customizing = val;
	},

	updateStatus: function(lastFinished)
	{
		if(!this._getters.downloadButton)
		{
			this.uninit();
			return;
		}

		let numActive = 0;
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

		let dls = ((this.isPrivateWindow) ? this._handler.activePrivateEntries() : this._handler.activeEntries());
		for(let dl in dls)
		{
			if(dl.state == CI.nsIDownloadManager.DOWNLOAD_DOWNLOADING)
			{
				numActive++;
				if(dl.size > 0)
				{
					if(dl.speed > 0)
					{
						maxTime = Math.max(maxTime, (dl.size - dl.transferred) / dl.speed);
					}

					activeTotalSize += dl.size;
					activeTransferred += dl.transferred;

					let currentProgress = ((dl.transferred * 100) / dl.size);
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
					pausedTransferred += dl.transferred;

					let currentProgress = ((dl.transferred * 100) / dl.size);
					pausedMaxProgress = Math.max(pausedMaxProgress, currentProgress);
					pausedMinProgress = Math.min(pausedMinProgress, currentProgress);
				}
			}
		}

		if((numActive + numPaused) == 0)
		{
			this._dlActive = false;
			this._dlFinished = lastFinished;
			this.updateButton();
			this._lastTime = Infinity;
			return;
		}

		let dlPaused =       (numActive == 0);
		let dlStatus =       ((dlPaused) ? this._getters.strings.getString("pausedDownloads")
		                                 : this._getters.strings.getString("activeDownloads"));
		let dlCount =        ((dlPaused) ? numPaused         : numActive);
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

			if(this._dlFinished && this._handler.hasPBAPI && !this.isUIShowing)
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

	notify: function()
	{
		if(this._dlNotifyTimer == 0 && this._service.downloadNotifyAnimate)
		{
			let download_button = this._getters.downloadButton;
			if(download_button)
			{
				download_button.setAttribute("notification", "finish");
				this._dlNotifyTimer = this._window.setTimeout(function(self, button)
				{
					self._dlNotifyTimer = 0;
					button.removeAttribute("notification");
				}, 1000, this, download_button);
			}
		}
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
				if(this._window.DownloadsCommon.useToolkitUI)
				{
					DownloadManagerUIClassic.show(this._window);
				}
				else
				{
					this._window.DownloadsPanel.showPanel();
				}
				break;
			case 2: // Show Panel
				this._window.DownloadsPanel.showPanel();
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

	get isPrivateWindow()
	{
		return this._handler.hasPBAPI && PrivateBrowsingUtils.isWindowPrivate(this._window);
	},

	get isUIShowing()
	{
		switch(this._service.downloadButtonAction)
		{
			case 1: // Default
				if(this._window.DownloadsCommon.useToolkitUI)
				{
					return DownloadManagerUIClassic.visible;
				}
				else
				{
					return this._window.DownloadsPanel.isPanelShowing;
				}
			case 2: // Show Panel
				return this._window.DownloadsPanel.isPanelShowing;
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
	}
};

function DownloadManagerHandler(downloadService)
{
	this._downloadService = downloadService;
	this._api = CC["@mozilla.org/download-manager;1"].getService(CI.nsIDownloadManager);
}

DownloadManagerHandler.prototype =
{
	_downloadService: null,
	_api:             null,

	destroy: function()
	{
		["_downloadService", "_api"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	start: function()
	{
		if(this.hasPBAPI)
		{
			this._api.addPrivacyAwareListener(this);
		}
		else
		{
			this._api.addListener(this);
			Services.obs.addObserver(this, "private-browsing", true);
		}
	},

	stop: function()
	{
		this._api.removeListener(this);
		if(!this.hasPBAPI)
		{
			Services.obs.removeObserver(this, "private-browsing");
		}
	},

	get hasPBAPI()
	{
		return ('addPrivacyAwareListener' in this._api);
	},

	activeEntries: function()
	{
		return this.generate(this._api.activeDownloads);
	},

	activePrivateEntries: function()
	{
		return this.generate(this._api.activePrivateDownloads);
	},

	generate: function(dls)
	{
		while(dls.hasMoreElements())
		{
			let dl = dls.getNext().QueryInterface(CI.nsIDownload);
			yield { state: dl.state, size: dl.size, speed: dl.speed, transferred: dl.amountTransferred };
		}
	},

	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress, aDownload)
	{
		if(this.hasPBAPI && (aDownload.isPrivate != this._downloadService.isPrivateWindow))
		{
			return;
		}

		this._downloadService.updateStatus(aDownload.state == CI.nsIDownloadManager.DOWNLOAD_FINISHED);
	},

	onDownloadStateChange: function(aState, aDownload)
	{
		if(this.hasPBAPI && (aDownload.isPrivate != this._downloadService.isPrivateWindow))
		{
			return;
		}

		this._downloadService.updateStatus(aDownload.state == CI.nsIDownloadManager.DOWNLOAD_FINISHED);

		if(aDownload.state == CI.nsIDownloadManager.DOWNLOAD_FINISHED && this.hasPBAPI)
		{
			this._downloadService.notify()
		}
	},

	onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus, aDownload) {},
	onSecurityChange: function(aWebProgress, aRequest, aState, aDownload) {},

	observe: function(subject, topic, data)
	{
		if(topic == "private-browsing" && (data == "enter" || data == "exit"))
		{
			self._downloadService._window.setTimeout(function(self)
			{
				self.updateStatus();
			}, 0, this._downloadService);
		}
	},

	QueryInterface: XPCOMUtils.generateQI([ CI.nsIDownloadProgressListener, CI.nsISupportsWeakReference, CI.nsIObserver ])
};

function JSTransferHandler(downloadService)
{
	let api = CU.import("resource://gre/modules/Downloads.jsm", {}).Downloads;

	this._activePublic = new JSTransferListener(downloadService, api.getList(api.PUBLIC), false);
	this._activePrivate = new JSTransferListener(downloadService, api.getList(api.PRIVATE), true);
}

JSTransferHandler.prototype =
{
	_activePublic:    null,
	_activePrivate:   null,

	destroy: function()
	{
		this._activePublic.destroy();
		this._activePrivate.destroy();
	},

	start: function()
	{
		this._activePublic.start();
		this._activePrivate.start();
	},

	stop: function()
	{
		this._activePublic.stop();
		this._activePrivate.stop();
	},

	get hasPBAPI()
	{
		return true;
	},

	activeEntries: function()
	{
		return this._activePublic.generator();
	},

	activePrivateEntries: function()
	{
		return this._activePrivate.generator();
	}
};

function JSTransferListener(downloadService, listPromise, isPrivate)
{
	this._downloadService = downloadService;
	this._isPrivate = isPrivate;
	this._downloads = {};

	listPromise.then(this.initList.bind(this)).then(null, CU.reportError);
}

JSTransferListener.prototype =
{
	_downloadService: null,
	_list:            null,
	_downloads:       {},
	_isPrivate:       false,
	_wantsStart:      false,

	initList: function(list)
	{
		this._list = list;
		if(this._wantsStart) {
			this.start();
		}

		this._list.getAll().then(this.initDownloads.bind(this)).then(null, CU.reportError);
	},

	initDownloads: function(downloads)
	{
		downloads.forEach(function(download)
		{
			this.onDownloadAdded(download);
		}, this);
	},

	destroy: function()
	{
		["_downloadService", "_list", "_downloads"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	start: function()
	{
		if(!this._list)
		{
			this._wantsStart = true;
			return;
		}

		this._list.addView(this);
	},

	stop: function()
	{
		if(!this._list)
		{
			this._wantsStart = false;
			return;
		}

		this._list.removeView(this);
	},

	generator: function()
	{
		for(let dl in this._downloads)
		{
			yield this._downloads[dl];
		}
	},

	convertToState: function(dl)
	{
		if(dl.succeeded)
		{
			return CI.nsIDownloadManager.DOWNLOAD_FINISHED;
		}
		if(dl.error && dl.error.becauseBlockedByParentalControls)
		{
			return CI.nsIDownloadManager.DOWNLOAD_BLOCKED_PARENTAL;
		}
		if(dl.error)
		{
			return CI.nsIDownloadManager.DOWNLOAD_FAILED;
		}
		if(dl.canceled && dl.hasPartialData)
		{
			return CI.nsIDownloadManager.DOWNLOAD_PAUSED;
		}
		if(dl.canceled)
		{
			return CI.nsIDownloadManager.DOWNLOAD_CANCELED;
		}
		if(dl.stopped)
		{
			return CI.nsIDownloadManager.DOWNLOAD_NOTSTARTED;
		}
		return CI.nsIDownloadManager.DOWNLOAD_DOWNLOADING;
	},

	onDownloadAdded: function(aDownload)
	{
		let dl = this._downloads[aDownload];
		if(!dl)
		{
			dl = {};
			this._downloads[aDownload] = dl;
		}

		dl.state = this.convertToState(aDownload);
		dl.size = aDownload.totalBytes;
		dl.speed = aDownload.speed;
		dl.transferred = aDownload.currentBytes;
	},

	onDownloadChanged: function(aDownload)
	{
		this.onDownloadAdded(aDownload);

		if(this._isPrivate != this._downloadService.isPrivateWindow)
		{
			return;
		}

		this._downloadService.updateStatus(aDownload.succeeded);

		if(aDownload.succeeded)
		{
			this._downloadService.notify()
		}
	},

	onDownloadRemoved: function(aDownload)
	{
		delete this._downloads[aDownload];
	}
}
