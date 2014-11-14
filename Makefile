INSTALL_STAMP=.install.stamp

all: install
install: $(INSTALL_STAMP)

$(INSTALL_STAMP):
	npm install
	touch $(INSTALL_STAMP)

serve:
	python -m SimpleHTTPServer 8888

dist:
	npm run dist

deploy:
	npm run deploy

test: test-node test-browser

test-node: install
	@./node_modules/mocha/bin/mocha --require test/init.js test/test.*.js

test-browser: install dist
	@./node_modules/mocha-phantomjs/bin/mocha-phantomjs test/index.html

clean:
	rm -rf node_modules/ $(INSTALL_STAMP)

.PHONY: serve test clean
