VERSION := $(shell grep version install.manifest | sed 's/version=//')
XRSDK8 := $(shell echo "/opt/xulrunner-sdk-8.0")

all: clean xpt rdf zip

clean:
	rm -f install.rdf
	rm -f *.xpi
	rm -f components/*.xpt

xpt: components/status4evar.idl
	$(XRSDK8)/bin/xpidl -m typelib -w -v -I $(XRSDK8)/idl/ -e components/status4evar.xpt components/status4evar.idl

rdf: install.manifest
	./buildInstallRdf

zip:
	zip -r status4evar-$(VERSION)-fx.xpi \
		chrome \
		defaults \
		chrome.manifest \
		install.rdf \
		components/status4evar.js \
		components/status4evar.xpt

