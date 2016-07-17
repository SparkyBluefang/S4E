# ***** BEGIN LICENSE BLOCK *****
# 
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# 
# Copyright (C) 2010-2013, 2016 Matthew Turnbull <sparky@bluefang-logic.com>. All Rights Reserved.
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

XRSDK      = $(shell $(LS) -d /opt/mozilla/firefox-sdk-* | $(SORT) -V | $(TAIL) -1)
XRSDK_VERS = $(shell $(GREP) "^Milestone=" $(XRSDK)/bin/platform.ini | $(CUT) -d"=" -f2 | $(CUT) -d"." -f1)
TLIB_CACHE = components/cache

NAME       = $(shell $(GREP) "^name=" install.manifest | $(CUT) -d"=" -f2)
VERSION    = $(shell $(GREP) "^version=" install.manifest | $(CUT) -d"=" -f2)
FILES      = $(shell $(GREP) "^files=" install.manifest | $(CUT) -d"=" -f2)
XPT_FILES  = $(patsubst %.idl,%.xpt,$(wildcard components/*.idl))

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
	$(RM) -f xpidl_debug

$(TLIB_CACHE):
	$(MKDIR) $@

%.xpt: %.idl $(TLIB_CACHE)
	$(PY) $(XRSDK)/sdk/bin/typelib.py --cachedir=$(TLIB_CACHE) \
		-I $(XRSDK)/idl -o $*.xpt $*.idl

xpt: $(XPT_FILES)

install.rdf: install.manifest
	./buildInstallRdf

rdf: install.rdf

xpi: xpt rdf
	$(ZIP) -r $(NAME)-$(VERSION).xpi $(FILES) $(XPT_FILES)

