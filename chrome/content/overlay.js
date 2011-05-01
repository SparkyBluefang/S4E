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

//
// S4E Strings
//
	caligon.status4evar.strings = document.getElementById("bundle_status4evar");
	let s4e_strings = caligon.status4evar.strings;

//
// Element getters
//
	caligon.status4evar.getters =
	{
		resetGetters: function()
		{
			delete this.addonbar;
			this.__defineGetter__("addonbar", function()
			{
				delete this.addonbar;
				return this.addonbar = document.getElementById("addon-bar");
			});

			delete this.addonbarCloseButton;
			this.__defineGetter__("addonbarCloseButton", function()
			{
				delete this.addonbarCloseButton;
				return this.addonbarCloseButton = document.getElementById("addonbar-closebutton");
			});

			delete this.browserBottomBox;
			this.__defineGetter__("browserBottomBox", function()
			{
				delete this.browserBottomBox;
				return this.browserBottomBox = document.getElementById("browser-bottombox");
			});

			delete this.downloadButton;
			this.__defineGetter__("downloadButton", function()
			{
				delete this.downloadButton;
				return this.downloadButton = document.getElementById("status4evar-download-button");
			});

			delete this.downloadButtonTooltip;
			this.__defineGetter__("downloadButtonTooltip", function()
			{
				delete this.downloadButtonTooltip;
				return this.downloadButtonTooltip = document.getElementById("status4evar-download-tooltip");
			});

			delete this.statusWidget;
			this.__defineGetter__("statusWidget", function()
			{
				delete this.statusWidget;
				return this.statusWidget = document.getElementById("status4evar-status-widget");
			});

			delete this.statusWidgetLabel;
			this.__defineGetter__("statusWidgetLabel", function()
			{
				delete this.statusWidgetLabel;
				return this.statusWidgetLabel = document.getElementById("status4evar-status-text");
			});

			delete this.statusOverlay;
			this.__defineGetter__("statusOverlay", function()
			{
				delete this.statusOverlay;
				return this.statusOverlay = document.getElementById("statusbar-display");
			});

			delete this.toolbarProgress;
			this.__defineGetter__("toolbarProgress", function()
			{
				delete this.toolbarProgress;
				return this.toolbarProgress = document.getElementById("status4evar-progress-bar");
			});

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

			delete this.urlbarProgress;
			this.__defineGetter__("urlbarProgress", function()
			{
				delete this.urlbarProgress;
				return this.urlbarProgress = document.getElementById("urlbar-progress-alt");
			});
		}
	}
	let s4e_getters = caligon.status4evar.getters;

