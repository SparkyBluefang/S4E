VERSION := $(shell date +%Y.%m.%d.%H)
XRSDK := $(shell pkg-config libxul --variable=sdkdir)

.DEFAULT_GOAL := release

beta: VERSION := $(VERSION)b
beta: release

release: clean xpt rdf zip

xpt: components/status4evar.idl
	$(XRSDK)/bin/xpidl -m typelib -w -v -I $(XRSDK)/idl/ -e components/status4evar.xpt components/status4evar.idl

rdf: install.rdf.in
	sed -e 's|@VERSION@|$(VERSION)|g' < install.rdf.in > install.rdf

zip:
	zip -r status4evar-$(VERSION)-fx.xpi \
		chrome \
		defaults \
		chrome.manifest \
		install.rdf \
		components/status4evar.js \
		components/status4evar.xpt

clean:
	rm -f install.rdf
	rm -f *.xpi
	rm -f components/*.xpt
