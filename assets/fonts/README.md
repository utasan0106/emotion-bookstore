# Japanese webfonts

Shippori Mincho Medium (500), Zen Kaku Gothic New Regular (400) and Medium (500).
Copyright notices and the complete SIL Open Font License 1.1 accompany the fonts.
The upstream notices specify no Reserved Font Names. The subsets retain original
name/license tables. CSS aliases `EB Display` and `EB Reading` select them.

`sources.json` records source URLs, SHA-256 hashes, retrieval date and codepoints
absent from upstream. Original TTFs are not served. Download the recorded source
files into a temporary directory, then run:

```
python3 tools/build-webfonts.py --source-dir ../font-source
python3 tools/build-webfonts.py --check
```

The build requires fontTools and Brotli; neither is a production dependency.
Subsets cover public HTML/JS/JSON text and kana, retain horizontal `palt`, `kern`,
`liga`, `locl`, and use same-origin delivery. No Google/Adobe Fonts request is made.
`font-display:swap` keeps text visible; the home preloads display and regular.

Stage public text before rebuilding (the corpus uses `git ls-files`). Personal
notes, emoji and characters absent upstream, including Zen Kaku Gothic's 鷗, use
the declared system fallback. Rebuild when public copy changes; `--check` rejects
new Japanese subset gaps. This is not a claim of full Japanese character coverage.
