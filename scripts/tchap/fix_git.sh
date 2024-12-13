PATCH_NAME="registration-for-mainlining"
OLD="3.79.0"
NEW="3.81.0"

mv "patches/$PATCH_NAME/matrix-react-sdk+$NEW.patch" "matrix-react-sdk+$NEW.patch"
cp patches/$PATCH_NAME/matrix-react-sdk+$OLD.patch patches/$PATCH_NAME/matrix-react-sdk+$OLD.old.patch
git mv patches/$PATCH_NAME/matrix-react-sdk+$OLD.patch patches/$PATCH_NAME/matrix-react-sdk+$NEW.patch
mv matrix-react-sdk+$NEW.patch patches/$PATCH_NAME/matrix-react-sdk+$NEW.patch
git add patches/$PATCH_NAME/matrix-react-sdk+$NEW.patch
