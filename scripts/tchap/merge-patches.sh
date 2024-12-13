#!/bin/bash

set -e
# it is better to run this script with docker image
# docker run -ti -v "$(pwd):/home/node" node:16 /bin/bash
# yarn install must be executed to have yarn patch-package working

# usage

# try to merge all patches
# bash ./scripts/merge-patches.sh merge

# fix conflicts on one patch, After the conflict is solved, run again
# bash ./scripts/merge-patches.sh continue <absolute_path>/tchap-web-v4/patches_temp/PATCH_NAME

# Alternatively you can try to merge only one patch
# bash ./scripts/merge-patches.sh merge <absolute_path>/tchap-web-v4/patches/PATCH_NAME/PATCH_FILE.patch


# Variables
PROJECT_DIR=$(pwd)
PACKAGE_JSON="$PROJECT_DIR/package.json"
PATCHES_DIR="$PROJECT_DIR/patches"
TEMP_DIR="$PROJECT_DIR/patches_temp"


function merge_patches() {
  CONFLICTS_FOUND=false
  # Subfunction to merge one patch
  function merge_one_patch() {
      local PATCH_PATH=$1
      local PATCH_DIR=$(basename "$(dirname "$PATCH_PATH")")
      local PATCH_FILE=$(basename $PATCH_PATH)
      local PACKAGE_NAME=$(echo "$PATCH_FILE" | cut -d'+' -f1)
      local PACKAGE_VERSION=$(python -c "import json; f = open('$PACKAGE_JSON'); data = json.load(f); f.close(); print(data['dependencies'].get('$PACKAGE_NAME', 'null'))")
      echo "# Manage $PATCH_PATH"

      # Check if the package version exists and if the patch needs to be updated
      # TODO : it would be better to keep patch even if the package version does not match to avoid unecessay patches commits
      # EDIT : in github PR, the files appear as renamed without modifications
      if [ "$PACKAGE_VERSION" == "null" ] || [[ "$PATCH_FILE" =~ "$PACKAGE_NAME+$PACKAGE_VERSION".patch ]]; then
        echo "Package '$PACKAGE_NAME' not found in package.json or patch already up-to-date. Skipping patch update."
        echo ""
        return
      fi

      # Create a subfolder for the current package inside the temporary directory
      PACKAGE_TEMP_DIR="$TEMP_DIR/$PATCH_DIR"
      if [ -d "$PACKAGE_TEMP_DIR" ]; then
        echo "$PACKAGE_TEMP_DIR already exist, skipping patch update. Remove it to regenerate."
        echo ""
        return
      fi

      mkdir -p "$PACKAGE_TEMP_DIR"
      LOG_FILE="$PACKAGE_TEMP_DIR".log

      # Install the package in the package subfolder
      cd "$PACKAGE_TEMP_DIR"
      echo '{ }' > package.json
      yarn add "$PACKAGE_NAME@$PACKAGE_VERSION" >> $LOG_FILE 2>&1
      yarn add patch-package <> $LOG_FILE 2>&1

      # Apply the patch with --merge option
      patch -p1 --no-backup-if-mismatch --input="$PATCH_PATH" --forward --merge 2>&1 >> $LOG_FILE || true

      # Check for conflicts
      CONFLICTS=$(grep -lr "<<<<<<<" node_modules/"$PACKAGE_NAME") || true

      # If there are conflicts, inform the user
      if [ -n "$CONFLICTS" ]; then
        echo "There were conflicts when applying the patch to $PACKAGE_NAME@$PACKAGE_VERSION."
        echo "Resolve the conflicts manually and run the script again with the 'continue' command."
        echo "Conflicted files:"
        echo "$CONFLICTS"
        CONFLICTS_FOUND=true
      else
        # If there are no conflicts, generate a new patch file
        # TODO : would it be nicer if we don't generate a new patch, but keep the old one to avoid unnecessary patches commit
        # EDIT : in github PR, the files appear as renamed without modifications
        yarn patch-package "$PACKAGE_NAME" >> $LOG_FILE 2>&1

        # Move the new patch file to the old patch file's location
        mv patches/*.patch "$(dirname $PATCH_PATH)"
        rm $PATCH_PATH

        # Clean up the package subfolder
        cd "$TEMP_DIR"
        rm -rf "$PATCH_DIR"
        echo "Patch migrated automatically and temp file cleaned"
      fi
      echo ""
  }

  # Check if a specific patch file was passed as an argument
  if [ -n "$1" ]; then
    merge_one_patch $1
  else
    # Iterate through the patch files
    for PATCH_PATH in "$PATCHES_DIR"/*/*.patch; do
      merge_one_patch "$PATCH_PATH"
    done
  fi

  if [ "$CONFLICTS_FOUND" = false ]; then
    echo "All patches have been updated without conflicts."
    clean_temp_dir
  else
    echo "Some patches have conflicts. After resolving the conflicts, run the script again with the 'continue' command."
  fi
}

function continue_patches() {
  CONFLICTS_FOUND=false

  # Subfunction to apply the patch for a specific package in a temporary directory
  function apply_patch() {
    local PACKAGE_TEMP_DIR=$1
    local PATCH_DIR="$PATCHES_DIR/$(basename "$PACKAGE_TEMP_DIR")"
    local PATCH_PATH="$PATCH_DIR"/*.patch
    local PATCH_FILE=$(basename $PATCH_PATH)
    local PACKAGE_NAME=$(echo "$PATCH_FILE" | cut -d'+' -f1)
    local LOG_FILE="$PACKAGE_TEMP_DIR".log
    local PACKAGE_VERSION=$(python -c "import json; f = open('$PACKAGE_JSON'); data = json.load(f); f.close(); print(data['dependencies'].get('$PACKAGE_NAME', 'null'))")
    echo "# Manage $PATCH_PATH"
    echo "PACKAGE_NAME=$PACKAGE_NAME"
    echo "PACKAGE_TEMP_DIR=$PACKAGE_TEMP_DIR"

    # Check for conflicts
    local CONFLICTS=$(grep -lr "<<<<<<<" "$PACKAGE_TEMP_DIR/node_modules/$PACKAGE_NAME") || true

    # If there are conflicts, inform the user
    if [ -n "$CONFLICTS" ]; then
      echo "There are still conflicts in the patch for $PACKAGE_NAME."
      echo "Resolve the conflicts manually and run the script again with the 'continue' command."
      echo "Conflicted files:"
      echo "$CONFLICTS"
      CONFLICTS_FOUND=true
    else
      # If there are no conflicts, generate a new patch file
      cd "$PACKAGE_TEMP_DIR"
      yarn patch-package "$PACKAGE_NAME" 2>&1 >> $LOG_FILE || true

      # Move the new patch file to the old patch file's location; edit copy instead
      cp patches/*.patch "$PATCH_DIR"
      #cp patches/*.patch "$PATCH_DIR"
      #rm $PATCH_PATH

      OLD="3.79.0" # todo

      # Setup the git rename properly. Also keep the old version of the patch for review.
      mv "$PATCH_DIR/$PACKAGE_NAME+$PACKAGE_VERSION.patch" "$PACKAGE_NAME+$PACKAGE_VERSION.patch"
      cp $PATCH_DIR/$PACKAGE_NAME+$OLD.patch $PATCH_DIR/$PACKAGE_NAME+$OLD.old.patch
      git mv $PATCH_DIR/$PACKAGE_NAME+$OLD.patch $PATCH_DIR/$PACKAGE_NAME+$PACKAGE_VERSION.patch
      mv $PACKAGE_NAME+$PACKAGE_VERSION.patch $PATCH_DIR/$PACKAGE_NAME+$PACKAGE_VERSION.patch
      git add $PATCH_DIR/$PACKAGE_NAME+$PACKAGE_VERSION.patch

      # Clean up the package subfolder
      cd "$TEMP_DIR"
      #rm -rf "$(basename "$PACKAGE_TEMP_DIR")"
      echo "New patch created"
      echo "it copied to $PATCH_DIR, please check the new patch and delete the old one"
      echo "then delete the temp folder $PACKAGE_TEMP_DIR"
    fi
  }

  # Check if a specific temporary directory was passed as an argument
  if [ -n "$1" ]; then
    apply_patch "$1"
  else
    # Iterate through the package subfolders
    for PACKAGE_TEMP_DIR in "$TEMP_DIR"/*; do
      if [ ! -d $PACKAGE_TEMP_DIR ]; then
        continue
      fi
      apply_patch "$PACKAGE_TEMP_DIR"
    done
  fi

  if [ "$CONFLICTS_FOUND" = false ]; then
    # bug here, this condition can be true if we work only with one patch but there is more to fix
    echo "All patches have been updated successfully."
    # Remove the temporary directory
    cd "$PROJECT_DIR"
    # clean_temp_dir
  else
    echo "Some patches still have conflicts. Resolve them and run the script again with the 'continue' command."
  fi
}

function clean_temp_dir() {
  rm -rf "$TEMP_DIR"
}

# Check the command line argument for "merge", "continue", or "clean" and have a argument
if [[ "$#" -ne 1 && "$#" -ne 2 ]]; then
  echo "Usage: $0 {merge [patch_path]|continue [patch_temp_path]|clean}"
  exit 1
fi

if [ "$1" == "merge" ]; then
  merge_patches $2
elif [ "$1" == "continue" ]; then
  continue_patches $2
elif [ "$1" == "clean" ]; then
  clean_temp_dir
else
  echo "Invalid command. Usage: $0 {merge|continue|clean}"
  exit 1
fi