//
// Override status functions
//
	XULBrowserWindow.updateStatusField = function() {}
	XULBrowserWindow.onStatusChange = function() {}

	XULBrowserWindow.getStatusText = function()
	{
		return this.s4e_status.val;
	}

	XULBrowserWindow.getCompositeStatusText = function()
	{
		return this.s4e_statusText.val;
	}

	XULBrowserWindow.setNetworkStatus = function(status)
	{
		if(s4e_progressMeter._busyUI)
		{
			this.s4e_network = { val: status, type: "network" };
			this.s4e_networkXHR = { val: "", type: "network_xhr" };
		}
		else
		{
			this.s4e_networkXHR = { val: status, type: "network_xhr" };
		}
		this.updateS4EStatusField();
	}

	XULBrowserWindow.setStatusText = function(status)
	{
		this.s4e_status = { val: status, type: "status_chrome" };
		this.updateS4EStatusField();
	}

	XULBrowserWindow.setJSStatus = function(status)
	{
		this.s4e_jsStatus = { val: status, type: "status_content" };
		this.updateS4EStatusField();
	}

	XULBrowserWindow.setJSDefaultStatus = function(status)
	{
		this.s4e_jsDefaultStatus = { val: status, type: "status_content_default" };
		this.updateS4EStatusField();
	}

	XULBrowserWindow.setDefaultStatus = function(status)
	{
		this.s4e_defaultStatus = { val: status, type: "status_chrome_default" };
		this.updateS4EStatusField();
	}

	XULBrowserWindow.setOverLink = function(link, anchor)
	{
		s4e_overLinkService.update(link, anchor);
	}

	XULBrowserWindow.setOverLinkInternal = function(link, anchor)
	{
		let status = s4e_service.status;
		let statusLinkOver = s4e_service.statusLinkOver;

		if(statusLinkOver)
		{
			link = link.replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e]/g, encodeURIComponent);

			if(status == statusLinkOver)
			{
				this.s4e_overLink = { val: link, type: "link" };
				this.updateS4EStatusField();
			}
			else
			{
				this.setStatusField(statusLinkOver, { val: link, type: "link" }, true);
			}
		}
	}

	XULBrowserWindow.setNoUpdate = function(nu)
	{
		this.noUpdate = nu;
	}

	XULBrowserWindow.updateS4EStatusField = function(force)
	{
		let text = { val: "", type: "" };
		for(let i = 0; !text.val && i < this.s4e_textOrder.length; i++)
		{
			text = this[this.s4e_textOrder[i]];
		}

		if(this.s4e_statusText.val != text.val || force)
		{
			if(this.statusTimeoutID)
			{
				window.clearTimeout(this.statusTimeoutID);
				delete this.statusTimeoutID;
			}

			if(this.noUpdate)
			{
				return;
			}

			this.s4e_statusText = text;

			this.setStatusField(s4e_service.status, text, false);

			if(text.val && text.type != "link" && s4e_service.statusTimeout)
			{
				this.statusTimeoutID = window.setTimeout(function()
				{
					XULBrowserWindow.clearStatusField();
				}, s4e_service.statusTimeout);
			}
		}
	}

	XULBrowserWindow.clearStatusField = function()
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
	}

	XULBrowserWindow.setStatusField = function(location, text, allowTooltip)
	{
		let label = null;

		switch(location)
		{
			case 0:
				break;
			case 2:
				let urlbar = s4e_getters.urlbar;
				if(urlbar)
				{
					urlbar.setStatus(text.val);
					urlbar.setStatusType(text.type);
				}
				break;
			case 3:
				label = s4e_getters.statusOverlay;
				break;
//			case 4:
//				if(allowTooltip)
//				{
//					// set tooltip
//					break;
//				}
			default:
				label = s4e_getters.statusWidgetLabel;
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

	XULBrowserWindow.buildTextOrder = function()
	{
		this.__defineGetter__("s4e_textOrder", function()
		{
			let textOrder = ["s4e_overLink"];
			if(s4e_service.statusNetwork)
			{
				textOrder.push("s4e_network");
				if(s4e_service.statusNetworkXHR)
				{
					textOrder.push("s4e_networkXHR");
				}
			}
			textOrder.push("s4e_status", "s4e_jsStatus");
			if(s4e_service.statusDefault)
			{
				textOrder.push("s4e_jsDefaultStatus", "s4e_defaultStatus");
			}

			delete this.s4e_textOrder;
			return this.s4e_textOrder = textOrder;
		});
	}

	XULBrowserWindow.setUpStatusText = function()
	{
		this.buildTextOrder();
		this.s4e_overLink = { val: "", type: "" };
		this.s4e_network = { val: "", type: "" };
		this.s4e_networkXHR = { val: "", type: "" };
		this.s4e_status = { val: "", type: "" };
		this.s4e_jsStatus = { val: "", type: "" };
		this.s4e_jsDefaultStatus = { val: "", type: "" };
		this.s4e_defaultStatus = { val: "", type: "" };
		this.s4e_statusText = { val: "", type: "" };
	}

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
			XULBrowserWindow.setOverLinkInternal(this._currentLink.link, this._currentLink.anchor);
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
			XULBrowserWindow.setNetworkStatus(aMessage);
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

					XULBrowserWindow.setDefaultStatus(msg);
					XULBrowserWindow.setNetworkStatus("");
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
		_activeStr:	s4e_strings.getString("activeDownloads"),
		_pausedStr:	s4e_strings.getString("pausedDownloads"),
		_noDnldStr:	s4e_strings.getString("noDownloads"),
		_listening:	false,
		_lastTime:	Infinity,
		_dlCountStr:	null,
		_dlTimeStr:	null,
		_dlActive:	false,
		_dlPaused:	false,

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
			let maxTime = -Infinity;
			let dls = this.DownloadManager.activeDownloads;
			while(dls.hasMoreElements())
			{
				let dl = dls.getNext().QueryInterface(CI.nsIDownload);
				if(dl.state == this.DownloadManager.DOWNLOAD_DOWNLOADING)
				{
					if(dl.speed > 0 && dl.size > 0)
					{
						maxTime = Math.max(maxTime, (dl.size - dl.amountTransferred) / dl.speed);
					}
					else
					{
						maxTime = -1;
					}
				}
				else if(dl.state == this.DownloadManager.DOWNLOAD_PAUSED)
				{
					numPaused++;
				}
			}

			[this._dlTimeStr, this._lastTime] = this.DownloadUtils.getTimeLeft(maxTime, this._lastTime);

			let numDls = numActive - numPaused;
			let dlStatus = this._activeStr;
			this._dlPaused = false;
			if(numDls == 0)
			{
				numDls = numPaused;
				dlStatus = this._pausedStr;
				this._dlPaused = true;
			}

			dlStatus = PluralForm.get(numDls, dlStatus);
			this._dlCountStr = dlStatus.replace("#1", numDls);

			this._dlActive = true;
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
				return;
			}

			switch(s4e_service.downloadLabel)
			{
				case 0:
					download_button.label = this._dlCountStr;
					break;
				case 1:
					download_button.label = ((this._dlPaused) ? this._dlCountStr : this._dlTimeStr);
					break;
				default:
					let compStr = this._dlCountStr;
					if(!this._dlPaused)
					{
						compStr += " (" + this._dlTimeStr + ")";
					}
					download_button.label = compStr;
					break;
			}

			switch(s4e_service.downloadTooltip)
			{
				case 0:
					download_tooltip.label = this._dlCountStr;
					break;
				case 1:
					download_tooltip.label = ((this._dlPaused) ? this._dlCountStr : this._dlTimeStr);
					break;
				default:
					let compStr = this._dlCountStr;
					if(!this._dlPaused)
					{
						compStr += " (" + this._dlTimeStr + ")";
					}
					download_tooltip.label = compStr;
					break;
			}

			download_button.collapsed = false;
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

		XULBrowserWindow.setNoUpdate(true);
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
		XULBrowserWindow.setNoUpdate(false);

		s4e_getters.resetGetters();
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

	XULBrowserWindow.setUpStatusText();
	s4e_updateWindow();

	gBrowser.addProgressListener(s4e_progressMeter);
	gNavToolbox.addEventListener("beforecustomization", s4e_beforeCustomization, false);
	gNavToolbox.addEventListener("aftercustomization", s4e_updateWindow, false);
	window.addEventListener("resize", s4e_resizeHandler, false);

}, false);

