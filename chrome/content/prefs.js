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

Components.utils.import("resource://gre/modules/Services.jsm");

var status4evarPrefs =
{
	get dynamicProgressStyle()
	{
		let styleSheets = window.document.styleSheets;
		for(let i = 0; i < styleSheets.length; i++)
		{
			let styleSheet = styleSheets[i];
			if(styleSheet.href == "chrome://status4evar/skin/dynamic.css")
			{
				delete this.dynamicProgressStyle;
				return this.dynamicProgressStyle = styleSheet;
			}
		}
	},

//
// Status timeout management
//
	get statusTimeoutPref()
	{
		delete this.statusTimeoutPref;
		return this.statusTimeoutPref = document.getElementById("status4evar-pref-status-timeout");
	},

	get statusTimeoutCheckbox()
	{
		delete this.statusTimeoutCheckbox;
		return this.statusTimeoutCheckbox = document.getElementById("status4evar-status-timeout-check");
	},

	statusTimeoutChanged: function()
	{
		if(this.statusTimeoutPref.value > 0)
		{
			this.statusTimeoutPref.disabled = false;
			this.statusTimeoutCheckbox.checked = true;
		}
		else
		{
			this.statusTimeoutPref.disabled = true;
			this.statusTimeoutCheckbox.checked = false;
		}
	},

	statusTimeoutSync: function()
	{
		this.statusTimeoutChanged();
		return undefined;
	},

	statusTimeoutToggle: function()
	{
		if(this.statusTimeoutPref.disabled == this.statusTimeoutCheckbox.checked)
		{
			if(this.statusTimeoutCheckbox.checked)
			{
				this.statusTimeoutPref.value = 10;
			}
			else
			{
				this.statusTimeoutPref.value = 0;
			}
		}
	},

//
// Status network management
//
	get statusNetworkPref()
	{
		delete this.statusNetworkPref;
		return this.statusNetworkPref = document.getElementById("status4evar-pref-status-network");
	},

	get statusNetworkXHRPref()
	{
		delete this.statusNetworkXHRPref;
		return this.statusNetworkXHRPref = document.getElementById("status4evar-pref-status-network-xhr");
	},

	statusNetworkChanged: function()
	{
		this.statusNetworkXHRPref.disabled = ! this.statusNetworkPref.value;
	},

	statusNetworkSync: function()
	{
		this.statusNetworkChanged();
		return undefined;
	},

//
// Status Text langth managment
//
	get textMaxLengthPref()
	{
		delete this.textMaxLengthPref;
		return this.textMaxLengthPref = document.getElementById("status4evar-pref-status-toolbar-maxLength");
	},

	get textMaxLengthCheckbox()
	{
		delete this.textMaxLengthCheckbox;
		return this.textMaxLengthCheckbox = document.getElementById("status4evar-status-toolbar-maxLength-check");
	},

	textLengthChanged: function()
	{	
		if(this.textMaxLengthPref.value > 0)
		{
			this.textMaxLengthPref.disabled = false;
			this.textMaxLengthCheckbox.checked = true;
		}
		else
		{
			this.textMaxLengthPref.disabled = true;
			this.textMaxLengthCheckbox.checked = false;
		}
	},

	textLengthSync: function()
	{
		this.textLengthChanged();
		return undefined;
	},

	textLengthToggle: function()
	{
		if(this.textMaxLengthPref.disabled == this.textMaxLengthCheckbox.checked)
		{
			if(this.textMaxLengthCheckbox.checked)
			{
				this.textMaxLengthPref.value = 800;
			}
			else
			{
				this.textMaxLengthPref.value = 0;
			}
		}
	},

//
// Location bar status position
//
	get urlbarAlignPref()
	{
		delete this.urlbarAlignPref;
		return this.urlbarAlignPref = document.getElementById("status4evar-pref-status-urlbar-align");
	},

	get urlbarPositionVbox()
	{
		delete this.urlbarPositionVbox;
		return this.urlbarPositionVbox = document.getElementById("status4evar-status-urlbar-position-vbox");
	},

	urlbarAlignChanged: function()
	{
		this.urlbarPositionVbox.hidden = (this.urlbarAlignPref.value == 1);
	},

	urlbarAlignSync: function()
	{
		this.urlbarAlignChanged();
		return undefined;
	},	

//
// Progress line location management
//
	get progressUrlbar()
	{
		delete this.progressUrlbar;
		return this.progressUrlbar = document.getElementById("urlbar");
	},

	get progressUrlbarProgress()
	{
		delete this.progressUrlbarProgress;
		return this.progressUrlbarProgress = document.getElementById("urlbar-progress-alt");
	},

	get progressUrlbarPref()
	{
		delete this.progressUrlbarPref;
		return this.progressUrlbarPref = document.getElementById("status4evar-pref-progress-urlbar");
	},

	get progressUrlbarCheckbox()
	{
		delete this.progressUrlbarCheckbox;
		return this.progressUrlbarCheckbox = document.getElementById("status4evar-progress-urlbar-check");
	},

	progressUrlbarChanged: function()
	{
		if(this.progressUrlbarPref.value > 0)
		{
			this.progressUrlbarPref.disabled = false;
			this.progressUrlbarCheckbox.checked = true;
			switch(this.progressUrlbarPref.value)
			{
				case 1:
					this.progressUrlbar.setAttribute("pmpack", "end");
					break;
				case 2:
					this.progressUrlbar.setAttribute("pmpack", "begin");
					break;
				case 3:
					this.progressUrlbar.setAttribute("pmpack", "center");
					break;
			}
			this.progressUrlbarProgress.hidden = false;
		}
		else
		{
			this.progressUrlbarPref.disabled = true;
			this.progressUrlbarCheckbox.checked = false;
			this.progressUrlbarProgress.hidden = true;
		}
	},

	progressUrlbarSync: function()
	{
		this.progressUrlbarChanged();
		return undefined;
	},

	progressUrlbarToggle: function()
	{
		if(this.progressUrlbarPref.disabled == this.progressUrlbarCheckbox.checked)
		{
			if(this.progressUrlbarCheckbox.checked)
			{
				this.progressUrlbarPref.value = 1;
			}
			else
			{
				this.progressUrlbarPref.value = 0;
			}
		}
	},

//
// Urlbar progress style management
//
	get progressUrlbarStylePref()
	{
		delete this.progressUrlbarStylePref;
		return this.progressUrlbarStylePref = document.getElementById("status4evar-pref-progress-urlbar-style");
	},

	get progressUrlbarCSSPref()
	{
		delete this.progressUrlbarCSSPref;
		return this.progressUrlbarCSSPref = document.getElementById("status4evar-pref-progress-urlbar-css");
	},

	progressUrlbarCSSChanged: function()
	{
		if(!this.progressUrlbarCSSPref.value)
		{
			this.progressUrlbarCSSPref.value = "#33FF33";
		}
		this.dynamicProgressStyle.cssRules[1].style.background = this.progressUrlbarCSSPref.value;
	},

	progressUrlbarStyleChanged: function()
	{
		this.progressUrlbarCSSChanged();
		this.progressUrlbarCSSPref.disabled = !this.progressUrlbarStylePref.value;
		if(this.progressUrlbarStylePref.value)
		{
			this.progressUrlbar.setAttribute("s4estyle", true);
		}
		else
		{
			this.progressUrlbar.removeAttribute("s4estyle");
		}
	},

	progressUrlbarStyleSync: function()
	{
		this.progressUrlbarStyleChanged();
		return undefined;
	},

//
// Toolbar progress style management
//
	get progressToolbarStylePref()
	{
		delete this.progressToolbarStylePref;
		return this.progressToolbarStylePref = document.getElementById("status4evar-pref-progress-toolbar-style");
	},

	get progressToolbarCSSPref()
	{
		delete this.progressToolbarCSSPref;
		return this.progressToolbarCSSPref = document.getElementById("status4evar-pref-progress-toolbar-css");
	},

	get progressToolbarProgress()
	{
		delete this.progressToolbarProgress;
		return this.progressToolbarProgress = document.getElementById("status4evar-progress-bar");
	},

	progressToolbarCSSChanged: function()
	{
		if(!this.progressToolbarCSSPref.value)
		{
			this.progressToolbarCSSPref.value = "#33FF33";
		}
		this.dynamicProgressStyle.cssRules[2].style.background = this.progressToolbarCSSPref.value;
	},

	progressToolbarStyleChanged: function()
	{
		this.progressToolbarCSSChanged();
		this.progressToolbarCSSPref.disabled = !this.progressToolbarStylePref.value;
		if(this.progressToolbarStylePref.value)
		{
			this.progressToolbarProgress.setAttribute("s4estyle", true);
		}
		else
		{
			this.progressToolbarProgress.removeAttribute("s4estyle");
		}
	},

	progressToolbarStyleSync: function()
	{
		this.progressToolbarStyleChanged();
		return undefined;
	},

//
// Download progress management
//
	get downloadProgressCheck()
	{
		delete this.downloadProgressCheck;
		return this.downloadProgressCheck = document.getElementById("status4evar-download-progress-check");
	},

	get downloadProgressPref()
	{
		delete this.downloadPRogressPref;
		return this.downloadPRogressPref = document.getElementById("status4evar-pref-download-progress");
	},

	get downloadProgressColorActivePref()
	{
		delete this.downloadProgressActiveColorPref;
		return this.downloadProgressActiveColorPref = document.getElementById("status4evar-pref-download-color-active");
	},

	get downloadProgressColorPausedPref()
	{
		delete this.downloadProgressPausedColorPref;
		return this.downloadProgressPausedColorPref = document.getElementById("status4evar-pref-download-color-paused");
	},

	downloadProgressSync: function()
	{
		let val = this.downloadProgressPref.value;
		this.downloadProgressColorActivePref.disabled = (val == 0);
		this.downloadProgressColorPausedPref.disabled = (val == 0);
		this.downloadProgressPref.disabled = (val == 0);
		this.downloadProgressCheck.checked = (val != 0);
		return ((val == 0) ? 1 : val);
	},

	downloadProgressToggle: function()
	{
		let enabled = this.downloadProgressCheck.checked;
		this.downloadProgressPref.value = ((enabled) ? 1 : 0);
	},

//
// Advanced prefs warning page
//
	get advancedDeck()
	{
		delete this.advancedDeck;
		return this.advancedDeck = document.getElementById("status4evar-pref-advanced-deck");
	},

	get advancedShowWarningPref()
	{
		delete this.advancedShowWarningPref;
		return this.advancedShowWarningPref = document.getElementById("status4evar-pref-advanced-showWarning");
	},

	get advancedShowWarningCheck()
	{
		delete this.advancedShowWarningCheck;
		return this.advancedShowWarningCheck = document.getElementById("showWarningNextTime");
	},

	get advancedContinueButton()
	{
		delete this.advancedContinueButton;
		return this.advancedContinueButton = document.getElementById("warningButton");
	},

	advancedShowPrefs: function()
	{
		this.advancedDeck.selectedIndex = 1;
	},

//
// Pref Window load
//
	onPrefWindowLoad: function()
	{
		let showWarning = this.advancedShowWarningPref.value;
		this.advancedDeck.selectedIndex = ((showWarning) ? 0 : 1);
		if(showWarning)
		{
			this.advancedContinueButton.focus();
		}
	},

	onPrefWindowUnLoad: function()
	{
		if(this.advancedDeck.selectedIndex == 1 && this.advancedShowWarningPref.value)
		{
			this.advancedShowWarningPref.value = this.advancedShowWarningCheck.checked;
		}
	}
}

var XULBrowserWindow = {
}

