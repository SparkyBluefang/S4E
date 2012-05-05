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
 * Portions created by the Initial Developer are Copyright (C) 2012
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

if(!caligon) var caligon = {};
if(!caligon.status4evar) caligon.status4evar = {};

window.addEventListener("load", function buildS4E()
{
	window.removeEventListener("load", buildS4E, false);

	let CC = Components.classes;
	let CI = Components.interfaces;
	let CU = Components.utils;

	let s4e_service = CC["@caligonstudios.com/status4evar;1"].getService(CI.nsIStatus4Evar);
	caligon.status4evar.service = s4e_service;

//
// Element getters
//
	let s4e_getters =
	{
		getterMap:
		[
			["addonbar",              "addon-bar"],
			["addonbarCloseButton",   "addonbar-closebutton"],
			["browserBottomBox",      "browser-bottombox"],
			["downloadButton",        "status4evar-download-button"],
			["downloadButtonTooltip", "status4evar-download-tooltip"],
			["statusWidget",          "status4evar-status-widget"],
			["statusWidgetLabel",     "status4evar-status-text"],
			["statusOverlay",         "statusbar-display"],
			["strings",               "bundle_status4evar"],
			["toolbarProgress",       "status4evar-progress-bar"],
			["urlbarProgress",        "urlbar-progress-alt"]
		],

		resetGetters: function()
		{
			this.getterMap.forEach(function(getter)
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
			this.getterMap.forEach(function(getter)
			{
				let [prop, id] = getter;
				delete this[prop];
			}, this);

			delete this.urlbar;
		}
	}
	caligon.status4evar.getters = s4e_getters;

//
// Status service
//
	let s4e_statusService =
	{
		_overLink:        { val: "", type: "" },
		_network:         { val: "", type: "" },
		_networkXHR:      { val: "", type: "" },
		_status:          { val: "", type: "" },
		_jsStatus:        { val: "", type: "" },
		_jsDefaultStatus: { val: "", type: "" },
		_defaultStatus:   { val: "", type: "" },

		_statusText:      { val: "", type: "" },
		_noUpdate:        false,
		_statusTimeoutID: 0,

		getCompositeStatusText: function()
		{
			return this._statusText.val;
		},

		getStatusText: function()
		{
			return this._status.val;
		},

		setNetworkStatus: function(status)
		{
			if(s4e_progressMeter._busyUI)
			{
				this._network = { val: status, type: "network" };
				this._networkXHR = { val: "", type: "network xhr" };
			}
			else
			{
				this._networkXHR = { val: status, type: "network xhr" };
			}
			this.updateStatusField();
		},

		setStatusText: function(status)
		{
			this._status = { val: status, type: "status chrome" };
			this.updateStatusField();
		},

		setJSStatus: function(status)
		{
			this._jsStatus = { val: status, type: "status content" };
			this.updateStatusField();
		},

		setJSDefaultStatus: function(status)
		{
			this._jsDefaultStatus = { val: status, type: "status content default" };
			this.updateStatusField();
		},

		setDefaultStatus: function(status)
		{
			this._defaultStatus = { val: status, type: "status chrome default" };
			this.updateStatusField();
		},

		setOverLink: function(link, aAnchor)
		{
			s4e_overLinkService.update(link, aAnchor);
		},

		setOverLinkInternal: function(link, aAnchor)
		{
			let status = s4e_service.status;
			let statusLinkOver = s4e_service.statusLinkOver;

			if(statusLinkOver)
			{
				link = link.replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e]/g, encodeURIComponent);

				if(status == statusLinkOver)
				{
					this._overLink = { val: link, type: "overLink", anchor: aAnchor };
					this.updateStatusField();
				}
				else
				{
					this.setStatusField(statusLinkOver, { val: link, type: "overLink", anchor: aAnchor }, true);
				}
			}
		},

		setNoUpdate: function(nu)
		{
			this._noUpdate = nu;
		},

		buildBinding: function() {
			let XULBWPropHandler = function(prop, oldval, newval) {
				CU.reportError("Attempt to modify XULBrowserWindow." + prop);
				return oldval;
			};

			["updateStatusField", "onStatusChange"].forEach(function(prop)
			{
				XULBrowserWindow.unwatch(prop);
				XULBrowserWindow[prop] = function() {};
				XULBrowserWindow.watch(prop, XULBWPropHandler);
			}, this);

			["getCompositeStatusText", "getStatusText", "setStatusText", "setJSStatus",
			"setJSDefaultStatus", "setDefaultStatus", "setOverLink"].forEach(function(prop)
			{
				XULBrowserWindow.unwatch(prop);
				XULBrowserWindow[prop] = this[prop].bind(this);
				XULBrowserWindow.watch(prop, XULBWPropHandler);
			}, this);

			let XULBWHandler = function(prop, oldval, newval) {
				if(!newval)
				{
					return newval;
				}
				CU.reportError("XULBrowserWindow changed. Updating S4E bindings.");
				window.setTimeout(function(self)
				{
					self.buildBinding();
				}, 0, this);
				return newval;
			};

			window.watch("XULBrowserWindow", XULBWHandler);
		},

		destroy: function()
		{
			// No need to unbind from the XULBrowserWindow, it's already null at this point

			s4e_overLinkService.destroy();
			this.clearTimer();

			["_overLink", "_network", "_networkXHR", "_status", "_jsStatus", "_jsDefaultStatus", "_defaultStatus",
			"_statusText"].forEach(function(prop)
			{
				delete this[prop];
			}, this);
		},

		buildTextOrder: function()
		{
			this.__defineGetter__("_textOrder", function()
			{
				let textOrder = ["_overLink"];
				if(s4e_service.statusNetwork)
				{
					textOrder.push("_network");
					if(s4e_service.statusNetworkXHR)
					{
						textOrder.push("_networkXHR");
					}
				}
				textOrder.push("_status", "_jsStatus");
				if(s4e_service.statusDefault)
				{
					textOrder.push("_jsDefaultStatus", "_defaultStatus");
				}

				delete this._textOrder;
				return this._textOrder = textOrder;
			});
		},

		updateStatusField: function(force)
		{
			let text = { val: "", type: "" };
			for(let i = 0; !text.val && i < this._textOrder.length; i++)
			{
				text = this[this._textOrder[i]];
			}

			if(this._statusText.val != text.val || force)
			{
				this.clearTimer();

				if(this._noUpdate)
				{
					return;
				}

				this._statusText = text;

				this.setStatusField(s4e_service.status, text, false);

				if(text.val && text.type != "overLink" && s4e_service.statusTimeout)
				{
					this._statusTimeoutID = window.setTimeout(function(self)
					{
						self._statusTimeoutID = 0;
						self.clearStatusField();
					}, s4e_service.statusTimeout, this);
				}
			}
		},

		clearTimer: function()
		{
			if(this._statusTimeoutID != 0)
			{
				window.clearTimeout(this._statusTimeoutID);
				this._statusTimeoutID = 0;
			}
		},

		clearStatusField: function()
		{
			s4e_getters.statusOverlay.value = "";

			let status_label = s4e_getters.statusWidgetLabel;
			if(status_label)
			{
				status_label.value = "";
			}

			let urlbar = s4e_getters.urlbar;
			if(urlbar)
			{
				urlbar.setStatus("");
			}
		},

		setStatusField: function(location, text, allowTooltip)
		{
			let label = null;

			switch(location)
			{
				case 0:
					break;
				case 1:
					label = s4e_getters.statusWidgetLabel;
					break;
				case 2:
					let urlbar = s4e_getters.urlbar;
					if(urlbar)
					{
						urlbar.setStatusType(text.type);
						urlbar.setStatus(text.val);
					}
					break;
				default:
					label = s4e_getters.statusOverlay;
					break;
			}

			if(label)
			{
				label.setAttribute("previoustype", label.getAttribute("type"));
				label.setAttribute("type", text.type);
				label.value = text.val;
				label.setAttribute("crop", text.type == "overLink" ? "center" : "end");
			}
		}
	}
	caligon.status4evar.statusService = s4e_statusService;

//
// Over Link delay service
//
	let s4e_overLinkService =
	{
		_timer: 0,
		_currentLink: { link: "", anchor: null },
		_pendingLink: { link: "", anchor: null },
		_listening: false,

		update: function(aLink, aAnchor)
		{
			this.clearTimer();
			this.stopListen();
			this._pendingLink = { link: aLink, anchor: aAnchor };

			if(!aLink)
			{
				if(XULBrowserWindow.hideOverLinkImmediately || !s4e_service.statusLinkOverDelayHide)
				{
					this._show();
				}
				else
				{
					this._showDelayed();
				}
			}
			else if(this._currentLink.link || !s4e_service.statusLinkOverDelayShow)
			{
				this._show();
			}
			else
			{
				this._showDelayed();
				this.startListen();
			}
		},

		destroy: function()
		{
			this.clearTimer();
			this.stopListen();

			["_currentLink", "_pendingLink"].forEach(function(prop)
			{
				delete this[prop];
			}, this);
		},

		startListen: function()
		{
			if(!this._listening)
			{
				window.addEventListener("mousemove", this, true);
				this._listening = true;
			}
		},

		stopListen: function()
		{
			if(this._listening)
			{
				window.removeEventListener("mousemove", this, true);
				this._listening = false;
			}
		},

		clearTimer: function()
		{
			if(this._timer != 0)
			{
				window.clearTimeout(this._timer);
				this._timer = 0;
			}
		},

		handleEvent: function(event)
		{
			switch(event.type)
			{
				case "mousemove":
					this.clearTimer();
					this._showDelayed();
			}
		},

		_showDelayed: function()
		{
			let delay = ((this._pendingLink.link)
				? s4e_service.statusLinkOverDelayShow
				: s4e_service.statusLinkOverDelayHide);

			this._timer = window.setTimeout(function(self)
			{
				self._timer = 0;
				self._show();
				self.stopListen();
			}, delay, this);
		},

		_show: function()
		{
			this._currentLink = this._pendingLink;
			s4e_statusService.setOverLinkInternal(this._currentLink.link, this._currentLink.anchor);
		}
	}
	caligon.status4evar.overLinkService = s4e_overLinkService;

//
// Progress meters and network status
//
	let s4e_progressMeter =
	{
		_busyUI: false,

		set value(val)
		{
			let toolbar_progress = s4e_getters.toolbarProgress;
			if(toolbar_progress)
			{
				toolbar_progress.value = val;
			}
			if(s4e_service.progressUrlbar)
			{
				let urlbar_progress = s4e_getters.urlbarProgress;
				if(urlbar_progress)
				{
					urlbar_progress.value = val;
				}
			}
		},

		set collapsed(val)
		{
			let toolbar_progress = s4e_getters.toolbarProgress;
			if(toolbar_progress)
			{
				toolbar_progress.collapsed = val;
			}
			if(s4e_service.progressUrlbar)
			{
				let urlbar_progress = s4e_getters.urlbarProgress;
				if(urlbar_progress)
				{
					urlbar_progress.collapsed = val;
				}
			}
		},

		setup: function()
		{
			gBrowser.addProgressListener(s4e_progressMeter);
		},

		destroy: function()
		{
			gBrowser.removeProgressListener(s4e_progressMeter);
		},

		onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage)
		{
			s4e_statusService.setNetworkStatus(aMessage);
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
									msg = s4e_getters.strings.getString("nv_stopped");
									break;
								case Components.results.NS_ERROR_NET_TIMEOUT:
									msg = s4e_getters.strings.getString("nv_timeout");
									break;
							}
						}
					}

					if(!msg && (!location || location.spec != "about:blank"))
					{
						msg = s4e_getters.strings.getString("nv_done");
					}

					s4e_statusService.setDefaultStatus(msg);
					s4e_statusService.setNetworkStatus("");
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
	}
	caligon.status4evar.progressMeter = s4e_progressMeter;

