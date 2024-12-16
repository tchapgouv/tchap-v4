/*
Copyright 2018-2024 New Vector Ltd.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2017 Vector Creations Ltd
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

<<<<<<< HEAD
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import olmWasmPath from "@matrix-org/olm/olm.wasm";
import Olm from "@matrix-org/olm";
import * as ReactDOM from "react-dom";
=======
import { createRoot } from "react-dom/client";
>>>>>>> v1.11.87
import React, { StrictMode } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import * as languageHandler from "../languageHandler";
import SettingsStore from "../settings/SettingsStore";
import PlatformPeg from "../PlatformPeg";
import SdkConfig from "../SdkConfig";
import { setTheme } from "../theme";
import { ModuleRunner } from "../modules/ModuleRunner";
import MatrixChat from "../components/structures/MatrixChat";
import ElectronPlatform from "./platform/ElectronPlatform";
import PWAPlatform from "./platform/PWAPlatform";
import WebPlatform from "./platform/WebPlatform";
import { initRageshake, initRageshakeStore } from "./rageshakesetup";

export const rageshakePromise = initRageshake();

export function preparePlatform(): void {
    if (window.electron) {
        logger.log("Using Electron platform");
        PlatformPeg.set(new ElectronPlatform());
    } else if (window.matchMedia("(display-mode: standalone)").matches) {
        logger.log("Using PWA platform");
        PlatformPeg.set(new PWAPlatform());
    } else {
        logger.log("Using Web platform");
        PlatformPeg.set(new WebPlatform());
    }
}

export function setupLogStorage(): Promise<void> {
    if (SdkConfig.get().bug_report_endpoint_url) {
        return initRageshakeStore();
    }
    logger.warn("No bug report endpoint set - logs will not be persisted");
    return Promise.resolve();
}

export async function loadConfig(): Promise<void> {
    // XXX: We call this twice, once here and once in MatrixChat as a prop. We call it here to ensure
    // granular settings are loaded correctly and to avoid duplicating the override logic for the theme.
    //
    // Note: this isn't called twice for some wrappers, like the Jitsi wrapper.
    const platformConfig = await PlatformPeg.get()?.getConfig();
    if (platformConfig) {
        SdkConfig.put(platformConfig);
    } else {
        SdkConfig.reset();
    }
}

export function loadOlm(): Promise<void> {
    /* Load Olm. We try the WebAssembly version first, and then the legacy,
     * asm.js version if that fails. For this reason we need to wait for this
     * to finish before continuing to load the rest of the app. In future
     * we could somehow pass a promise down to react-sdk and have it wait on
     * that so olm can be loading in parallel with the rest of the app.
     *
     * We also need to tell the Olm js to look for its wasm file at the same
     * level as index.html. It really should be in the same place as the js,
     * ie. in the bundle directory, but as far as I can tell this is
     * completely impossible with webpack. We do, however, use a hashed
     * filename to avoid caching issues.
     */
    return Olm.init({
        locateFile: () => olmWasmPath,
    })
        .then(() => {
            logger.log("Using WebAssembly Olm");
        })
        .catch((wasmLoadError) => {
            logger.log("Failed to load Olm: trying legacy version", wasmLoadError);
            return new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = "olm_legacy.js"; // XXX: This should be cache-busted too
                s.onload = resolve;
                s.onerror = reject;
                document.body.appendChild(s);
            })
                .then(() => {
                    // Init window.Olm, ie. the one just loaded by the script tag,
                    // not 'Olm' which is still the failed wasm version.
                    return window.Olm.init();
                })
                .then(() => {
                    logger.log("Using legacy Olm");
                })
                .catch((legacyLoadError) => {
                    logger.log("Both WebAssembly and asm.js Olm failed!", legacyLoadError);
                });
        });
}

export async function loadLanguage(): Promise<void> {
    const prefLang = SettingsStore.getValue("language", null, /*excludeDefault=*/ true);
    let langs: string[] = [];

    if (!prefLang) {
        languageHandler.getLanguagesFromBrowser().forEach((l) => {
            langs.push(...languageHandler.getNormalizedLanguageKeys(l));
        });
    } else {
        langs = [prefLang];
    }
    try {
        await languageHandler.setLanguage(langs);
        document.documentElement.setAttribute("lang", languageHandler.getCurrentLanguage());
    } catch (e) {
        logger.error("Unable to set language", e);
    }
}

export async function loadTheme(): Promise<void> {
    return setTheme();
}

export async function loadApp(fragParams: {}): Promise<void> {
    // load app.js async so that its code is not executed immediately and we can catch any exceptions
    const module = await import(
        /* webpackChunkName: "element-web-app" */
        /* webpackPreload: true */
        "./app"
    );
    function setWindowMatrixChat(matrixChat: MatrixChat): void {
        window.matrixChat = matrixChat;
    }
    const app = await module.loadApp(fragParams, setWindowMatrixChat);
    const root = createRoot(document.getElementById("matrixchat")!);
    root.render(app);
}

export async function showError(title: string, messages?: string[]): Promise<void> {
    const { ErrorView } = await import(
        /* webpackChunkName: "error-view" */
        "../async-components/structures/ErrorView"
    );
    const root = createRoot(document.getElementById("matrixchat")!);
    root.render(
        <StrictMode>
            <ErrorView title={title} messages={messages} />
        </StrictMode>,
    );
}

export async function showIncompatibleBrowser(onAccept: () => void): Promise<void> {
    const { UnsupportedBrowserView } = await import(
        /* webpackChunkName: "error-view" */
        "../async-components/structures/ErrorView"
    );
    const root = createRoot(document.getElementById("matrixchat")!);
    root.render(
        <StrictMode>
            <UnsupportedBrowserView onAccept={onAccept} />
        </StrictMode>,
    );
}

export async function loadModules(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - this path is created at runtime and therefore won't exist at typecheck time
    const { INSTALLED_MODULES } = await import("../modules");
    for (const InstalledModule of INSTALLED_MODULES) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - we know the constructor exists even if TypeScript can't be convinced of that
        ModuleRunner.instance.registerModule((api) => new InstalledModule(api));
    }
}

export { _t } from "../languageHandler";

export { extractErrorMessageFromError } from "../components/views/dialogs/ErrorDialog";
