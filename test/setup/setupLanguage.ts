/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import fetchMock from "fetch-mock-jest";
<<<<<<< HEAD
import _ from "lodash";
import { setupLanguageMock as reactSetupLanguageMock } from "matrix-react-sdk/test/setup/setupLanguage";
import reactEn from "matrix-react-sdk/src/i18n/strings/en_EN.json"; // :TCHAP: we want to have the sdk translation and element since we might have test for both repo
=======
>>>>>>> v1.11.85

import * as languageHandler from "../../src/languageHandler";
import en from "../../src/i18n/strings/en_EN.json";
<<<<<<< HEAD
=======
import de from "../../src/i18n/strings/de_DE.json";
>>>>>>> v1.11.85

const lv = {
    Save: "Saglabāt",
    room: {
        upload: {
            uploading_multiple_file: {
                one: "Качване на %(filename)s и %(count)s друг",
            },
        },
    },
};

// Fake languages.json containing references to en_EN, de_DE and lv
// en_EN.json
// de_DE.json
// lv.json - mock version with few translations, used to test fallback translation

export function setupLanguageMock() {
    fetchMock
        .get("/i18n/languages.json", {
            en: "en_EN.json",
            de: "de_DE.json",
            lv: "lv.json",
        })
        .get("end:en_EN.json", en)
        .get("end:de_DE.json", de)
        .get("end:lv.json", lv);
}
setupLanguageMock();

languageHandler.setLanguage("en");
languageHandler.setMissingEntryGenerator((key) => key.split("|", 2)[1]);
