#!/bin/bash

# Collect translations from tchap's translation files and element's translation file, in both web and react-sdk repos,
# and merge them all together.
# Usage : ./scripts/tchap/translations/collect-reference-translations.sh $REFERENCE_TRANSLATIONS

source scripts/tchap/translations/helpers.sh
mkdir -p `realpath modules/tchap-translations/tmp`
export OUTPUT_FILE=$1

# Convert tchap translations from piped format ("aa|bb|cc") to nested format.
TCHAP_TRANSLATION_FILE=`realpath modules/tchap-translations/tchap_translations.json`
TCHAP_TRANSLATION_NESTED_FILE=`realpath modules/tchap-translations/tmp/tchap_translations_nested.json`
 node scripts/tchap/translations/reformatToNested.js --file=$TCHAP_TRANSLATION_FILE > $TCHAP_TRANSLATION_NESTED_FILE

# Extract EN translations from tchap translations.
TCHAP_TRANSLATION_EN_FILE=`realpath modules/tchap-translations/tmp/tchap_EN.json`
node scripts/tchap/translations/extractENTranslations.js --file=$TCHAP_TRANSLATION_NESTED_FILE > $TCHAP_TRANSLATION_EN_FILE

# Merge element translations from both web and react-sdk repos, into OUTPUT_FILE
export ELEMENT_WEB_TRANSLATION_FILE=`realpath src/i18n/strings/en_EN.json`

# Merge in tchap translations, into OUTPUT_FILE. Tchap values should override element values in case of conflict.
merge_json_files $ELEMENT_WEB_TRANSLATION_FILE $TCHAP_TRANSLATION_EN_FILE $OUTPUT_FILE

# Some keys have been removed from the code by patches. Remove these keys from the reference file.
REMOVED_TRANSLATION_FILE=`realpath modules/tchap-translations/tchap_translations_removed.json`
node scripts/tchap/translations/deleteRemovedTranslations.js --file=$OUTPUT_FILE --toremove=$REMOVED_TRANSLATION_FILE > $OUTPUT_FILE.tmp
mv $OUTPUT_FILE.tmp $OUTPUT_FILE

# Format the file for clean diffing.
format_json_file $OUTPUT_FILE

echo "Reference translations collected : $OUTPUT_FILE"
