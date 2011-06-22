#!/usr/bin/python

import re
import os
import codecs
from xml.sax.saxutils import escape

propRE = re.compile(ur"^\s*([a-zA-Z.]+)\s*=\s*(.+?)\s*(#.*)?$")
targetIds = {
	"Firefox": "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
	"SeaMonkey": "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}"
}

def parsePropFile(filename):
	props = {}

	with codecs.open(filename, mode="r", encoding="utf-8") as f:
		for line in f:
			result = propRE.search(line)
			if result:
				props[result.group(1)] = result.group(2)

	return props

def parseL10N(l10nDir):
	langs = {}

	for l10n in os.listdir(l10nDir):
		l10nMeta = os.path.join(l10nDir, l10n, "meta.properties")
		if os.path.isfile(l10nMeta):
			langs[l10n] = parsePropFile(l10nMeta)
		else:
			print "WARNING: could not find %" % l10nMeta

	return langs

def getConfig():
	props = parsePropFile("install.manifest")
	langs = parseL10N("chrome/locale/")

	defaultLocale = langs[props["defaultLocale"]]
	del langs[props["defaultLocale"]]
	del props["defaultLocale"]

	info = {}
	targets = {}

	for prop in props:
			if prop in targetIds:
				v = props[prop].split('|')
				target = {
					"id": targetIds[prop],
					"min": v[0],
					"max": v[1]
				}
				targets[prop] = target
				continue;

			info[prop] = props[prop]

	info["name"] = defaultLocale["name"]
	info["description"] = defaultLocale["description"]

	return (info, targets, langs)

def buildManafest():
	(info, targets, locales) = getConfig()
	f = codecs.open("install.rdf", mode="w", encoding="utf-8")

	#
	# Print the header
	#
	f.write(u"""<?xml version="1.0" encoding="UTF-8"?>
<RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:em="http://www.mozilla.org/2004/em-rdf#">
	<Description about="urn:mozilla:install-manifest">\n""")

	#
	# Print extension info blocks
	#

	f.write(u"""
		<!-- Info -->\n""")

	keys = info.keys()
	keys.sort()
	for prop in keys:
		f.write(u"""
		<em:%s>%s</em:%s>""" % (prop, escape(info[prop]), prop))
	f.write(u"""\n""")

	#
	# Print the locale blocks
	#

	f.write(u"""
		<!-- Localizations -->\n""")

	keys = locales.keys()
	keys.sort()
	for locale in keys:
		l10n = locales[locale]
		for t in l10n["translator"].split(","):
			f.write(u"""
		<em:translator>%s [%s]</em:translator>""" % (escape(t.strip()), locale))
		f.write(u"""
		<em:localized><!-- %s -->
			<Description>
				<em:locale>%s</em:locale>
				<em:name>%s</em:name>
				<em:description>%s</em:description>
				<em:creator>%s</em:creator>
				<em:homepageURL>%s</em:homepageURL>
			</Description>
		</em:localized>\n""" % (locale, locale, escape(l10n["name"]), escape(l10n["description"]), escape(info["creator"]), escape(info["homepageURL"])))

	#
	# Print target blocks
	#

	f.write(u"""
		<!-- Targets -->\n""")

	keys = targets.keys()
	keys.sort()
	for t in keys:
		target = targets[t]
		f.write(u"""
		<em:targetApplication><!-- %s -->
			<Description>
				<em:id>%s</em:id>
				<em:minVersion>%s</em:minVersion>
				<em:maxVersion>%s</em:maxVersion>
			</Description>
		</em:targetApplication>\n""" % (t, target["id"], target["min"], target["max"]))

	#
	# Print the footer
	#

	f.write("""
	</Description>
</RDF>\n""")

if __name__ == "__main__":
	buildManafest()

