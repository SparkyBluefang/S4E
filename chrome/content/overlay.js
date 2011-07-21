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
 * Portions created by the Initial Developer are Copyright (C) 2011
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

window.addEventListener("load", function()
{
	let CC = Components.classes;
	let CI = Components.interfaces;
	let CU = Components.utils;

	caligon.status4evar.service = CC["@caligonstudios.com/status4evar;1"].getService(CI.nsIStatus4Evar);
	let s4e_service = caligon.status4evar.service;

	caligon.status4evar.strings = document.getElementById("bundle_status4evar");
	let s4e_strings = caligon.status4evar.strings;

//
// Element getters
//
	caligon.status4evar.getters =
	{
		resetGetters: function()
		{
			[
				["addonbar",			"addon-bar"],
				["addonbarCloseButton",		"addonbar-closebutton"],
				["browserBottomBox",		"browser-bottombox"],
				["downloadButton",		"status4evar-download-button"],
				["downloadButtonTooltip",	"status4evar-download-tooltip"],
				["statusWidget",		"status4evar-status-widget"],
				["statusWidgetLabel",		"status4evar-status-text"],
				["statusOverlay",		"statusbar-display"],
				["toolbarProgress",		"status4evar-progress-bar"],
				["urlbarProgress",		"urlbar-progress-alt"]
			].forEach(function(getter)
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
		}
	}
	let s4e_getters = caligon.status4evar.getters;

//
// Status service
//
	caligon.status4evar.statusService =
	{
		_overLink:		{ val: "", type: "" },
		_network:		{ val: "", type: "" },
		_networkXHR:		{ val: "", type: "" },
		_status:		{ val: "", type: "" },
		_jsStatus:		{ val: "", type: "" },
		_jsDefaultStatus:	{ val: "", type: "" },
		_defaultStatus:		{ val: "", type: "" },

		_statusText:		{ val: "", type: "" },
		_noUpdate:		false,

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
				this._networkXHR = { val: "", type: "network_xhr" };
			}
			else
			{
				this._networkXHR = { val: status, type: "network_xhr" };
			}
			this.updateStatusField();
		},

		setStatusText: function(status)
		{
			this._status = { val: status, type: "status_chrome" };
			this.updateStatusField();
		},

		setJSStatus: function(status)
		{
			this._jsStatus = { val: status, type: "status_content" };
			this.updateStatusField();
		},

		setJSDefaultStatus: function(status)
		{
			this._jsDefaultStatus = { val: status, type: "status_content_default" };
			this.updateStatusField();
		},

		setDefaultStatus: function(status)
		{
			this._defaultStatus = { val: status, type: "status_chrome_default" };
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
					this._overLink = { val: link, type: "link", anchor: aAnchor };
					this.updateStatusField();
				}
				else
				{
					this.setStatusField(statusLinkOver, { val: link, type: "link", anchor: aAnchor }, true);
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
				if(this._statusTimeoutID)
				{
					window.clearTimeout(this._statusTimeoutID);
					delete this._statusTimeoutID;
				}

				if(this._noUpdate)
				{
					return;
				}

				this._statusText = text;

				this.setStatusField(s4e_service.status, text, false);

				if(text.val && text.type != "link" && s4e_service.statusTimeout)
				{
					this._statusTimeoutID = window.setTimeout(function(self)
					{
						self.clearStatusField();
					}, s4e_service.statusTimeout, this);
				}
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
						urlbar.setStatus(text.val);
						urlbar.setStatusType(text.type);
					}
					break;
//				case 4:
//					if(allowTooltip)
//					{
//						if(text.anchor instanceof HTMLAnchorElement)
//						{
//							// Set the tooltip for a content link
//						}
//						break;
//					}
				default:
					label = s4e_getters.statusOverlay;
					break;
			}

			if(label)
			{
				label.value = text.val;
				label.setAttribute("previoustype", label.getAttribute("type"));
				label.setAttribute("type", text.type);
				label.setAttribute("crop", text.type == "link" ? "center" : "end");
			}
		}
	}
	let s4e_statusService = caligon.status4evar.statusService;

//
// Over Link delay service
//
	caligon.status4evar.overLinkService =
	{
		_timer: 0,
		_currentLink: { link: "", anchor: null },
		_pendingLink: { link: "", anchor: null },

		update: function(aLink, aAnchor)
		{
			window.clearTimeout(this._timer);
			window.removeEventListener("mousemove", this, true);
			this._pendingLink = { link: aLink, anchor: aAnchor };

			if(!aLink)
			{
				if(XULBrowserWindow.hideOverLinkImmediately || !s4e_service.statusLinkOverDelayHide)
				{
					this._show();
				}
				else
				{
					this._timer = window.setTimeout(this._show.bind(this), s4e_service.statusLinkOverDelayHide);
				}
			}
			else if(this._currentLink.link || !s4e_service.statusLinkOverDelayShow)
			{
				this._show();
			}
			else
			{
				this._showDelayed();
				window.addEventListener("mousemove", this, true);
			}
		},

		handleEvent: function(event)
		{
			switch(event.type)
			{
				case "mousemove":
					window.clearTimeout(this._timer);
					this._showDelayed();
			}
		},

		_showDelayed: function()
		{
			this._timer = setTimeout(function(self)
			{
				self._show();
				window.removeEventListener("mousemove", self, true);
			}, s4e_service.statusLinkOverDelayShow, this);
		},

		_show: function()
		{
			this._currentLink = this._pendingLink;
			s4e_statusService.setOverLinkInternal(this._currentLink.link, this._currentLink.anchor);
		}
	}
	let s4e_overLinkService = caligon.status4evar.overLinkService;

