/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import "../../../../../res/css/views/elements/ContentScanningStatus.pcss";

import React, { useState } from "react";
import TextWithTooltip from "~tchap-web/src/components/views/elements/TextWithTooltip";
import { _t } from "~tchap-web/src/languageHandler";
import SettingsStore from "~tchap-web/src/settings/SettingsStore";

interface ContentScanningStatusProps {
    fileName?: string;
    status: "scanning" | "unsafe" | "done" | "error";
}

/**
 * Display the content scanning status and a tooltip with the filename.
 */
export const ContentScanningStatus: React.FC<ContentScanningStatusProps> = (props: ContentScanningStatusProps) => {
    const [theme, setTheme] = useState(SettingsStore.getValue("theme"));

    SettingsStore.watchSetting("theme", null, (...[, , , value]) => {
        setTheme(value);
    });

    if (props.status === "scanning") {
        return (
            <div>
                <TextWithTooltip class={`mx_ContentScanningStatus mx_ContentScanningStatus_scanning mx_ContentScanningStatus_scanning--${theme}`} tooltip={props.fileName}>
                    {_t("Scanning")}
                </TextWithTooltip>
            </div>
        );
    }

    if (props.status === "unsafe") {
        return (
            <div>
                <TextWithTooltip class="mx_ContentScanningStatus mx_ContentScanningStatus_unsafe" tooltip={props.fileName}>
                    {_t("Content blocked")}
                </TextWithTooltip>
            </div>
        );
    }

    if (props.status === "error") {
        return (
            <div>
                <TextWithTooltip class="mx_ContentScanningStatus mx_ContentScanningStatus_error" tooltip={props.fileName}>
                    {_t("Scan unavailable")}
                </TextWithTooltip>
            </div>
        );
    }

    return <div className={`mx_ContentScanningStatus mx_ContentScanningStatus_done mx_ContentScanningStatus_done--${theme}`}>{_t("Trusted")}</div>;
};
