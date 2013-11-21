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

const CU = Components.utils;

CU.import("resource://gre/modules/Services.jsm");

const S4EToolbars =
{
	get handler()
	{
		delete this.handler;

		try
		{
			this.handler = new AustralisS4EToolbars();
			Services.console.logStringMessage("S4EToolbars using AustralisS4EToolbars backend");
		}
		catch(e)
		{
			this.handler = new ClassicS4EToolbars();
			Services.console.logStringMessage("S4EToolbars using ClassicS4EToolbars backend");
		}

		return this.handler;
	},

	setup: function(window, gNavToolbox, service)
	{
		this.handler.setup(window, gNavToolbox, service);
	}
};

function ClassicS4EToolbars() {}

ClassicS4EToolbars.prototype =
{
	setup: function(window, gNavToolbox, service)
	{
		let document = window.document;
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
			if(service.firstRun)
			{
				let isCustomizableToolbar = function(aElt)
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
					window.setToolbarVisibility(addon_bar, true);
				}
			}
		}
	}
};

function AustralisS4EToolbars()
{
	this._api = CU.import("resource:///modules/CustomizableUI.jsm", {}).CustomizableUI;
}

AustralisS4EToolbars.prototype =
{
	_api: null,

	setup: function(window, gNavToolbox, service) {}
};

