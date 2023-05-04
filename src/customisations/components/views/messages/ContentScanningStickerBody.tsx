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

import "../../../../../res/css/views/messages/ContentScanningImageBody.pcss";

import React from "react";
import { IBodyProps } from "matrix-react-sdk/src/components/views/messages/IBodyProps";
import Spinner from "matrix-react-sdk/src/components/views/elements/Spinner";
import { IMediaEventContent } from "matrix-react-sdk/src/customisations/models/IMediaEventContent";
import { presentableTextForFile } from "matrix-react-sdk/src/utils/FileUtils";
import { _t } from "matrix-react-sdk/src/languageHandler";

import OriginalImageBody from "../../../../tchap/components/views/messages/OriginalImageBody";
import { Media } from "../../../ContentScanningMedia";
import { BlockedIcon } from "../../../../tchap/components/views/elements/BlockedIcon";
import { ContentScanningStatus } from "../../../../tchap/components/views/elements/ContentScanningStatus";

interface State {
    isScanning: boolean;
    isSafe: boolean;
    hasError: boolean;
}

/**
 * Content scanning component, that wraps MStickerBody from react-sdk.
 * On success it displays the original component (of which a copy exists in this repo).
 */
export default class ContentScanningStickerBody extends React.Component<IBodyProps, State> {
    public constructor(props: IBodyProps) {
        super(props);
        this.state = {
            isScanning: true,
            isSafe: false,
            hasError: false,
        };

        Promise.all([this.media.scanSource(), this.media.scanThumbnail()])
            .then(async ([ok1, ok2]) => {
                const isSafe = ok1 && ok2;
                this.setState({
                    isScanning: false,
                    isSafe,
                });
            })
            .catch(() => {
                this.setState({
                    isScanning: false,
                    hasError: true,
                });
            });
    }

    public render() {
        const content = this.props.mxEvent.getContent<IMediaEventContent>();
        let width = 342;
        let height = 342;

        if (content?.info) {
            width = Math.min(content.info.w || 9999, width);
            height = Math.min(content.info.h || 9999, height);
        }

        if (this.state.isScanning) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_pending" style={{ width, height }}>
                        <Spinner />
                    </div>
                    <ContentScanningStatus fileName={this.fileName} status="scanning" />
                </>
            );
        } else if (this.state.hasError) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_error" style={{ width, height }}>
                        <BlockedIcon className="mx_MImageBody_BlockedIcon" />
                    </div>
                    <ContentScanningStatus fileName={this.fileName} status="error" />
                </>
            );
        } else if (!this.state.isSafe) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_unsafe" style={{ width, height }}>
                        <BlockedIcon className="mx_MImageBody_BlockedIcon" />
                    </div>
                    <ContentScanningStatus fileName={this.fileName} status="unsafe" />
                </>
            );
        }

        return (
            <>
                {this.renderOriginal()}
                <ContentScanningStatus status="done" />
            </>
        );
    }

    protected renderOriginal() {
        return <OriginalImageBody {...this.props} />;
    }

    private get media(): Media {
        return this.props.mediaEventHelper.media as any as Media;
    }

    private get fileName() {
        return presentableTextForFile(this.content, _t("Sticker"), true, false);
    }

    private get content(): IMediaEventContent {
        return this.props.mxEvent.getContent<IMediaEventContent>();
    }
}
