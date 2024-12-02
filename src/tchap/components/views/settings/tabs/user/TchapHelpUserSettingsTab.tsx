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

import AccessibleButton from "~tchap-web/src/components/views/elements/AccessibleButton";
import { _t } from "~tchap-web/src/languageHandler";

import SdkConfig from "~tchap-web/src/SdkConfig";
import Modal from "~tchap-web/src/Modal";

import PlatformPeg from "~tchap-web/src/PlatformPeg";
import UpdateCheckButton from "~tchap-web/src/components/views/settings/UpdateCheckButton";
import BugReportDialog from "~tchap-web/src/components/views/dialogs/BugReportDialog";
import CopyableText from "~tchap-web/src/components/views/elements/CopyableText";
import ExternalLink from "~tchap-web/src/components/views/elements/ExternalLink";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    appVersion: string | null;
    canUpdate: boolean;
}

//Tchap : This class is a replacement (via customizations) for ~tchap-web/src/components/views/settings/tabs/user/HelpUserSettingsTab.tsx
export default class HelpUserSettingsTab extends React.Component<IProps, IState> {
    //those lines instantiate the 'context' which is kind of a singleton for a matrix client
    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

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

    private getVersionInfo(): { appVersion: string; cryptoVersion: string } {
        const brand = SdkConfig.get().brand;
        const appVersion = this.state.appVersion || "unknown";
        const cryptoVersion = this.context.getCrypto()?.getVersion() ?? "<not-enabled>";

        return {
            appVersion: `${_t("setting|help_about|brand_version", { brand })} ${appVersion}`,
            cryptoVersion: `${_t("setting|help_about|crypto_version")} ${cryptoVersion}`,
        };
    }

    private onClearCacheAndReload = (): void => {
        if (!PlatformPeg.get()) return;

        // Dev note: please keep this log line, it's useful when troubleshooting a MatrixClient suddenly
        // stopping in the middle of the logs.
        logger.log("Clear cache & reload clicked");
        this.context.stopClient();
        this.context
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
                    <ExternalLink href={tocEntry.url} target="_blank" rel="noreferrer noopener">
                        {_t(tocEntry.text)}
                    </ExternalLink>
                </div>
            );
        }

        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{_t("common|legal")}</span>
                <div className="mx_SettingsTab_subsectionText">{legalLinks}</div>
            </div>
        );
    }

    private renderCredits(): JSX.Element {
        // Note: This is not translated because it is legal text.
        // Also, &nbsp; is ugly but necessary.
        return (
            <div className="mx_SettingsTab_section">
                <span className="mx_SettingsTab_subheading">{_t("common|credits")}</span>
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
        const { appVersion, cryptoVersion } = this.getVersionInfo();
        return `${appVersion}\n${cryptoVersion}`;
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
                    <span className="mx_SettingsTab_subheading">{_t("bug_reporting|title")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        { /** :TCHAP: add paragraphs, clarify text */ }
                        <p>
                            { _t(
                                "If you've submitted a bug to the Tchap team (via support or GitHub), debug logs can help " +
                                "us track down the problem.",
                            ) }
                        </p>
                        <p>
                            { _t("bug_reporting|description") }
                        </p>
                        { /** end :TCHAP: */ }
                    </div>
                    <AccessibleButton onClick={this.onBugReport} kind="primary">
                        {_t("bug_reporting|submit_debug_logs")}
                    </AccessibleButton>
                    <div className="mx_SettingsTab_subsectionText">
                        {_t(
                            "bug_reporting|matrix_security_issue",
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

        const { appVersion, cryptoVersion } = this.getVersionInfo();

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
                <div className="mx_SettingsTab_heading">{_t("setting|help_about|title")}</div>
                { /* :TCHAP: added */ contactSection }
                { /* :TCHAP: added */ faqSection }
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
                    <span className="mx_SettingsTab_subheading">{_t("setting|help_about|versions")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        <CopyableText getTextToCopy={this.getVersionTextToCopy}>
                            {appVersion}
                            <br />
                            {cryptoVersion}
                            <br />
                        </CopyableText>
                        {updateButton}
                    </div>
                </div>
                {this.renderLegal()}
                {this.renderCredits()}
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{_t("common|advanced")}</span>
                    <div className="mx_SettingsTab_subsectionText">
                        <div>
                            {_t(
                                "setting|help_about|homeserver",
                                {
                                    homeserverUrl: this.context.getHomeserverUrl(),
                                },
                                {
                                    code: (sub) => <code>{sub}</code>,
                                },
                            )}
                        </div>
                        <div>
                            {this.context.getIdentityServerUrl() &&
                                _t(
                                    "setting|help_about|identity_server",
                                    {
                                        identityServerUrl: this.context.getIdentityServerUrl(),
                                    },
                                    {
                                        code: (sub) => <code>{sub}</code>,
                                    },
                                )}
                        </div>
                        <details>
                            <summary>{_t("common|access_token")}</summary>
                            <b>
                                {_t(
                                    "setting|help_about|access_token_detail",
                                )}
                            </b>
                            <CopyableText getTextToCopy={() => this.context.getAccessToken()}>
                                {this.context.getAccessToken()}
                            </CopyableText>
                        </details>
                        <AccessibleButton onClick={this.onClearCacheAndReload} kind="danger">
                            {_t("setting|help_about|clear_cache_reload")}
                        </AccessibleButton>
                    </div>
                </div>
            </div>
        );
    }
}
