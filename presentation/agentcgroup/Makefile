.PHONY: install dev build export pdf clean

NPM ?= npm
PDF := slides.pdf

install:
	$(NPM) ci

dev:
	$(NPM) run dev

build:
	$(NPM) run build

$(PDF): slides.md package.json package-lock.json add_page_numbers.py style.css vite.config.ts
	$(NPM) run export

pdf: $(PDF)

export: pdf

clean:
	rm -rf dist slides-export.pdf $(PDF)
