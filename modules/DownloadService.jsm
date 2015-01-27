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
 * 
 * Download listener code based on Mozilla Foundation code:
 * https://hg.mozilla.org/mozilla-central/file/eec9a82ad740/browser/base/content/browser.js#l7297
*/

"use strict";

const EXPORTED_SYMBOLS = ["S4EDownloadService"];

const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://gre/modules/Downloads.jsm")

function S4EDownloadServiceImpl()
{
	this._listeners = new Set();
	this._activePublic = new JSTransferListener(this, Downloads.getList(Downloads.PUBLIC), false);
	this._activePrivate = new JSTransferListener(this, Downloads.getList(Downloads.PRIVATE), true);
}

S4EDownloadServiceImpl.prototype =
{
	_activePublic:        null,
	_activePrivate:       null,
	_listening:           false,
	_listeners:           null,

	start: function()
	{
		if(this._listening)
		{
			return;
		}

		this._activePublic.start();
		this._activePrivate.start();
		this._listening = true;
	},

	stop: function()
	{
		if(!this._listening)
		{
			return;
		}

		this._listening = false;
		this._activePublic.stop();
		this._activePrivate.stop();
	},

	destroy: function()
	{
		this.stop();
		this._listeners.clear();
		this._activePublic.destroy();
		this._activePrivate.destroy();

		["_activePublic", "_activePrivate", "_listeners"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	addListener: function(listener)
	{
		this._listeners.add(listener);
		this.start();
	},

	removeListener: function(listener)
	{
		this._listeners.delete(listener);
		if(!this._listeners.size)
		{
			this.stop();
		}
	},

	updateState: function(event)
	{
		for(let listener of this._listeners.values())
		{
			listener.updateState(event);
		}
	},
};

function JSTransferListener(downloadService, listPromise, isPrivate)
{
	this._downloadService = downloadService;
	this._isPrivate = isPrivate;
	this._downloads = new Map();

	listPromise.then(this.initList.bind(this)).then(null, CU.reportError);
}

JSTransferListener.prototype =
{
	_downloadService: null,
	_list:            null,
	_downloads:       null,
	_isPrivate:       false,
	_wantsStart:      false,
	_lastEvent:       null,

	initList: function(list)
	{
		this._list = list;
		if(this._wantsStart) {
			this.start();
		}
	},

	initDownloads: function(downloads)
	{
		downloads.forEach(function(download)
		{
			this.onDownloadAdded(download);
		}, this);

		this.updateState(false);
	},

	destroy: function()
	{
		this._downloads.clear();

		["_downloadService", "_list", "_downloads", "_lastEvent"].forEach(function(prop)
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
		this._list.getAll().then(this.initDownloads.bind(this)).then(null, CU.reportError);
	},

	stop: function()
	{
		if(!this._list)
		{
			this._wantsStart = false;
			return;
		}

		this._list.removeView(this);
		this._downloads.clear();
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
		let dl = this._downloads.get(aDownload);
		if(!dl)
		{
			dl = {};
			this._downloads.set(aDownload, dl);
		}

		dl.state = this.convertToState(aDownload);
		dl.size = aDownload.totalBytes;
		dl.speed = aDownload.speed;
		dl.transferred = aDownload.currentBytes;
	},

	onDownloadChanged: function(aDownload)
	{
		this.onDownloadAdded(aDownload);
		this.updateState(aDownload.succeeded);
	},

	updateState: function(lastFinished)
	{
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

		for(let dl of this._downloads.values())
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
			this.fireEvent({
				private:  this._isPrivate,
				notify:   lastFinished,
				active:   false
			});
			return;
		}

		let dlPaused      = (numActive == 0);
		let dlTotalSize   = ((dlPaused) ? pausedTotalSize   : activeTotalSize);
		let dlTransferred = ((dlPaused) ? pausedTransferred : activeTransferred);
		let dlMaxProgress = ((dlPaused) ? pausedMaxProgress : activeMaxProgress);
		let dlMinProgress = ((dlPaused) ? pausedMinProgress : activeMinProgress);

		this.fireEvent({
			private:     this._isPrivate,
			notify:      lastFinished,
			active:      true,
			paused:      dlPaused,
			count:       ((dlPaused) ? numPaused : numActive),
			time:        ((dlPaused) ? -1 : maxTime),
			totalSize:   dlTotalSize,
			totalTrx:    dlTransferred,
			progressAvg: ((dlTotalSize == 0) ? 100 : ((dlTransferred * 100) / dlTotalSize)),
			progressMax: ((dlTotalSize == 0) ? 100 : dlMaxProgress),
			progressMin: ((dlTotalSize == 0) ? 100 : dlMinProgress)
		});
	},

	onDownloadRemoved: function(aDownload)
	{
		this._downloads.delete(aDownload);
	},

	fireEvent: function(event)
	{
		this._lastEvent = event;
		this._downloadService.updateState(event);
	},

	get lastEvent()
	{
		return this._lastEvent;
	}
};

const S4EDownloadService = new S4EDownloadServiceImpl();

