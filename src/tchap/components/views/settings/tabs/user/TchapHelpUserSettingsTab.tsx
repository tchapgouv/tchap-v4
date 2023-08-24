/*
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode } from "react";
import { logger } from "matrix-js-sdk/src/logger";

import AccessibleButton from "matrix-react-sdk/src/components/views/elements/AccessibleButton";
import { _t } from "matrix-react-sdk/src/languageHandler";

import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";
import Modal from "matrix-react-sdk/src/Modal";

import PlatformPeg from "matrix-react-sdk/src/PlatformPeg";
import UpdateCheckButton from "matrix-react-sdk/src/components/views/settings/UpdateCheckButton";
import BugReportDialog from "matrix-react-sdk/src/components/views/dialogs/BugReportDialog";
import CopyableText from "matrix-react-sdk/src/components/views/elements/CopyableText";

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    appVersion: string | null;
    canUpdate: boolean;
}

export default class HelpUserSettingsTab extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            appVersion: null,
            canUpdate: false,
        };
    }

    public componentDidMount(): void {
        PlatformPeg.get()
            ?.getAppVersion()
            .then((ver) => this.setState({ appVersion: ver }))
            .catch((e) => {
                logger.error("Error getting vector version: ", e);
            });
        PlatformPeg.get()
            ?.canSelfUpdate()
            .then((v) => this.setState({ canUpdate: v }))
            .catch((e) => {
                logger.error("Error getting self updatability: ", e);
            });
    }

    private getVersionInfo(): { appVersion: string; olmVersion: string } {
        const brand = SdkConfig.get().brand;
        const appVersion = this.state.appVersion || "unknown";
        const olmVersionTuple = MatrixClientPeg.get().olmVersion;
        const olmVersion = olmVersionTuple
            ? `${olmVersionTuple[0]}.${olmVersionTuple[1]}.${olmVersionTuple[2]}`
            : "<not-enabled>";

        return {
            appVersion: `${_t("%(brand)s version:", { brand })} ${appVersion}`,
            olmVersion: `${_t("Olm version:")} ${olmVersion}`,
        };
    }

    private onClearCacheAndReload = (): void => {
        if (!PlatformPeg.get()) return;

        // Dev note: please keep this log line, it's useful when troubleshooting a MatrixClient suddenly
        // stopping in the middle of the logs.
        logger.log("Clear cache & reload clicked");
        MatrixClientPeg.get().stopClient();
        MatrixClientPeg.get()
            .store.deleteAllData()
            .then(() => {
                PlatformPeg.get()?.reload();
            });
    };

    private onBugReport = (): void => {
        Modal.createDialog(BugReportDialog, {});
    };

    /* :TCHAP: unused
    private onStartBotChat = (): void => {
        this.props.closeSettingsFn();
        createRoom({
            dmUserId: SdkConfig.get("welcome_user_id"),
            andView: true,
        });
    };
    end :TCHAP: */

    private renderLegal(): ReactNode {
        const tocLinks = SdkConfig.get().terms_and_conditions_links;
        if (!tocLinks) return null;

        const legalLinks: JSX.Element[] = [];
        for (const tocEntry of tocLinks) {
            legalLinks.push(
                <div key={tocEntry.url}>
                    <a href={tocEntry.url} rel="noreferrer noopener" target="_blank">
                        {tocEntry.text}
                    </a>
                </div>,
            );
        }

        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{_t("Legal")}</span>
                <div className="mx_SettingsTab_subsectionText">{legalLinks}</div>
            </div>
        );
    }

    private renderCredits(): JSX.Element {
        // Note: This is not translated because it is legal text.
        // Also, &nbsp; is ugly but necessary.
        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{_t("Credits")}</span>
                <ul className="mx_SettingsTab_subsectionText">
                    <li>
                        The{" "}
                        <a href="themes/element/img/backgrounds/lake.jpg" rel="noreferrer noopener" target="_blank">
                            default cover photo
                        </a>{" "}
                        is ©&nbsp;
                        <a href="https://www.flickr.com/golan" rel="noreferrer noopener" target="_blank">
                            Jesús Roncero
                        </a>{" "}
                        used under the terms of&nbsp;
                        <a
                            href="https://creativecommons.org/licenses/by-sa/4.0/"
                            rel="noreferrer noopener"
                            target="_blank"
                        >
                            CC-BY-SA 4.0
                        </a>
                        .
                    </li>
                    <li>
                        The{" "}
                        <a href="https://github.com/matrix-org/twemoji-colr" rel="noreferrer noopener" target="_blank">
                            twemoji-colr
                        </a>{" "}
                        font is ©&nbsp;
                        <a href="https://mozilla.org" rel="noreferrer noopener" target="_blank">
                            Mozilla Foundation
                        </a>{" "}
                        used under the terms of&nbsp;
                        <a href="https://www.apache.org/licenses/LICENSE-2.0" rel="noreferrer noopener" target="_blank">
                            Apache 2.0
                        </a>
                        .
                    </li>
                    <li>
                        The{" "}
                        <a href="https://twemoji.twitter.com/" rel="noreferrer noopener" target="_blank">
                            Twemoji
                        </a>{" "}
                        emoji art is ©&nbsp;
                        <a href="https://twemoji.twitter.com/" rel="noreferrer noopener" target="_blank">
                            Twitter, Inc and other contributors
                        </a>{" "}
                        used under the terms of&nbsp;
                        <a
                            href="https://creativecommons.org/licenses/by/4.0/"
                            rel="noreferrer noopener"
                            target="_blank"
                        >
                            CC-BY 4.0
                        </a>
                        .
                    </li>
                </ul>
            </div>
        );
    }

    private getVersionTextToCopy = (): string => {
        const { appVersion, olmVersion } = this.getVersionInfo();
        return `${appVersion}\n${olmVersion}`;
    };

    /* :TCHAP: unused
    private onKeyboardShortcutsClicked = (): void => {
        dis.dispatch<OpenToTabPayload>({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Keyboard,
        });
    };
    end :TCHAP: */

    public render(): React.ReactNode {
        /* :TCHAP: removed this section, replaced by custom section
        const brand = SdkConfig.get().brand;

        let faqText = _t(
            "For help with using %(brand)s, click <a>here</a>.",
            {
                brand,
            },
            {
                a: (sub) => (
                    <a href="https://element.io/help" rel="noreferrer noopener" target="_blank">
                        {sub}
                    </a>
                ),
            },
        );
        if (SdkConfig.get("welcome_user_id") && getCurrentLanguage().startsWith("en")) {
            faqText = (
                <div>
                    {_t(
                        "For help with using %(brand)s, click <a>here</a> or start a chat with our " +
                            "bot using the button below.",
                        {
                            brand,
                        },
                        {
                            a: (sub) => (
                                <a href="https://element.io/help" rel="noreferrer noopener" target="_blank">
                                    {sub}
                                </a>
                            ),
                        },
                    )}
                    <div>
                        <AccessibleButton onClick={this.onStartBotChat} kind="primary">
                            {_t("Chat with %(brand)s Bot", { brand })}
                        </AccessibleButton>
                    </div>
                </div>
            );
        }
        end :TCHAP: */

        let updateButton: JSX.Element | undefined;
        if (this.state.canUpdate) {
            updateButton = <UpdateCheckButton />;
        }

        let bugReportingSection;
        if (SdkConfig.get().bug_report_endpoint_url) {
            bugReportingSection = (
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Bug reporting")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        { /** :TCHAP: add paragraphs, clarify text */ }
                        <p>
                            { _t(
                                "If you've submitted a bug to the Tchap team (via support or GitHub), debug logs can help " +
                                "us track down the problem.",
                            ) }
                        </p>
                        <p>
                            { _t("Debug logs contain application " +
                                "usage data including your username, the IDs or aliases of " +
                                "the rooms you have visited, which UI elements you " +
                                "last interacted with, and the usernames of other users. " +
                                "They do not contain messages.",
                            ) }
                        </p>
                        { /** end :TCHAP: */ }
                    </div>
                    <AccessibleButton onClick={this.onBugReport} kind="primary">
                        {_t("Submit debug logs")}
                    </AccessibleButton>
                    <div className="mx_SettingsTab_subsectionText">
                        {_t(
                            "To report a Matrix-related security issue, please read the Matrix.org " +
                                "<a>Security Disclosure Policy</a>.",
                            {},
                            {
                                a: (sub) => (
                                    <a
                                        href="https://matrix.org/security-disclosure-policy/"
                                        rel="noreferrer noopener"
                                        target="_blank"
                                    >
                                        {sub}
                                    </a>
                                ),
                            },
                        )}
                    </div>
                </div>
            );
        }

        const { appVersion, olmVersion } = this.getVersionInfo();

        // :TCHAP: add Contact us section, proper FAQ section, Known Issues section
        const supportEmail = "support@tchap.beta.gouv.fr";
        const contactSection = (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Contact us") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    {
                        _t(
                            "If you have any difficulties with using Tchap, please contact us by email at <b>%(supportEmail)s</b>",
                            { supportEmail: supportEmail },
                            {
                                "b": (sub) => <b>{ sub }</b>,
                            }
                        )
                    }
                </div>
                <AccessibleButton
                    kind="primary"
                    element="a"
                    href={"mailto:" + supportEmail}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    { _t("Contact us") }
                    <i className='mx_ExternalLink_icon' />
                </AccessibleButton>
            </div>
        );

        const faqUrl = "https://www.tchap.gouv.fr/faq";
        const faqSection = (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Frequently Asked Questions (FAQ)") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    {
                        _t(
                            "We have compiled a list of the questions our users ask the most frequently. Your question may be answered there."
                        )
                    }
                </div>
                <AccessibleButton
                    kind="primary"
                    element="a"
                    href={ faqUrl }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    { _t("Read the FAQ") }
                    <i className='mx_ExternalLink_icon' />
                </AccessibleButton>
            </div>
        );

        const cguUrl = "https://www.tchap.beta.gouv.fr/cgu";
        const cguSection = (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("General Conditions of Use (CGU)") }</span>
                {/* <div className='mx_SettingsTab_subsectionText'>
                    {
                        _t(
                            "We have compiled a list of the questions our users ask the most frequently. Your question may be answered there."
                        )
                    }
                </div> */}
                <AccessibleButton
                    kind="primary"
                    element="a"
                    href={ cguUrl }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    { _t("Read the CGU") }
                    <i className='mx_ExternalLink_icon' />
                </AccessibleButton>
            </div>
        );

        const privacyPolicyUrl = "https://tchap.beta.gouv.fr/politique-de-confidentialite";
        const privacyPolicySection = (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Privacy Policy") }</span>
                {/* <div className='mx_SettingsTab_subsectionText'>
                    {
                        _t(
                            "We have compiled a list of the questions our users ask the most frequently. Your question may be answered there."
                        )
                    }
                </div> */}
                <AccessibleButton
                    kind="primary"
                    element="a"
                    href={ privacyPolicyUrl }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    { _t("Read the Privacy Policy") }
                    <i className='mx_ExternalLink_icon' />
                </AccessibleButton>
            </div>
        );

        const knownIssuesUrl = "https://github.com/tchapgouv/tchap-web-v4/wiki/Nouveau-Tchap-Web";
        const knownIssuesSection = (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Known issues") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    {
                        _t(
                            "This version of Tchap Web is currently in development. There are known issues that will be solved soon."
                        )
                    }
                </div>
                <AccessibleButton
                    kind="primary"
                    element="a"
                    href={ knownIssuesUrl }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    { _t("Read the Known Issues") }
                    <i className='mx_ExternalLink_icon' />
                </AccessibleButton>
            </div>
        );
        // end :TCHAP:

        return (
            <div className="mx_SettingsTab mx_HelpUserSettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Help & About")}</div>
                { /* :TCHAP: added */ contactSection }
                { /* :TCHAP: added */ faqSection }
                { /* :TCHAP: added */ cguSection }
                { /* :TCHAP: added */ privacyPolicySection }
                { /* :TCHAP: moved down the page - bugReportingSection */}
                { /* :TCHAP: replaced by custom faqSection
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("FAQ")}</span>
                    <div className="mx_SettingsTab_subsectionText">{faqText}</div>
                    <AccessibleButton kind="primary" onClick={this.onKeyboardShortcutsClicked}>
                        {_t("Keyboard Shortcuts")}
                    </AccessibleButton>
                </div> */}
                { /* :TCHAP: added */ knownIssuesSection }
                { /* :TCHAP: moved from higher up the page */ bugReportingSection }
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Versions")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        <CopyableText getTextToCopy={this.getVersionTextToCopy}>
                            {appVersion}
                            <br />
                            {olmVersion}
                            <br />
                        </CopyableText>
                        {updateButton}
                    </div>
                </div>
                {this.renderLegal()}
                {this.renderCredits()}
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("Advanced")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        <div>
                            {_t(
                                "Homeserver is <code>%(homeserverUrl)s</code>",
                                {
                                    homeserverUrl: MatrixClientPeg.get().getHomeserverUrl(),
                                },
                                {
                                    code: (sub) => <code>{sub}</code>,
                                },
                            )}
                        </div>
                        <div>
                            {MatrixClientPeg.get().getIdentityServerUrl() &&
                                _t(
                                    "Identity server is <code>%(identityServerUrl)s</code>",
                                    {
                                        identityServerUrl: MatrixClientPeg.get().getIdentityServerUrl(),
                                    },
                                    {
                                        code: (sub) => <code>{sub}</code>,
                                    },
                                )}
                        </div>
                        <details>
                            <summary>{_t("Access Token")}</summary>
                            <b>
                                {_t(
                                    "Your access token gives full access to your account." +
                                        " Do not share it with anyone.",
                                )}
                            </b>
                            <CopyableText getTextToCopy={() => MatrixClientPeg.get().getAccessToken()}>
                                {MatrixClientPeg.get().getAccessToken()}
                            </CopyableText>
                        </details>
                        <AccessibleButton onClick={this.onClearCacheAndReload} kind="danger">
                            {_t("Clear cache and reload")}
                        </AccessibleButton>
                    </div>
                </div>
            </div>
        );
    }
}
