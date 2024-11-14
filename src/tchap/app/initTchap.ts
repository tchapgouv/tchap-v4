import defaultDispatcher from "~tchap-web/src/dispatcher/dispatcher";
import { ActionPayload } from "~tchap-web/src/dispatcher/payloads";
import PlatformPeg from "~tchap-web/src/PlatformPeg";

import TchapVersionManagement from "../util/TchapVersionManagement";
import TchapUserSettings from "../util/TchapUserSettings";
import TchapUIFeature from "../util/TchapUIFeature";
import ExpiredAccountHandler from "../lib/ExpiredAccountHandler";
/**
 * @deprecated
 * Determine weither the app needs a clearCacheAndReload after loading. We do it when upgrading from v2 to v4, to avoid weird keys bugs.
 * @returns Promise(true) if a refresh is needed, Promise(false) in other cases
 */
export async function needsRefreshForVersion4(): Promise<boolean> {
    //check if the feature is activated
    if (!TchapUIFeature.activateClearCacheAndReloadAtVersion4) {
        return false;
    }

    let indexedDB;
    try {
        indexedDB = window.indexedDB;
    } catch (e) {}

    if (!indexedDB) {
        //not sure why it could happen, do not refresh in this case (safety first, avoid creating an infinite clearCacheAndReload loop !)
        return false;
    }

    // Read version of tchap app in localstorage
    // if it is strictly less to version 4.x.y, do refresh
    if (TchapVersionManagement.getAppVersion()) {
        const previousAppVersion: string = TchapVersionManagement.getAppVersion();
        const previousAppMajorVersion: number = parseInt(previousAppVersion.charAt(0), 10);
        return !isNaN(previousAppMajorVersion) && previousAppMajorVersion < 4;
    }

    // If there is no tchap app version, it could be that this is a first install of tchap, or that saving the version has failed in the past, or
    // that the previous install of tchap was before v4. We only want to refresh when we are upgrading v2->v4.
    try {
        // Read version of matrix-js-sdk:riot-web-sync, if it is lower than version 4, refresh is needed.
        // Note : version 4 of the store happens to coincide with tchap-web v4, but it's unrelated.
        const previousStoreVersion: number = await TchapVersionManagement.getStoreVersion(
            indexedDB,
            TchapVersionManagement.SYNC_STORE_NAME,
        );
        return previousStoreVersion < 4;
    } catch (error) {
        // Do not refresh (safety first, avoid creating an infinite clearCacheAndReload loop !)
        console.warn(error);
        return false;
    }
}

/**
 * Force refresh after the client has started
 */
export function queueClearCacheAndReload() {
    const clearCacheAndReloadId = defaultDispatcher.register((payload: ActionPayload) => {
        if (payload.action === "client_started") {
            //unregister callback once the work is done
            defaultDispatcher.unregister(clearCacheAndReloadId);
            //:tchap: use localstorage instead of matric idDB ?
            TchapVersionManagement.clearCacheAndReload();
        }
    });
}

/**
 * Save app version to localstorage after the client has started
 */
export function queueOverideUserSettings() {
    const saveVersionId = defaultDispatcher.register((payload: ActionPayload) => {
        if (payload.action === "client_started") {
            //override user settings
            TchapUserSettings.override();

            //unregister callback once the work is done
            defaultDispatcher.unregister(saveVersionId);
        }
    });
}

export function saveAppVersionInLocalStorage() {
    //:tchap: keep initialising so that we can show any possible error with as many features (theme, i18n) as possible
    TchapVersionManagement.saveAppVersion(PlatformPeg.get());
    //end
}

export function registerExpiredAccountListener() {
    ExpiredAccountHandler.register();
}

export default {
    registerExpiredAccountListener,
    saveAppVersionInLocalStorage,
    queueOverideUserSettings,
    queueClearCacheAndReload,
    needsRefreshForVersion4
}