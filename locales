#!/usr/bin/python

import sys
import re
import os
import codecs
import magic

mdetect = magic.open(magic.MIME_ENCODING)
mdetect.load()

excludeLocals = ["en-US"]

#
# Read and decode a file. Use the magic module to determin the character encoding.
#
def readFile(filename):
	ftype = mdetect.file(filename)
	print "Reading %s as %s" % (filename, ftype)
	with codecs.open(filename, mode="r", encoding=ftype) as f:
		return f.read();

#
# Write a file as UTF-8.
#
def writeFile(filename, contents):
	with codecs.open(filename, mode="w", encoding="utf-8") as f:
		f.write(contents)

#
# Clean a file. Read it, strip blank lines and comments, then write it.
#
reReturn	= re.compile("\r")
reNewLine	= re.compile("\n+")
rePROPComment	= re.compile("^\s*#.*?\s*\n", re.U | re.M)
reDTDComment	= re.compile("^\s*<!--.*?-->\s*\n", re.U | re.M | re.S)
def cleanFile(filename):
	contents = readFile(filename)

	contents = reReturn.sub("\n", contents)
	contents = reNewLine.sub("\n", contents)

	if filename.endswith(".dtd"):
		contents = reDTDComment.sub("", contents)
	elif filename.endswith(".properties"):
		contents = rePROPComment.sub("", contents)

	writeFile(filename, contents)

#
# Remove a translation from a file
#
rePROPStringStr = "^\s*%s=.*?\s*\n"
reDTDStringStr = "^\s*<!ENTITY %s \".*?\">\s*\n"
def removeString(filename, tString):
	reStr = None
	if filename.endswith(".dtd"):
		reStr = reDTDStringStr % tString
	elif filename.endswith(".properties"):
		reStr = rePROPStringStr % tString

	if reStr:
		contents = readFile(filename)
		reString = re.compile(reStr, re.U | re.M)
		contents = reString.sub("", contents)
		writeFile(filename, contents)

#
# Walk though the local directory, processing DTD and property files.
#
def processL10N(mode, tFile=None, tString=None):
	for root, dirs, files in os.walk("chrome/locale"):
		if os.path.basename(root) == "locale":
			for exclusion in excludeLocals:
				dirs.remove(exclusion)
			dirs.sort()
			continue;

		print "Locale %s" % os.path.basename(root)

		files.sort()

		if mode == "clean":
			for filename in files:
				cleanFile(os.path.join(root, filename))
		elif mode == "remove":
			for filename in files:
				if filename == tFile:
					removeString(os.path.join(root, filename), tString)

if __name__ == "__main__":
	mode = sys.argv[1]
	if mode == "clean":
		processL10N("clean")
	elif mode == "remove":
		processL10N("remove", sys.argv[2], sys.argv[3].replace(".", "\\."))
	else:
		print "Unknown option '%s'" % mode

