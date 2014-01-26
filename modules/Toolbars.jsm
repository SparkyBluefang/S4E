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

const EXPORTED_SYMBOLS = ["S4EToolbars"];

const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://gre/modules/Services.jsm");

function S4EToolbars(window, toolbox, service, getters)
{
	this._window = window;
	this._toolbox = toolbox;
	this._service = service;
	this._getters = getters;

	try
	{
		this._handler = new AustralisS4EToolbars(this._window, this._toolbox);
		Services.console.logStringMessage("S4EToolbars using AustralisS4EToolbars backend");
	}
	catch(e)
	{
		this._handler = new ClassicS4EToolbars(this._window, this._toolbox);
		Services.console.logStringMessage("S4EToolbars using ClassicS4EToolbars backend");
	}
}

S4EToolbars.prototype =
{
	_window:  null,
	_toolbox: null,
	_service: null,
	_getters: null,

	_handler: null,

	setup: function()
	{
		this.updateSplitters(false);
		this.updateWindowGripper(false);
		this._handler.setup(this._service.firstRun);
	},

	destroy: function()
	{
		this._handler.destroy();

		["_window", "_toolbox",  "_service", "_getters", "_handler"].forEach(function(prop)
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

		let status = this._getters.statusWidget;
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
		let toolbar = this._getters.statusBar || this._getters.addonbar;

		if(!action || !toolbar || !this._service.addonbarWindowGripper
		|| this._window.windowState != CI.nsIDOMChromeWindow.STATE_NORMAL || toolbar.toolbox.customizing)
		{
			if(gripper)
			{
				gripper.parentNode.removeChild(gripper);
			}
			return;
		}

		gripper = this._handler.buildGripper(toolbar, gripper, "status4evar-window-gripper");

		toolbar.appendChild(gripper);
	}
};

function ClassicS4EToolbars(window, toolbox)
{
	this._window = window;
	this._toolbox = toolbox;
}

ClassicS4EToolbars.prototype =
{
	_window:  null,
	_toolbox: null,

	setup: function(firstRun)
	{
		let document = this._window.document;
		let status_bar = document.getElementById("status-bar");
		if(status_bar)
		{
			status_bar.setAttribute("ordinal", "1");
		}

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
			if(firstRun)
			{
				let isCustomizableToolbar = function(aElt)
				{
					return aElt.localName == "toolbar" && aElt.getAttribute("customizable") == "true";
				}

				let isCustomizedAlready = false;
				let toolbars = Array.filter(this._toolbox.childNodes, isCustomizableToolbar).concat(
					       Array.filter(this._toolbox.externalToolbars, isCustomizableToolbar));
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
					this._window.setToolbarVisibility(addon_bar, true);
				}
			}
		}
	},

	destroy: function()
	{
		["_window", "_toolbox"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	buildGripper: function(toolbar, gripper, id)
	{
		if(!gripper)
		{
			let document = this._window.document;

			gripper = document.createElement("resizer");
			gripper.id = id;
			gripper.dir = "bottomend";
		}

		return gripper;
	}
};

function AustralisS4EToolbars(window, toolbox)
{
	this._window = window;
	this._toolbox = toolbox;

	this._api = CU.import("resource:///modules/CustomizableUI.jsm", {}).CustomizableUI;
}

AustralisS4EToolbars.prototype =
{
	_window:  null,
	_toolbox: null,

	_api: null,

	setup: function(firstRun)
	{
		
	},

	destroy: function()
	{
		["_window", "_toolbox",  "_api"].forEach(function(prop)
		{
			delete this[prop];
		}, this);
	},

	buildGripper: function(toolbar, container, id)
	{
		if(!container)
		{
			let document = this._window.document;

			let gripper = document.createElement("resizer");
			gripper.dir = "bottomend";

			container = document.createElement("hbox");
			container.id = id;
			container.pack = "end";
			container.ordinal = 1000;
			container.appendChild(gripper);
		}

		let needFlex = 1;
		for(let node of toolbar.childNodes)
		{
			if(node.hasAttribute("flex") || node.flex)
			{
				needFlex = 0;
				break;
			}
		}
		container.flex = needFlex;

		return container;
	}
};