//
// Progress meters and network status
//
	caligon.status4evar.progressMeter =
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
									msg = s4e_strings.getString("nv_stopped");
									break;
								case Components.results.NS_ERROR_NET_TIMEOUT:
									msg = s4e_strings.getString("nv_timeout");
									break;
							}
						}
					}

					if(!msg && (!location || location.spec != "about:blank"))
					{
						msg = s4e_strings.getString("nv_done");
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

		QueryInterface: XPCOMUtils.generateQI([ CI.nsIWebProgressListener,
		                                        CI.nsIWebProgressListener2 ])
	}
	let s4e_progressMeter = caligon.status4evar.progressMeter;

//
// Implement download status
//
	caligon.status4evar.downloadStatus =
	{
		_activeStr:      s4e_strings.getString("activeDownloads"),
		_pausedStr:      s4e_strings.getString("pausedDownloads"),
		_noDnldStr:      s4e_strings.getString("noDownloads"),
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
			}
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
			let numDls =         ((dlPaused) ? numPaused         : (numActive - numPaused));
			let dlStatus =       ((dlPaused) ? this._pausedStr   : this._activeStr);
			let dlTotalSize =    ((dlPaused) ? pausedTotalSize   : activeTotalSize);
			let dlTransferred =  ((dlPaused) ? pausedTransferred : activeTransferred);
			let dlMaxProgress =  ((dlPaused) ? pausedMaxProgress : activeMaxProgress);
			let dlMinProgress =  ((dlPaused) ? pausedMinProgress : activeMinProgress);
			let dlProgressType = ((dlPaused) ? "paused"          : "active");

			[this._dlTimeStr, this._lastTime] = this.DownloadUtils.getTimeLeft(maxTime, this._lastTime);
			this._dlCountStr =     this.PluralForm.get(numDls, dlStatus).replace("#1", numDls);
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
				download_button.label = this._noDnldStr;
				download_tooltip.label = this._noDnldStr;

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

		QueryInterface: XPCOMUtils.generateQI([ CI.nsIDownloadProgressListener ])
	}
	let s4e_downloadStatus = caligon.status4evar.downloadStatus;

//
// Update status text flexible splitters
//
	caligon.status4evar.updateSplitters = function(action)
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
	let s4e_updateSplitters = caligon.status4evar.updateSplitters;

//
// Update window re-size gripper
//
	let s4e_lastwindowState = null;

	caligon.status4evar.updateWindowGripper = function(action)
	{
		let gripper = document.getElementById("status4evar-window-gripper");
		let addon_bar = s4e_getters.addonbar;
		s4e_lastwindowState = window.windowState;

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
	}
	let s4e_updateWindowGripper = caligon.status4evar.updateWindowGripper;

	caligon.status4evar.resizeHandler = function(e)
	{
		if(window.windowState != s4e_lastwindowState)
		{
			s4e_updateWindowGripper(true);
		}
	}
	let s4e_resizeHandler = caligon.status4evar.resizeHandler;

//
// Prepare the window before customization
//
	caligon.status4evar.beforeCustomization = function()
	{
		s4e_updateSplitters(false);
		s4e_updateWindowGripper(false);

		s4e_statusService.setNoUpdate(true);
		let status_label = s4e_getters.statusWidgetLabel;
		if(status_label)
		{
			status_label.value = s4e_strings.getString("statusText");
		}
	}
	let s4e_beforeCustomization = caligon.status4evar.beforeCustomization;

//
// Update the window after customization
//
	caligon.status4evar.updateWindow = function()
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
		// * updateWindowGripper(true)
	}
	let s4e_updateWindow = caligon.status4evar.updateWindow;

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

	s4e_updateWindow();

	gBrowser.addProgressListener(s4e_progressMeter);
	gNavToolbox.addEventListener("beforecustomization", s4e_beforeCustomization, false);
	gNavToolbox.addEventListener("aftercustomization", s4e_updateWindow, false);
	window.addEventListener("resize", s4e_resizeHandler, false);

	// OMFG HAX! If a page is already loading, fake a network start event
	if(XULBrowserWindow._busyUI)
	{
		let nsIWPL = CI.nsIWebProgressListener;
		s4e_progressMeter.onStateChange(0, null, nsIWPL.STATE_START | nsIWPL.STATE_IS_NETWORK, 0);
	}
}, false);

