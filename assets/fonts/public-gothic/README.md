# EB Public Gothic: public-delivery subsets

Derived from the official Zen Kaku Gothic New Regular (400) and Bold (700).
Copyright and SIL Open Font License 1.1 are retained in OFL.txt and font metadata.
Only these new font assets are changed; previous font files remain untouched.

## Reproduce offline

Use /usr/bin/python3 with fontTools + Brotli already installed:

    /usr/bin/python3 tools/build-public-gothic-fonts.py --source-dir /path/to/official/ttfs
    /usr/bin/python3 tools/build-public-gothic-fonts.py --check
    /usr/bin/python3 qa/public_gothic_fonts_check.py

For byte-for-byte second-build verification, pass --source-dir to the QA script.
No Git index, network, browser, package installation, clock or random seed is used.
Source TTF and OFL SHA-256 values are pinned in the builder. Font timestamps are
preserved. The CSS family and internal family are EB Public Gothic, normal 400/700.

## Honest coverage contract

corpus-manifest.json enumerates every delivered HTML under .vercelignore (including
public v3 pages), linked runtime JS/JSON/GeoJSON/CSS and the explicit editorial
source list. HTML entities and JS Unicode escapes are decoded. Runtime/source
text is a conservative superset, not a claim of exact visibility. Each input has
its SHA-256, collected codepoints and HTML-visible codepoints. corpus.txt is the
sorted character set; ASCII and upstream-supported kana are retained.

coverage.json provides numeric covered_codepoints for browser glyph audits.
sources.json records upstream cmap, output hashes, sizes, and every upstream-
unsupported character with exact source paths and HTML-visible occurrences.
Zero subset-introduced gaps does NOT mean zero upstream gaps. System fallback is
required for the recorded rare characters/symbols, arbitrary personal notes and
external/future text. No Japanese variant is silently substituted or normalized.

--check fails for stale input/corpus/builder/font hashes, newly unsupported text,
and missing subset glyphs. Rebuild after editorial/source changes, then review
any change in upstreamUnsupported. QA negative fixtures run only in temporary
copies and do not modify site sources or existing font assets.
