/*
Copyright 2024 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { logger } from "matrix-js-sdk/src/logger";
import browserlist from "browserslist";
import electronToChromium from "electron-to-chromium/versions";
import PopOutIcon from "@vector-im/compound-design-tokens/assets/web/icons/pop-out";

import { DeviceType, parseUserAgent } from "./utils/device/parseUserAgent";
import ToastStore from "./stores/ToastStore";
import GenericToast from "./components/views/toasts/GenericToast";
import { _t } from "./languageHandler";
import SdkConfig from "./SdkConfig";

export const LOCAL_STORAGE_KEY = "mx_accepts_unsupported_browser";
const TOAST_KEY = "unsupportedbrowser";

const SUPPORTED_DEVICE_TYPES = [DeviceType.Web, DeviceType.Desktop];
const SUPPORTED_BROWSER_QUERY =
    "last 2 Chrome versions, last 2 Firefox versions, last 2 Safari versions, last 2 Edge versions";
const LEARN_MORE_URL = "https://github.com/element-hq/element-web#supported-environments";

function onLearnMoreClick(): void {
    onDismissClick();
    window.open(LEARN_MORE_URL, "_blank", "noopener,noreferrer");
}

function onDismissClick(): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, String(true));
    ToastStore.sharedInstance().dismissToast(TOAST_KEY);
}

function getBrowserNameVersion(browser: string): [name: string, version: number] {
    const [browserName, browserVersion] = browser.split(" ");
    const browserNameLc = browserName.toLowerCase();
    if (browserNameLc === "electron") {
        // The electron-to-chromium map is keyed by the major and minor version of Electron
        const chromiumVersion = electronToChromium[browserVersion.split(".").slice(0, 2).join(".")];
        if (chromiumVersion) {
            return ["chrome", parseInt(chromiumVersion, 10)];
        }
    }

    return [browserNameLc, parseInt(browserVersion, 10)];
}

/**
 * Function to check if the current browser is considered supported by our support policy.
 * Based on user agent parsing so may be inaccurate if the user has fingerprint prevention turned up to 11.
 */
export function getBrowserSupport(): boolean {
    const browsers = browserlist(SUPPORTED_BROWSER_QUERY).sort();
    const minimumBrowserVersions = new Map<string, number>();
    for (const browser of browsers) {
        const [browserName, browserVersion] = getBrowserNameVersion(browser);
        // We sorted the browsers so will encounter the minimum version first
        if (minimumBrowserVersions.has(browserName)) continue;
        minimumBrowserVersions.set(browserName, browserVersion);
    }

    const details = parseUserAgent(navigator.userAgent);

    let supported = true;
    if (!SUPPORTED_DEVICE_TYPES.includes(details.deviceType)) {
        logger.warn("Browser unsupported, unsupported device type", details.deviceType);
        supported = false;
    }

    if (details.client) {
        const [browserName, browserVersion] = getBrowserNameVersion(details.client);
        const minimumVersion = minimumBrowserVersions.get(browserName);
        // Check both with the sub-version cut off and without as some browsers have less granular versioning e.g. Safari
        if (!minimumVersion || browserVersion < minimumVersion) {
            logger.warn("Browser unsupported, unsupported user agent", details.client);
            supported = false;
        }
    } else {
        logger.warn("Browser unsupported, unknown client", navigator.userAgent);
        supported = false;
    }

    return supported;
}

/**
 * Shows a user warning toast if the user's browser is not supported.
 */
export function checkBrowserSupport(): void {
    const supported = getBrowserSupport();
    if (supported) return;

    if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
        logger.warn("Browser unsupported, but user has previously accepted");
        return;
    }

    const brand = SdkConfig.get().brand;
    ToastStore.sharedInstance().addOrReplaceToast({
        key: TOAST_KEY,
        title: _t("unsupported_browser|title", { brand }),
        props: {
            description: _t("unsupported_browser|description", { brand }),
            secondaryLabel: _t("action|learn_more"),
            SecondaryIcon: PopOutIcon,
            onSecondaryClick: onLearnMoreClick,
            primaryLabel: _t("action|dismiss"),
            onPrimaryClick: onDismissClick,
        },
        component: GenericToast,
        priority: 40,
    });
}
