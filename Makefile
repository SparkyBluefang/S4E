VERSION := $(shell date +%Y.%m.%d.%H)
XRSDK4 := $(shell pkg-config libxul --variable=sdkdir)
XRSDK6 := $(shell echo "/opt/xulrunner-sdk-6.0")

.DEFAULT_GOAL := release

beta: VERSION := $(VERSION)b
beta: release

release: clean xpt rdf zip

xpt: components/status4evar.idl
	$(XRSDK4)/bin/xpidl -m typelib -w -v -I $(XRSDK4)/idl/ -e components/status4evar_4.xpt components/status4evar.idl
	$(XRSDK6)/bin/xpidl -m typelib -w -v -I $(XRSDK6)/idl/ -e components/status4evar_6.xpt components/status4evar.idl

rdf: install.manifest.in
	sed -e 's|@VERSION@|$(VERSION)|g' < install.manifest.in > install.manifest
	./genManifest.py

zip:
	zip -r status4evar-$(VERSION)-fx.xpi \
		chrome \
		defaults \
		chrome.manifest \
		install.rdf \
		components/status4evar.js \
		components/status4evar_4.xpt \
		components/status4evar_6.xpt

clean:
	rm -f install.manifest
	rm -f install.rdf
	rm -f *.xpi
	rm -f components/*.xpt

