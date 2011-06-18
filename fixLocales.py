#!/usr/bin/python

import re
import os
import codecs
import magic

reReturn = re.compile("\r")
reNewLine = re.compile("\n+")
rePROPComment = re.compile("^\s*#.*\n*", re.M)
reDTDComment = re.compile("[^\S\n]*<!--.*?-->\s*?\n*", re.S)

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
# Process a file. Read it, strip blank lines and comments, then write it.
#
def processFile(filename):
	contents = readFile(filename)

	contents = reReturn.sub("\n", contents)
	contents = reNewLine.sub("\n", contents)

	if filename.endswith(".dtd"):
		contents = reDTDComment.sub("", contents)
	elif filename.endswith(".properties"):
		contents = rePROPComment.sub("", contents)

	writeFile(filename, contents)

#
# Walk though the local directory, processing DTD and property files.
#
def processL10N():
	for root, dirs, files in os.walk("chrome/locale"):
		if os.path.basename(root) == "locale":
			for exclusion in excludeLocals:
				dirs.remove(exclusion)
			dirs.sort()
			continue;

		print "Locale %s" % os.path.basename(root)

		files.sort()
		for filename in files:
			processFile(os.path.join(root, filename))

if __name__ == "__main__":
	processL10N()

