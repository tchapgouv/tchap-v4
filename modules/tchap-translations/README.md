# Tchap Translations - a long story

## What are all these translation files ?

- `tchap_translations.json` : translations for strings that Tchap code adds to the web and react-sdk repos.

- `tchap_translations_removed.json` : strings that tchap modifications have removed from element code. They are listed explicitly because otherwise the translation-checking script will fail (see below).

- `old/tchap_translations_lost.json` : translations that were present in previous versions, but that don't correspond to any existing code now. Many correspond to customisations made in tchap-web v2. Keeping them around in case they're useful.

## The translation-checking script

Call it with `yarn i18n-tchap`. See `scripts/tchap/translations/check-translations.sh` for code.

Based on element's translation-checking tools, but with the added complication that our code for both react-sdk and web is in the web repo (our react-sdk code is in the shape of patches and customisations).

### First phase : `collect-reference-translations.sh`

Collect all the translations from the translations files (tchap's and element's, from web and react-sdk) into a reference translation file.

### Second phase : `crawl-for-translations.sh`

Using matrix-gen-i18n, a tool from element, crawl through the code looking for translation strings, look up their translations in the reference file, and write it all to a file.

### Third phase : compare both files

If all strings in the code have translations, and all translations correspond to strings in the code, the two files (reference file and crawled file) should be the same. If not, fix the code and the tchap translations files until they are.

### Why do we list removed translations ?

`tchap_translations_removed.json` contain strings that our code has removed from the codebase.

If we don't list them, the translation-checking script will fail : it will find translations in element's files, and no corresponding strings in the code. So the script needs to remove them from the reference translation file.
