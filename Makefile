BUILDDIR = public
INDEX = index.html
SRC = src
ASSETS = assets
SRCS = $(SRC) $(ASSETS)

$(BUILDDIR):
	mkdir -p $@

clean:
	rm -rf $(BUILDDIR)

release: $(BUILDDIR) $(SRCS)
	cp -f $(INDEX) $(BUILDDIR)
	cp -rf  $(SRCS) $(BUILDDIR)

web: $(SRCS)
	cp $(SRC)/*.js ~/web/assets/js/l-systems
	cp $(ASSETS)/css/l-systems.css ~/web/assets/css/l-systems.css

serve:
	python -m http.server --bind 127.0.0.1 -d . 8080 & export HTTP_SERVER_PID=$$!; uv run reload.py; kill $${HTTP_SERVER_PID}
