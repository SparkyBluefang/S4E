# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
# 
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Status-4-Evar.
#
# The Initial Developer of the Original Code is 
# Matthew Turnbull <sparky@bluefang-logic.com>.
#
# Portions created by the Initial Developer are Copyright (C) 2012
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

GREP       = grep
CUT        = cut
LS         = ls
SORT       = sort
TAIL       = tail
EXPR       = expr
RM         = rm
MKDIR      = mkdir
ZIP        = zip
ECHO       = echo
PY         = env python2

XRSDK      = $(shell $(LS) -d /opt/mozilla/xulrunner-sdk-* | $(SORT) -V | $(TAIL) -1)
XRSDK_VERS = $(shell $(GREP) "^Milestone=" $(XRSDK)/bin/platform.ini | $(CUT) -d"=" -f2 | $(CUT) -d"." -f1)
TYPELIB_PY = $(shell $(EXPR) $(XRSDK_VERS) \>= 11)

VERSION    = $(shell $(GREP) "^version=" install.manifest | $(CUT) -d"=" -f2)
XPT_FILES  = $(patsubst %.idl,%.xpt,$(wildcard components/*.idl))
TLIB_CACHE = components/cache

all: clean xpi

debug:
	@$(ECHO) "SDK Path: $(XRSDK)"
	@$(ECHO) "SDK Version: $(XRSDK_VERS)"
	@$(ECHO) "S4E Version: $(VERSION)"
	@$(ECHO) "S4E XPT files: $(XPT_FILES)"

clean:
	$(RM) -f *.xpi
	$(RM) -f install.rdf
	$(RM) -f components/*.xpt
	$(RM) -rf components/cache

$(TLIB_CACHE):
	$(MKDIR) $@

%.xpt: %.idl $(TLIB_CACHE)
ifeq ($(TYPELIB_PY),1)
	$(PY) $(XRSDK)/sdk/bin/typelib.py --cachedir=$(TLIB_CACHE) \
		-I $(XRSDK)/idl -o $*.xpt $*.idl
else
	$(XRSDK)/bin/xpidl -m typelib -w -v \
		-I $(XRSDK)/idl -e $*.xpt $*.idl
endif

xpt: $(XPT_FILES)

install.rdf: install.manifest
	./buildInstallRdf

rdf: install.rdf

xpi: xpt rdf
	$(ZIP) -r status4evar-$(VERSION)-fx.xpi \
		chrome \
		defaults \
		chrome.manifest \
		install.rdf \
		components/*.js \
		$(XPT_FILES)

