#!/bin/bash

# Crawl through the code, find translation strings, find corresponding translations in reference file, and write everything
# to the output file.
# Usage : ./scripts/tchap/translations/crawl-for-translations.sh $REFERENCE_TRANSLATIONS $OUTPUT

source scripts/tchap/translations/helpers.sh

# Usage : crawl repo inputfile outputfile
crawl () {
    # Run the original gen-i18n script from matrix-web-i18n.
    # gen-i18n crawls through the code files in src and res, looking for translations.
    # For each translation key, it finds the values in INPUT_FILE. If no value found, it uses value=key.
    # Then it writes key:value in OUTPUT_FILE.
    export INPUT_FILE=$1 # var read by matrix-gen-i18n, don't rename
    export OUTPUT_FILE=$2 # var read by matrix-gen-i18n, don't rename
    yarn matrix-gen-i18n;
    retVal=$?
    if [ $retVal -ne 0 ]; then
        echo "gen-i18n failed. Aborting."
        exit $retVal
    fi
    # Todo we should probably abort in more places, set it in the script's settings
}


mkdir -p `realpath modules/tchap-translations/tmp`

export REFERENCE_TRANSLATIONS=$1
# Output
export CRAWLED=$2

# Repo web
crawl $REFERENCE_TRANSLATIONS $CRAWLED

# Extra hack : config.json is not crawled by matrix-gen-i18n, so the terms_and_conditions_links are missing. Add them in.
# Get the terms_and_conditions strings from config.json
export TOC_TRANSLATIONS=`realpath modules/tchap-translations/tmp/terms_and_conditions_EN.json`
# Create a config.json if there isn't file
if [[ ! -f config.json ]];
then
    cp config.prod.json config.json
fi
jq '.terms_and_conditions_links[] | { (.text): .text} ' config.json | jq -s add > $TOC_TRANSLATIONS
merge_json_files $TOC_TRANSLATIONS $CRAWLED $CRAWLED

# Format the file for clean diffing.
format_json_file $CRAWLED

echo "Crawled and found these translations : $CRAWLED"
