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

const EXPORTED_SYMBOLS = ["S4EProgressService"];

const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://gre/modules/XPCOMUtils.jsm");

function S4EProgressService(gBrowser, service, getters, statusService) {
	this._gBrowser = gBrowser;
	this._service = service;
	this._getters = getters;
	this._statusService = statusService;

	this._gBrowser.addProgressListener(this);
}

S4EProgressService.prototype =
{
	_gBrowser:      null,
	_service:       null,
	_getters:       null,
	_statusService: null,

	_busyUI:        false,

	set value(val)
	{
		let toolbar_progress = this._getters.toolbarProgress;
		if(toolbar_progress)
		{
			toolbar_progress.value = val;
		}

		if(this._service.progressUrlbar)
		{
			let urlbar_progress = this._getters.urlbarProgress;
			if(urlbar_progress)
			{
				urlbar_progress.value = val;
			}
		}
	},

	set collapsed(val)
	{
		let toolbar_progress = this._getters.toolbarProgress;
		if(toolbar_progress)
		{
			toolbar_progress.collapsed = val;
		}

		if(this._service.progressUrlbar)
		{
			let urlbar_progress = this._getters.urlbarProgress;
			if(urlbar_progress)
			{
				urlbar_progress.collapsed = val;
			}
		}
	},

	destroy: function()
	{
		this._gBrowser.removeProgressListener(this);

		["_gBrowser", "_service", "_getters", "_statusService"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage)
	{
		this._statusService.setNetworkStatus(aMessage, this._busyUI);
	},

	onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		let nsIWPL = CI.nsIWebProgressListener;

		if(!this._busyUI
		&& aStateFlags & nsIWPL.STATE_START
		&& aStateFlags & nsIWPL.STATE_IS_NETWORK
		&& !(aStateFlags & nsIWPL.STATE_RESTORING))
		{
			this._busyUI = true;
			this.value = 0;
			this.collapsed = false;
		}
		else if(aStateFlags & nsIWPL.STATE_STOP)
		{
			if(aRequest)
			{
				let msg = "";
				let location;
				if(aRequest instanceof CI.nsIChannel || "URI" in aRequest)
				{
					location = aRequest.URI;
					if(location.spec != "about:blank")
					{
						switch (aStatus)
						{
							case Components.results.NS_BINDING_ABORTED:
								msg = this._getters.strings.getString("nv_stopped");
								break;
							case Components.results.NS_ERROR_NET_TIMEOUT:
								msg = this._getters.strings.getString("nv_timeout");
								break;
						}
					}
				}

				if(!msg && (!location || location.spec != "about:blank"))
				{
					msg = this._getters.strings.getString("nv_done");
				}

				this._statusService.setDefaultStatus(msg);
				this._statusService.setNetworkStatus("", this._busyUI);
			}

			if(this._busyUI)
			{
				this._busyUI = false;
				this.collapsed = true;
				this.value = 0;
			}
		}
	},

	onUpdateCurrentBrowser: function(aStateFlags, aStatus, aMessage, aTotalProgress)
	{
		let nsIWPL = CI.nsIWebProgressListener;
		let loadingDone = aStateFlags & nsIWPL.STATE_STOP;

		this.onStateChange(
			gBrowser.webProgress,
			{ URI: gBrowser.currentURI },
			((loadingDone ? nsIWPL.STATE_STOP : nsIWPL.STATE_START) | (aStateFlags & nsIWPL.STATE_IS_NETWORK)),
			aStatus
		);

		if(!loadingDone)
		{
			this.onProgressChange(gBrowser.webProgress, null, 0, 0, aTotalProgress, 1);
			this.onStatusChange(gBrowser.webProgress, null, 0, aMessage);
		}
	},

	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if (aMaxTotalProgress > 0 && this._busyUI)
		{
			// This is highly optimized.  Don't touch this code unless
			// you are intimately familiar with the cost of setting
			// attrs on XUL elements. -- hyatt
			let percentage = (aCurTotalProgress * 100) / aMaxTotalProgress;
			this.value = percentage;
		}
	},

	onProgressChange64: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		return this.onProgressChange(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress);
	},

	QueryInterface: XPCOMUtils.generateQI([ CI.nsIWebProgressListener, CI.nsIWebProgressListener2 ])
};

