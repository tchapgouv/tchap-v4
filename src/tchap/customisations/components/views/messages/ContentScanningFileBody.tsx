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

import "../../../../../../res/css/views/messages/ContentScanningFileBody.pcss";

import React from "react";
import InlineSpinner from "~tchap-web/src/components/views/elements/InlineSpinner";
import TextWithTooltip from "~tchap-web/src/components/views/elements/TextWithTooltip";
import { IBodyProps } from "~tchap-web/src/components/views/messages/IBodyProps";
import { IMediaEventContent } from "~tchap-web/src/customisations/models/IMediaEventContent";
import { _t } from "~tchap-web/src/languageHandler";
import { presentableTextForFile } from "~tchap-web/src/utils/FileUtils";

import { Media } from "../../../ContentScanningMedia";
import OriginalFileBody from "../../../../components/views/messages/OriginalFileBody";
import { ContentScanningStatus } from "../../../../components/views/elements/ContentScanningStatus";

interface Props extends IBodyProps {
    /* whether or not to show the default placeholder for the file. Defaults to true. */
    showGenericPlaceholder: boolean;
}

interface State {
    isScanning: boolean;
    isSafe: boolean;
    hasError: boolean;
}

/**
 * Content scanning component, that wraps MFileBody from react-sdk.
 * On success it displays the original component (of which a copy exists in this repo).
 */
export default class ContentScanningFileBody extends React.PureComponent<Props, State> {
    public static defaultProps = {
        showGenericPlaceholder: true,
    };

    public constructor(props: Props) {
        super(props);
        this.state = {
            isScanning: true,
            isSafe: false,
            hasError: false,
        };

        Promise.all([this.media.scanSource(), this.media.scanThumbnail()])
            .then(([ok1, ok2]) => {
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
            return <span className="mx_MFileBody mx_MFileBody_scanning">{this.placeholder}</span>;
        } else if (this.state.hasError) {
            return <span className="mx_MFileBody mx_MFileBody_error">{this.placeholder}</span>;
        } else if (!this.state.isSafe) {
            return <span className="mx_MFileBody mx_MFileBody_unsafe">{this.placeholder}</span>;
        }

        return (
            <div>
                <OriginalFileBody {...this.props} />
                <ContentScanningStatus status="done" />
            </div>
        );
    }

    private get placeholder(): React.ReactNode {
        let placeholder: React.ReactNode;

        if (this.props.showGenericPlaceholder && (this.state.isScanning || !this.state.isSafe)) {
            const presentableFileName = presentableTextForFile(this.content, _t("common|attachment"), true);
            let text: React.ReactNode;

            if (this.state.isScanning) {
                text = <ContentScanningStatus fileName={presentableFileName} status="scanning" />;
            } else if (this.state.hasError) {
                text = <ContentScanningStatus fileName={presentableFileName} status="error" />;
            } else if (!this.state.isSafe) {
                text = <ContentScanningStatus fileName={presentableFileName} status="unsafe" />;
            }

            placeholder = (
                <>
                    <div className="mx_MediaBody mx_MFileBody_info">
                        {this.icon}
                        <TextWithTooltip tooltip={presentableFileName}>
                            <span className="mx_MFileBody_info_filename">
                                {presentableTextForFile(this.content, _t("common|attachment"), true, true)}
                            </span>
                        </TextWithTooltip>
                    </div>
                    {text}
                </>
            );
        }

        return placeholder;
    }

    private get content(): IMediaEventContent {
        return this.props.mxEvent.getContent<IMediaEventContent>();
    }

    private get icon(): React.ReactNode {
        let icon = <span className="mx_MFileBody_info_icon" />;
        if (this.state.isScanning) {
            icon = (
                <span className="mx_MFileBody_info_icon">
                    <InlineSpinner w={20} h={20} />
                </span>
            );
        } else if (this.state.hasError || !this.state.isSafe) {
            icon = <span className="mx_MFileBody_unsafe_icon" />;
        }
        return icon;
    }

    private get media(): Media {
        return this.props.mediaEventHelper.media as any as Media;
    }
}
