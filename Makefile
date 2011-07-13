VERSION := $(shell grep version install.manifest | sed 's/version=//')
XRSDK5 := $(shell echo "/opt/xulrunner-sdk-5.0")
XRSDK6 := $(shell echo "/opt/xulrunner-sdk-6.0")
XRSDK7 := $(shell echo "/opt/xulrunner-sdk-7.0")

all: clean xpt rdf zip

clean:
	rm -f install.rdf
	rm -f *.xpi
	rm -f components/*.xpt

xpt: components/status4evar.idl
	$(XRSDK5)/bin/xpidl -m typelib -w -v -I $(XRSDK5)/idl/ -e components/status4evar_5.xpt components/status4evar.idl
	$(XRSDK6)/bin/xpidl -m typelib -w -v -I $(XRSDK6)/idl/ -e components/status4evar_6.xpt components/status4evar.idl
	$(XRSDK7)/bin/xpidl -m typelib -w -v -I $(XRSDK7)/idl/ -e components/status4evar_7.xpt components/status4evar.idl

rdf: install.manifest
	./buildInstallRdf

zip:
	zip -r status4evar-$(VERSION)-fx.xpi \
		chrome \
		defaults \
		chrome.manifest \
		install.rdf \
		components/status4evar.js \
		components/status4evar_5.xpt \
		components/status4evar_6.xpt \
		components/status4evar_7.xpt

