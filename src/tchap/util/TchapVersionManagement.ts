import BasePlatform from "~tchap-web/src/BasePlatform";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import PlatformPeg from "~tchap-web/src/PlatformPeg";

export default class TchapVersionManagement {
    static SYNC_STORE_NAME = "matrix-js-sdk:riot-web-sync";

    /**
     * replicate the behaviour of the button Clear Cache and Reload, and clear browser cache on firefox
     * https://github.com/matrix-org/~tchap-web/blob/3c5c2bef6dbac51ce6e1864056523815ca4c38d9/src/components/views/settings/tabs/user/HelpUserSettingsTab.tsx#L308
     * @returns nothing
     */
    public static clearCacheAndReload(): void {
        console.log(":TCHAP: clearCacheAndReload");

        if (!PlatformPeg.get()) return;

        MatrixClientPeg.get().stopClient();
        MatrixClientPeg.get()
            .store.deleteAllData()
            .then(() => {
                // The bool parameter of reload() works only in firefox, but most of our users use firefox.
                // @ts-expect-error: reload has no official parameter
                window.location.reload(true);
            });
    }

    /**
     * Retrieve the version of the store
     * inspired of https://github.com/matrix-org/matrix-js-sdk/blob/aa5a34948aac9795c4fe4d3c8f6c6ead04b58b61/src/indexeddb-helpers.ts#L25
     * @param indexedDB indexedDB object
     * @param dbName name of the store
     * @returns Promise of a version
     */
    public static getStoreVersion(indexedDB: IDBFactory, dbName: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            let exists = true;
            const req = indexedDB.open(dbName);
            req.onupgradeneeded = () => {
                // Since we did not provide an explicit version when opening, this event
                // should only fire if the DB did not exist before at any version.
                exists = false;
            };
            req.onblocked = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                const version: number = db.version;
                db.close();
                if (!exists) {
                    // The DB did not exist before, but has been created as part of this
                    // existence check. Delete it now to restore previous state. Delete can
                    // actually take a while to complete in some browsers, so don't wait for
                    // it. This won't block future open calls that a store might issue next to
                    // properly set up the DB.
                    indexedDB.deleteDatabase(dbName);
                    reject("db did not exists");
                }
                resolve(version);
            };
            req.onerror = (ev) => reject(req.error);
        });
    }

    static VERSION_APP_KEY = "tchap_app_version";

    /**
     * Save app version in local storage
     * ie : tchap_app_version = 4.0.5_1.11.10 (no "v" in front !)
     * @param platform initiated platform
     */
    public static async saveAppVersion(platform: BasePlatform) {
        const localStorage = window.localStorage;
        if (localStorage) {
            const version: string = await platform.getAppVersion();
            localStorage.setItem(TchapVersionManagement.VERSION_APP_KEY, version);
        }
    }

    /**
     * returns app version stored in local storage
     * @returns string, app version in semver form : 4.0.5_1.11.10. Null if not found.
     */
    public static getAppVersion(): string {
        const localStorage = window.localStorage;
        if (localStorage) {
            return localStorage && localStorage.getItem(TchapVersionManagement.VERSION_APP_KEY);
        } else {
            return null;
        }
    }
}
