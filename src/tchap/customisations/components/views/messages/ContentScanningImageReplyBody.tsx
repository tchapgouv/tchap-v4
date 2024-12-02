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

import React from "react";
import Spinner from "~tchap-web/src/components/views/elements/Spinner";
import { IBodyProps } from "~tchap-web/src/components/views/messages/IBodyProps";
import { IMediaEventContent } from "~tchap-web/src/customisations/models/IMediaEventContent";
import { _t } from "~tchap-web/src/languageHandler";
import { presentableTextForFile } from "~tchap-web/src/utils/FileUtils";

import OriginalImageReplyBody from "../../../../components/views/messages/OriginalImageReplyBody";
import { BlockedIcon } from "../../../../components/views/elements/BlockedIcon";
import { ContentScanningStatus } from "../../../../components/views/elements/ContentScanningStatus";
import { Media } from "../../../ContentScanningMedia";

const FORCED_IMAGE_HEIGHT = 44;

interface State {
    isScanning: boolean;
    isSafe: boolean;
    hasError: boolean;
}

export default class ContentScanningImageReplyBody extends React.PureComponent<IBodyProps, State> {
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
        if (this.state.isScanning) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_pending" style={{ height: FORCED_IMAGE_HEIGHT }}>
                        <Spinner />
                    </div>
                    <ContentScanningStatus fileName={this.fileName} status="scanning" />
                </>
            );
        } else if (this.state.hasError) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_error" style={{ height: FORCED_IMAGE_HEIGHT }}>
                        <BlockedIcon className="mx_MImageBody_BlockedIcon" />
                    </div>
                    <ContentScanningStatus fileName={this.fileName} status="error" />
                </>
            );
        } else if (!this.state.isSafe) {
            return (
                <>
                    <div className="mx_MImageBody mx_MImageBody_unsafe" style={{ height: FORCED_IMAGE_HEIGHT }}>
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
        return <OriginalImageReplyBody {...this.props} />;
    }

    private get media(): Media {
        return this.props.mediaEventHelper.media as any as Media;
    }

    private get fileName() {
        return presentableTextForFile(this.content, _t("common|image"), true, false);
    }

    private get content(): IMediaEventContent {
        return this.props.mxEvent.getContent<IMediaEventContent>();
    }
}
