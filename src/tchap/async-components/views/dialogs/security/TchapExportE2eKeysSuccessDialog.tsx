/*
Copyright 2022 DINUM

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

import React from "react";
import BaseDialog from "matrix-react-sdk/src/components/views/dialogs/BaseDialog";
import dis from "matrix-react-sdk/src/dispatcher/dispatcher";
import { _t } from "matrix-react-sdk/src/languageHandler";

import { TchapAnchor } from "../../../../components/views/common/TchapAnchor";
import KeySavedImage from "../../../../../../res/img/tchap/key-saved.svg";
import "../../../../../../res/css/views/dialogs/_TchapExportE2eKeysSuccessDialog.pcss";
import TchapUrls from "../../../../util/TchapUrls";

interface IProps {
    allowLogout: boolean;
    onFinished: (success?: boolean) => void;
}

export default class TchapExportE2eKeysSuccessDialog extends React.Component<IProps> {
    private constructor(props: IProps) {
        super(props);

        this.onClick = this.onClick.bind(this);
    }

    private onClick = (): void => {
        this.props.onFinished(true);

        if (this.props.allowLogout) {
            dis.dispatch({ action: "logout" });
        }
    };

    public render(): React.ReactElement {
        return (
            <BaseDialog
                className="tc_exportE2eKeysSuccessDialog"
                onFinished={this.props.onFinished}
                title={_t("Tchap Keys saved!")}
            >
                <div className="mx_Dialog_content">
                    <div className="tc_exportE2eKeysSuccessDialog_img">
                        <img src={KeySavedImage} alt="Export logo" width="70" />
                    </div>

                    <p className="tc_modalParagraph">
                        {_t(
                            "Your Tchap Keys (encryption keys) have been successful saved " +
                                "in the <b>tchap-keys.txt</b> file. You can import them " +
                                "when you login again to unlock your messages " +
                                "(<a>find out more</a>).",
                            {},
                            {
                                a: (sub) => (
                                    <TchapAnchor
                                        href={TchapUrls.helpManuallyImportKeys}
                                        openInNewTab
                                    >
                                        {sub}
                                    </TchapAnchor>
                                ),
                                b: (sub) => <b>{sub}</b>,
                            },
                        )}
                    </p>
                </div>
                <div className="mx_Dialog_buttons">
                    <button className="mx_Dialog_primary" onClick={this.onClick}>
                        {_t(this.props.allowLogout ? "Sign out" : "action|ok")}
                    </button>
                </div>
            </BaseDialog>
        );
    }
}
