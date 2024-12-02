/*
 * Copyright 2022 New Vector Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import React from "react";
import classNames from "classnames";
import { MediaEventHelper } from "~tchap-web/src/utils/MediaEventHelper";
import { FileDownloader } from "~tchap-web/src/utils/FileDownloader";
import { _t } from "~tchap-web/src/languageHandler";
import Spinner from "~tchap-web/src/components/views/elements/Spinner";
import { RovingAccessibleButton } from "~tchap-web/src/accessibility/RovingTabIndex";
import { Icon as DownloadIcon } from "~tchap-web/res/img/download.svg";

import { Media } from "../../../ContentScanningMedia";
import { BlockedIcon } from "../../../../components/views/elements/BlockedIcon";

enum DownloadState {
    Pristine, // button not cliked, yet
    Scanning, // scan or decryption in progess
    Safe, // content scanner reported safe content
    Untrusted, // content scanner reported untrusted content
    Error, // content scanner error (unavailability etc.)
}

interface IProps {
    mxEvent: MatrixEvent;

    // XXX: It can take a cycle or two for the MessageActionBar to have all the props/setup
    // required to get us a MediaEventHelper, so we use a getter function instead to prod for
    // one.
    mediaEventHelperGet: () => MediaEventHelper;
}

interface IState {
    downloadState: DownloadState;
    blob?: Blob;
}

/**
 * Replacement for the default download action button.
 * Displays content scanning status and prohibits downloading unsafe content.
 */
export default class ContentScanningDownloadActionButton extends React.PureComponent<IProps, IState> {
    private downloader = new FileDownloader();

    public constructor(props: IProps) {
        super(props);

        this.state = {
            downloadState: DownloadState.Pristine,
        };
    }

    private onDownloadClick = async () => {
        if (this.state.downloadState === DownloadState.Scanning) {
            return;
        }

        if (this.state.blob) {
            // Cheat and trigger a download, again.
            return this.doDownload();
        }

        this.setState({
            downloadState: DownloadState.Scanning,
        });

        const media = this.props.mediaEventHelperGet().media as any as Media;
        const safe = await Promise.all([media.scanSource(), media.scanThumbnail()])
            .then(([ok1, ok2]) => {
                const isSafe = ok1 && ok2;
                this.setState({
                    downloadState: isSafe ? DownloadState.Safe : DownloadState.Untrusted,
                });
                return isSafe;
            })
            .catch(() => {
                this.setState({
                    downloadState: DownloadState.Error,
                });
            });

        if (!safe) {
            // do not download unsafe content
            return;
        }

        const blob = await this.props.mediaEventHelperGet().sourceBlob.value;
        this.setState({ blob });
        await this.doDownload();
    };

    private async doDownload() {
        return this.downloader.download({
            blob: this.state.blob,
            name: this.props.mediaEventHelperGet().fileName,
        });
    }

    public render() {
        let icon: React.ReactElement;
        let tooltip: string;
        let hasSpinner = false;

        switch (this.state.downloadState) {
            case DownloadState.Pristine:
            case DownloadState.Safe:
                icon = <DownloadIcon />;
                tooltip = _t("action|download");
                break;
            case DownloadState.Scanning:
                icon = this.renderSpinner();
                hasSpinner = true;
                tooltip = _t("Scanning");
                break;
            case DownloadState.Untrusted:
                icon = this.renderBlockedIcon();
                tooltip = _t("Content blocked");
                break;
            case DownloadState.Error:
                icon = this.renderBlockedIcon();
                tooltip = _t("Scan unavailable");
                break;
        }

        const classes = classNames({
            mx_MessageActionBar_iconButton: true,
            mx_MessageActionBar_downloadButton: true,
            mx_MessageActionBar_downloadSpinnerButton: hasSpinner,
        });

        return (
            <RovingAccessibleButton
                className={classes}
                title={tooltip}
                onClick={this.onDownloadClick}
                disabled={this.disabled}
            >
                {icon}
            </RovingAccessibleButton>
        );
    }

    private renderBlockedIcon(): JSX.Element {
        return <BlockedIcon className="mx_BlockedIcon_messageContext" />;
    }

    private renderSpinner(): JSX.Element {
        return <Spinner w={18} h={18} />;
    }

    private get disabled(): boolean {
        return [DownloadState.Scanning, DownloadState.Error, DownloadState.Untrusted].includes(
            this.state.downloadState,
        );
    }
}
