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

Components.utils.import("resource://gre/modules/Services.jsm");

var status4evarPrefs =
{
//
// String bundle
//
	get s4e_strings()
	{
		delete this.s4e_strings;
		return this.s4e_strings = document.getElementById("bundle_status4evar");
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
		}
		else
		{
			this.progressUrlbarPref.disabled = true;
			this.progressUrlbarCheckbox.checked = false;
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
	},

	progressUrlbarStyleChanged: function()
	{
		this.progressUrlbarCSSChanged();
		this.progressUrlbarCSSPref.disabled = !this.progressUrlbarStylePref.value;
	},

	progressUrlbarStyleSync: function()
	{
		this.progressUrlbarStyleChanged();
		return undefined;
	},

//
// Urlbar progress editor management
//
	get progressUrlbarStyleAdvancedPref()
	{
		delete this.progressUrlbarStyleAdvancedPref;
		return this.progressUrlbarStyleAdvancedPref = document.getElementById("status4evar-pref-progress-urlbar-style-advanced");
	},

	get progressUrlbarEditor()
	{
		delete this.progressUrlbarEditor;
		return this.progressUrlbarEditor = document.getElementById("status4evar-progress-urlbar-editor");
	},

	get progressUrlbarEditorMenu()
	{
		delete this.progressUrlbarEditorMenu;
		return this.progressUrlbarEditorMenu = document.getElementById("status4evar-progress-urlbar-editor-menu");
	},

	get progressUrlbarEditorColor()
	{
		delete this.progressUrlbarEditorColor;
		return this.progressUrlbarEditorColor = document.getElementById("status4evar-progress-urlbar-editor-color-picker");
	},

	get progressUrlbarEditorImage()
	{
		delete this.progressUrlbarEditorImage;
		return this.progressUrlbarEditorImage = document.getElementById("status4evar-progress-urlbar-editor-image-input");
	},

	disableProgressUrlbarEditorUpdateCSS: true,
	progressUrlbarEditorFirstRun: true,

	progressUrlbarEditorChanged: function()
	{
		let isFirstRun = this.progressUrlbarEditorFirstRun;
		this.progressUrlbarEditorFirstRun = false;

		if(this.progressUrlbarStyleAdvancedPref.value)
		{
			this.progressUrlbarEditor.selectedIndex = 1;
		}
		else
		{
			let cssParser = document.createElement("div");
			cssParser.style.background = this.progressUrlbarCSSPref.value;

			let bgI = cssParser.style.backgroundImage;
			let bgC = cssParser.style.backgroundColor;

			if((bgI != "none" && !urlRE.test(bgI)) || !rgbRE.test(bgC))
			{
				var result = isFirstRun ||
						Services.prompt.confirm(window, this.s4e_strings.getString("simpleEditorTitle"), this.s4e_strings.getString("simpleEditorMessage"));
				if(isFirstRun || !result)
				{
					this.progressUrlbarStyleAdvancedPref.value = true;
					return;
				}

				if(bgI != "none" && !urlRE.test(bgI))
				{
					bgI = "none";
				}

				if(!rgbRE.test(bgC))
				{
					bgC = "#33FF33";
				}

				this.progressUrlbarCSSPref.value = bgC + " " + bgI;
			}

			this.disableProgressUrlbarEditorUpdateCSS = true;

			this.progressUrlbarEditorColor.color = rgbToHex(bgC);
			this.progressUrlbarEditorImage.value = ((bgI != "none") ? urlRE.exec(bgI)[1].trim() : "none");

			this.disableProgressUrlbarEditorUpdateCSS = false;

			this.progressUrlbarEditor.selectedIndex = 0;
		}
	},

	progressUrlbarEditorUpdateCSS: function()
	{
		if(this.disableProgressUrlbarEditorUpdateCSS)
		{
			return;
		}

		let cssVal = this.progressUrlbarEditorColor.color;
		let imageVal = this.progressUrlbarEditorImage.value;
		if(imageVal && imageVal != "none")
		{
			cssVal += " url(\"" + imageVal + "\")";
		}

		this.progressUrlbarCSSPref.value = cssVal;
	},

	progressUrlbarEditorMenuFrom: function()
	{
		this.progressUrlbarEditorChanged();
		return ((this.progressUrlbarStyleAdvancedPref.value) ? 1 : 0);
	},

	progressUrlbarEditorMenuTo: function()
	{
		return ((this.progressUrlbarEditorMenu.value == 1) ? true : false);
	},

	progressUrlbarEditorImageBrowse: function()
	{
		this.progressUrlbarEditorImage.value = getImageFileUri();
		this.progressUrlbarEditorUpdateCSS();
	},

	progressUrlbarEditorImageClear: function()
	{
		this.progressUrlbarEditorImage.value = "none";
		this.progressUrlbarEditorUpdateCSS();
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

	progressToolbarCSSChanged: function()
	{
		if(!this.progressToolbarCSSPref.value)
		{
			this.progressToolbarCSSPref.value = "#33FF33";
		}
	},

	progressToolbarStyleChanged: function()
	{
		this.progressToolbarCSSChanged();
		this.progressToolbarCSSPref.disabled = !this.progressToolbarStylePref.value;
	},

	progressToolbarStyleSync: function()
	{
		this.progressToolbarStyleChanged();
		return undefined;
	},

//
// Toolbar progress editor management
//
	get progressToolbarStyleAdvancedPref()
	{
		delete this.progressToolbarStyleAdvancedPref;
		return this.progressToolbarStyleAdvancedPref = document.getElementById("status4evar-pref-progress-toolbar-style-advanced");
	},

	get progressToolbarEditor()
	{
		delete this.progressToolbarEditor;
		return this.progressToolbarEditor = document.getElementById("status4evar-progress-toolbar-editor");
	},

	get progressToolbarEditorMenu()
	{
		delete this.progressToolbarEditorMenu;
		return this.progressToolbarEditorMenu = document.getElementById("status4evar-progress-toolbar-editor-menu");
	},

	get progressToolbarEditorColor()
	{
		delete this.progressToolbarEditorColor;
		return this.progressToolbarEditorColor = document.getElementById("status4evar-progress-toolbar-editor-color-picker");
	},

	get progressToolbarEditorImage()
	{
		delete this.progressToolbarEditorImage;
		return this.progressToolbarEditorImage = document.getElementById("status4evar-progress-toolbar-editor-image-input");
	},

	disableProgressToolbarEditorUpdateCSS: true,
	progressToolbarEditorFirstRun: true,

	progressToolbarEditorChanged: function()
	{
		let isFirstRun = this.progressToolbarEditorFirstRun;
		this.progressToolbarEditorFirstRun = false;

		if(this.progressToolbarStyleAdvancedPref.value)
		{
			this.progressToolbarEditor.selectedIndex = 1;
		}
		else
		{
			let cssParser = document.createElement("div");
			cssParser.style.background = this.progressToolbarCSSPref.value;

			let bgI = cssParser.style.backgroundImage;
			let bgC = cssParser.style.backgroundColor;

			if((bgI != "none" && !urlRE.test(bgI)) || !rgbRE.test(bgC))
			{
				var result = isFirstRun ||
						Services.prompt.confirm(window, this.s4e_strings.getString("simpleEditorTitle"), this.s4e_strings.getString("simpleEditorMessage"));
				if(isFirstRun || !result)
				{
					this.progressToolbarStyleAdvancedPref.value = true;
					return;
				}

				if(bgI != "none" && !urlRE.test(bgI))
				{
					bgI = "none";
				}

				if(!rgbRE.test(bgC))
				{
					bgC = "#33FF33";
				}

				this.progressToolbarCSSPref.value = bgC + " " + bgI;
			}

			this.disableProgressToolbarEditorUpdateCSS = true;

			this.progressToolbarEditorColor.color = rgbToHex(bgC);
			this.progressToolbarEditorImage.value = ((bgI != "none") ? urlRE.exec(bgI)[1].trim() : "none");

			this.disableProgressToolbarEditorUpdateCSS = false;

			this.progressToolbarEditor.selectedIndex = 0;
		}
	},

	progressToolbarEditorUpdateCSS: function()
	{
		if(this.disableProgressToolbarEditorUpdateCSS)
		{
			return;
		}

		let cssVal = this.progressToolbarEditorColor.color;
		let imageVal = this.progressToolbarEditorImage.value;
		if(imageVal && imageVal != "none")
		{
			cssVal += " url(\"" + imageVal + "\")";
		}

		this.progressToolbarCSSPref.value = cssVal;
	},

	progressToolbarEditorMenuFrom: function()
	{
		this.progressToolbarEditorChanged();
		return ((this.progressToolbarStyleAdvancedPref.value) ? 1 : 0);
	},

	progressToolbarEditorMenuTo: function()
	{
		return ((this.progressToolbarEditorMenu.value == 1) ? true : false);
	},

	progressToolbarEditorImageBrowse: function()
	{
		this.progressToolbarEditorImage.value = getImageFileUri();
		this.progressToolbarEditorUpdateCSS();
	},

	progressToolbarEditorImageClear: function()
	{
		this.progressToolbarEditorImage.value = "none";
		this.progressToolbarEditorUpdateCSS();
	}
}

//
// Tools
//

const rgbRE = /rgb\((\d+), (\d+), (\d+)\)/;
const urlRE = /url\(\w*['"]?(.*)['"]?\w*\)/;

function rgbToHex(color)
{
	if(color.charAt(0) == "#")
	{
		return color;
	}

	var digits = rgbRE.exec(color);

	var red = parseInt(digits[1]);
	var green = parseInt(digits[2]);
	var blue = parseInt(digits[3]);

	var rgb = blue | (green << 8) | (red << 16);
	return '#' + rgb.toString(16);
}

function getImageFileUri()
{
	let nsIFilePicker = Components.interfaces.nsIFilePicker;
	let filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	filePicker.init(window, status4evarPrefs.s4e_strings.getString("imageSelectTitle"), nsIFilePicker.modeOpen);
	filePicker.appendFilters(nsIFilePicker.filterImages);
	let res = filePicker.show();
	if (res == nsIFilePicker.returnOK){
		return Services.io.newFileURI(filePicker.file).spec;
	}
	return "none";
}