//
// Implement download status
//
	let s4e_downloadStatus =
	{
		_listening:      false,
		_lastTime:       Infinity,

		_dlActive:       false,
		_dlPaused:       false,

		_dlCountStr:     null,
		_dlTimeStr:      null,

		_dlProgressAvg:  0,
		_dlProgressMax:  0,
		_dlProgressMin:  0,
		_dlProgressType: "active",

		get PluralForm()
		{
			delete this.PluralForm;
			CU.import("resource://gre/modules/PluralForm.jsm", this);
			return this.PluralForm;
		},

		get DownloadUtils()
		{
			delete this.DownloadUtils;
			CU.import("resource://gre/modules/DownloadUtils.jsm", this);
			return this.DownloadUtils;
		},

		get DownloadManager()
		{
			delete this.DownloadManager;
			return this.DownloadManager = CC["@mozilla.org/download-manager;1"].getService(CI.nsIDownloadManager);
		},

		init: function()
		{
			if(!s4e_getters.downloadButton)
			{
				this.uninit();
				return;
			}

			if(this._listening)
			{
				return;
			}

			this.DownloadManager.addListener(this);
			Services.obs.addObserver(this, "private-browsing", true);

			this._listening = true;
			this._lastTime = Infinity;

			this.updateStatus();
		},

		uninit: function()
		{
			if(this._listening)
			{
				this._listening = false;
				this.DownloadManager.removeListener(this);
				Services.obs.removeObserver(this, "private-browsing");
			}
		},

		destroy: function()
		{
			this.uninit();
			delete this.PluralForm;
			delete this.DownloadUtils;
			delete this.DownloadManager;
		},

		updateStatus: function()
		{
			if(!s4e_getters.downloadButton)
			{
				this.uninit();
				return;
			}

			let numActive = this.DownloadManager.activeDownloadCount;
			if(numActive == 0)
			{
				this._dlActive = false;
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
			let dls = this.DownloadManager.activeDownloads;
			while(dls.hasMoreElements())
			{
				let dl = dls.getNext().QueryInterface(CI.nsIDownload);
				if(dl.state == this.DownloadManager.DOWNLOAD_DOWNLOADING)
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
				else if(dl.state == this.DownloadManager.DOWNLOAD_PAUSED)
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
			let dlStatus =       ((dlPaused) ? s4e_getters.strings.getString("pausedDownloads")
			                                 : s4e_getters.strings.getString("activeDownloads"));
			let dlCount =        ((dlPaused) ? numPaused         : (numActive - numPaused));
			let dlTotalSize =    ((dlPaused) ? pausedTotalSize   : activeTotalSize);
			let dlTransferred =  ((dlPaused) ? pausedTransferred : activeTransferred);
			let dlMaxProgress =  ((dlPaused) ? pausedMaxProgress : activeMaxProgress);
			let dlMinProgress =  ((dlPaused) ? pausedMinProgress : activeMinProgress);
			let dlProgressType = ((dlPaused) ? "paused"          : "active");

			[this._dlTimeStr, this._lastTime] = this.DownloadUtils.getTimeLeft(maxTime, this._lastTime);
			this._dlCountStr =     this.PluralForm.get(dlCount, dlStatus).replace("#1", dlCount);
			this._dlProgressAvg =  ((dlTotalSize == 0) ? 100 : ((dlTransferred * 100) / dlTotalSize));
			this._dlProgressMax =  ((dlTotalSize == 0) ? 100 : dlMaxProgress);
			this._dlProgressMin =  ((dlTotalSize == 0) ? 100 : dlMinProgress);
			this._dlProgressType = dlProgressType + ((dlTotalSize == 0) ? "-unknown" : "");
			this._dlPaused =       dlPaused;
			this._dlActive =       true;

			this.updateButton();
		},

		updateButton: function()
		{
			let download_button = s4e_getters.downloadButton;
			let download_tooltip = s4e_getters.downloadButtonTooltip;
			if(!download_button)
			{
				return;
			}

			if(!this._dlActive)
			{
				download_button.collapsed = true;
				download_button.label = download_tooltip.label = s4e_getters.strings.getString("noDownloads");

				download_button.pmCollapsed = true;
				download_button.pmType = "active";
				download_button.pmValue = 0;
				return;
			}

			download_button.pmType = this._dlProgressType;
			switch(s4e_service.downloadProgress)
			{
				case 2:
					download_button.pmValue = this._dlProgressMax;
					break;
				case 3:
					download_button.pmValue = this._dlProgressMin;
					break;
				default:
					download_button.pmValue = this._dlProgressAvg;
					break;
			}
			download_button.pmCollapsed = (s4e_service.downloadProgress == 0);

			download_button.label = this.buildString(s4e_service.downloadLabel);
			download_tooltip.label = this.buildString(s4e_service.downloadTooltip);

			download_button.collapsed = false;
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

		onProgressChange: function()
		{
			this.updateStatus();
		},

		onDownloadStateChange: function()
		{
			this.updateStatus();
		},

		onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus, aDownload) {},
		onSecurityChange: function(aWebProgress, aRequest, aState, aDownload) {},

		observe: function(subject, topic, data)
		{
			if(topic == "private-browsing" && (data == "enter" || data == "exit"))
			{
				window.setTimeout(function(self)
				{
					self.updateStatus();
				}, 0, this);
			}
		},

		QueryInterface: XPCOMUtils.generateQI([ CI.nsIDownloadProgressListener, CI.nsISupportsWeakReference, CI.nsIObserver ])
	}
	caligon.status4evar.downloadStatus = s4e_downloadStatus;

//
// Update status text flexible splitters
//
	let s4e_updateSplitters = function(action)
	{
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

		let status = s4e_getters.statusWidget;
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
	}
	caligon.status4evar.updateSplitters = s4e_updateSplitters;

//
// Update window re-size gripper
//
	let s4e_windowGripper =
	{
		lastwindowState: null,

		update: function(action)
		{
			let gripper = document.getElementById("status4evar-window-gripper");
			let addon_bar = s4e_getters.addonbar;
			this.lastwindowState = window.windowState;

			if(!action || !addon_bar || !s4e_service.addonbarWindowGripper
			|| window.windowState != window.STATE_NORMAL || addon_bar.toolbox.customizing)
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

		handleEvent: function(e)
		{
			if(window.windowState != this.lastwindowState)
			{
				s4e_windowGripper.update(true);
			}
		},

		setup: function()
		{
			window.addEventListener("resize", this, false);
		},

		destroy: function()
		{
			window.removeEventListener("resize", this, false);
		},

		QueryInterface: XPCOMUtils.generateQI([ CI.nsIDOMEventListener ])
	}
	caligon.status4evar.windowGripper = s4e_windowGripper;

//
// Prepare the window before customization
//
	let s4e_beforeCustomization = function()
	{
		s4e_updateSplitters(false);
		s4e_windowGripper.update(false);

		s4e_statusService.setNoUpdate(true);
		let status_label = s4e_getters.statusWidgetLabel;
		if(status_label)
		{
			status_label.value = s4e_getters.strings.getString("statusText");
		}
	}
	caligon.status4evar.beforeCustomization = s4e_beforeCustomization;

//
// Update the window after customization
//
	let s4e_updateWindow = function()
	{
		s4e_statusService.setNoUpdate(false);
		s4e_getters.resetGetters();
		s4e_statusService.buildTextOrder();
		s4e_statusService.buildBinding();
		s4e_downloadStatus.init();
		s4e_updateSplitters(true);

		s4e_service.updateWindow(window);
		// This also handles the following:
		// * buildTextOrder()
		// * updateStatusField(true)
		// * windowGripper.update(true)
	}
	caligon.status4evar.updateWindow = s4e_updateWindow;

//
// Setup and register S4E components on window creation
//
	let s4e_setupWindow = function()
	{
		s4e_updateWindow();

		s4e_progressMeter.setup();
		s4e_windowGripper.setup();
		gNavToolbox.addEventListener("beforecustomization", s4e_beforeCustomization, false);
		gNavToolbox.addEventListener("aftercustomization", s4e_updateWindow, false);
		window.addEventListener("unload", s4e_destroyWindow, false);

		// OMFG HAX! If a page is already loading, fake a network start event
		if(XULBrowserWindow._busyUI)
		{
			let nsIWPL = CI.nsIWebProgressListener;
			s4e_progressMeter.onStateChange(0, null, nsIWPL.STATE_START | nsIWPL.STATE_IS_NETWORK, 0);
		}
	}
	caligon.status4evar.setupWindow = s4e_setupWindow;

//
// Destroy and unregister S4E components on window destruction
//
	let s4e_destroyWindow = function()
	{
		window.removeEventListener("unload", s4e_destroyWindow, false);
		gNavToolbox.removeEventListener("aftercustomization", s4e_updateWindow, false);
		gNavToolbox.removeEventListener("beforecustomization", s4e_beforeCustomization, false);

		s4e_statusService.destroy();
		s4e_downloadStatus.destroy();
		s4e_progressMeter.destroy();
		s4e_windowGripper.destroy();
		s4e_getters.destroy();
	}
	caligon.status4evar.destroyWindow = s4e_destroyWindow;

//
// Setup
//
	let addon_bar = document.getElementById("addon-bar");
	if(addon_bar)
	{
		let baseSet = "addonbar-closebutton"
			    + ",status4evar-status-widget"
			    + ",status4evar-download-button"
			    + ",status4evar-progress-widget";

		// Update the defaultSet
		let defaultSet = baseSet;
		let defaultSetIgnore = ["addonbar-closebutton", "spring", "status-bar"];
		addon_bar.getAttribute("defaultset").split(",").forEach(function(item)
		{
			if(defaultSetIgnore.indexOf(item) == -1)
			{
				defaultSet += "," + item;
			}
		});
		defaultSet += ",status-bar"
		addon_bar.setAttribute("defaultset", defaultSet);

		// Update the currentSet
		if(s4e_service.firstRun)
		{
			function isCustomizableToolbar(aElt)
			{
				return aElt.localName == "toolbar" && aElt.getAttribute("customizable") == "true";
			}

			let isCustomizedAlready = false;
			let toolbars = Array.filter(gNavToolbox.childNodes, isCustomizableToolbar).concat(
			               Array.filter(gNavToolbox.externalToolbars, isCustomizableToolbar));
			toolbars.forEach(function(toolbar)
			{
				if(toolbar.currentSet.indexOf("status4evar") > -1)
				{
					isCustomizedAlready = true;
				}
			});

			if(!isCustomizedAlready)
			{
				let currentSet = baseSet;
				let currentSetIgnore = ["addonbar-closebutton", "spring"];
				addon_bar.currentSet.split(",").forEach(function(item)
				{
					if(currentSetIgnore.indexOf(item) == -1)
					{
						currentSet += "," + item;
					}
				});
				addon_bar.currentSet = currentSet;
				addon_bar.setAttribute("currentset", currentSet);
				document.persist(addon_bar.id, "currentset");
				setToolbarVisibility(addon_bar, true);
			}
		}
	}

	s4e_setupWindow();
}, false);

