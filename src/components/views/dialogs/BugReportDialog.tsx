/*
Copyright 2024 New Vector Ltd.
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2018 New Vector Ltd
Copyright 2017 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";

import SdkConfig from "../../../SdkConfig";
import Modal from "../../../Modal";
import { _t } from "../../../languageHandler";
import sendBugReport, { downloadBugReport } from "../../../rageshake/submit-rageshake";
import AccessibleButton from "../elements/AccessibleButton";
import QuestionDialog from "./QuestionDialog";
import BaseDialog from "./BaseDialog";
import Field from "../elements/Field";
import Spinner from "../elements/Spinner";
import DialogButtons from "../elements/DialogButtons";
import { sendSentryReport } from "../../../sentry";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import TchapUtils from "~tchap-web/src/tchap/util/TchapUtils"; // :TCHAP:
import { getBrowserSupport } from "../../../SupportedBrowser";

interface IProps {
    onFinished: (success: boolean) => void;
    initialText?: string;
    label?: string;
    error?: unknown;
}

interface IState {
    sendLogs: boolean;
    busy: boolean;
    err: string | null;
    issueUrl: string;
    text: string;
    progress: string | null;
    downloadBusy: boolean;
    downloadProgress: string | null;
}

export default class BugReportDialog extends React.Component<IProps, IState> {
    private unmounted: boolean;
    private issueRef: React.RefObject<Field>;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            sendLogs: true,
            busy: false,
            err: null,
            issueUrl: "",
            text: props.initialText || "",
            progress: null,
            downloadBusy: false,
            downloadProgress: null,
        };

        this.unmounted = false;
        this.issueRef = React.createRef();
    }

    public componentDidMount(): void {
        this.unmounted = false;
        this.issueRef.current?.focus();

        // Get all of the extra info dumped to the console when someone is about
        // to send debug logs. Since this is a fire and forget action, we do
        // this when the bug report dialog is opened instead of when we submit
        // logs because we have no signal to know when all of the various
        // components have finished logging. Someone could potentially send logs
        // before we fully dump everything but it's probably unlikely.
        defaultDispatcher.dispatch({
            action: Action.DumpDebugLogs,
        });
    }

    public componentWillUnmount(): void {
        this.unmounted = true;
    }

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private onSubmit = (): void => {
        /* :TCHAP: bug-reporting - do not ask for a github issue
        if ((!this.state.text || !this.state.text.trim()) && (!this.state.issueUrl || !this.state.issueUrl.trim())) {
            this.setState({
                err: _t("bug_reporting|error_empty"),
            });
            return;
        }
        */
        if ((!this.state.text || !this.state.text.trim())) {
            this.setState({
                err: _t("Please tell us what went wrong in the \"Notes\" field."),
            });
            return;
        }
        // end :TCHAP:

        const userText =
            (this.state.text.length > 0 ? this.state.text + "\n\n" : "") +
            "Issue: " +
            (this.state.issueUrl.length > 0 ? this.state.issueUrl : "No issue link given");

        this.setState({ busy: true, progress: null, err: null });
        this.sendProgressCallback(_t("bug_reporting|preparing_logs"));

        // :TCHAP: bug-reporting - add custom fields if it's a voip report
        Promise.resolve().then(() => {
            if (this.props.label !== "voip-feedback") {
                return Promise.resolve({});
            }

            const customFields: Record<string, string> = {};
            customFields.context = "voip";
            return TchapUtils.isCurrentlyUsingBluetooth().then(isCurrentlyUsingBluetooth => {
                customFields.audio_input = isCurrentlyUsingBluetooth ? "headset_bluetooth" : "device";
                return customFields;
            });
        }).then(customFields => {
            return sendBugReport(SdkConfig.get().bug_report_endpoint_url, {
                userText,
                sendLogs: true,
                progressCallback: this.sendProgressCallback,
                labels: this.props.label ? [this.props.label] : [],
                customFields: customFields,
            });
            // end :TCHAP:
        }).then(
            () => {
                if (!this.unmounted) {
                    this.props.onFinished(false);
                    Modal.createDialog(QuestionDialog, {
                        title: _t("bug_reporting|logs_sent"),
                        description: _t("bug_reporting|thank_you"),
                        hasCancelButton: false,
                    });
                }
            },
            (err) => {
                if (!this.unmounted) {
                    this.setState({
                        busy: false,
                        progress: null,
                        err: _t("bug_reporting|failed_send_logs") + `${err.message}`,
                    });
                }
            },
        );

        sendSentryReport(this.state.text, this.state.issueUrl, this.props.error);
    };

    private onDownload = async (): Promise<void> => {
        this.setState({ downloadBusy: true });
        this.downloadProgressCallback(_t("bug_reporting|preparing_download"));

        try {
            await downloadBugReport({
                sendLogs: true,
                progressCallback: this.downloadProgressCallback,
                labels: this.props.label ? [this.props.label] : [],
            });

            this.setState({
                downloadBusy: false,
                downloadProgress: null,
            });
        } catch (err) {
            if (!this.unmounted) {
                this.setState({
                    downloadBusy: false,
                    downloadProgress:
                        _t("bug_reporting|failed_send_logs") + `${err instanceof Error ? err.message : ""}`,
                });
            }
        }
    };

    private onTextChange = (ev: React.FormEvent<HTMLTextAreaElement>): void => {
        this.setState({ text: ev.currentTarget.value });
    };

    private onIssueUrlChange = (ev: React.FormEvent<HTMLInputElement>): void => {
        this.setState({ issueUrl: ev.currentTarget.value });
    };

    private sendProgressCallback = (progress: string): void => {
        if (this.unmounted) {
            return;
        }
        this.setState({ progress });
    };

    private downloadProgressCallback = (downloadProgress: string): void => {
        if (this.unmounted) {
            return;
        }
        this.setState({ downloadProgress });
    };

    public render(): React.ReactNode {
        let error: JSX.Element | undefined;
        if (this.state.err) {
            error = <div className="error">{this.state.err}</div>;
        }

        let progress: JSX.Element | undefined;
        if (this.state.busy) {
            progress = (
                <div className="progress">
                    <Spinner />
                    {this.state.progress} ...
                </div>
            );
        }

        let warning: JSX.Element | undefined;
        if (
            (window.Modernizr && Object.values(window.Modernizr).some((support) => support === false)) ||
            !getBrowserSupport()
        ) {
            warning = (
                <p>
                    <strong>{_t("bug_reporting|unsupported_browser")}</strong>
                </p>
            );
        }

        { /** :TCHAP: bug-reporting - replace with our own dialog */}
        return (
            <BaseDialog
            className="mx_BugReportDialog"
            onFinished={this.onCancel}
            title={_t('Submit debug logs to Tchap support team')}
            contentId="mx_Dialog_content"
        >
            <div className="mx_Dialog_content" id="mx_Dialog_content">
                {warning}
                <p>{_t("bug_reporting|description")}</p>
                <Field
                    className="mx_BugReportDialog_field_input"
                    element="textarea"
                    label={_t("bug_reporting|textarea_label")}
                    rows={5}
                    onChange={this.onTextChange}
                    value={this.state.text}
                    placeholder={_t("bug_reporting|additional_context")}
                />
                {progress}
                {error}
                <div className="mx_BugReportDialog_send_logs">
                    <DialogButtons
                        primaryButton={_t("bug_reporting|send_logs")}
                        onPrimaryButtonClick={this.onSubmit}
                        focus={true}
                        hasCancel={false}
                        disabled={this.state.busy}
                    />
                </div>

                <div className="mx_BugReportDialog_download">
                    <p>
                        { _t("Just want to get your own logs, without sharing them with the Tchap team?") }
                    </p>
                    <DialogButtons
                        primaryButton={_t("bug_reporting|download_logs")}
                        onPrimaryButtonClick={this.onDownload}
                        focus={true}
                        hasCancel={false}
                        disabled={this.state.downloadBusy}
                    />
                    {this.state.downloadProgress && <span>{this.state.downloadProgress} ...</span>}
                </div>
            </div>
        </BaseDialog>
        );
        {/*
        return (
            <BaseDialog
                className="mx_BugReportDialog"
                onFinished={this.onCancel}
                title={_t("bug_reporting|submit_debug_logs")}
                contentId="mx_Dialog_content"
            >
                <div className="mx_Dialog_content" id="mx_Dialog_content">
                    {warning}
                    <p>{_t("bug_reporting|description")}</p>
                    <p>
                        <strong>
                            {_t(
                                "bug_reporting|before_submitting",
                                {},
                                {
                                    a: (sub) => (
                                        <a
                                            target="_blank"
                                            href={SdkConfig.get().feedback.new_issue_url}
                                            rel="noreferrer noopener"
                                        >
                                            {sub}
                                        </a>
                                    ),
                                },
                            )}
                        </strong>
                    </p>

                    <div className="mx_BugReportDialog_download">
                        <AccessibleButton onClick={this.onDownload} kind="link" disabled={this.state.downloadBusy}>
                            {_t("bug_reporting|download_logs")}
                        </AccessibleButton>
                        {this.state.downloadProgress && <span>{this.state.downloadProgress} ...</span>}
                    </div>

                    <Field
                        type="text"
                        className="mx_BugReportDialog_field_input"
                        label={_t("bug_reporting|github_issue")}
                        onChange={this.onIssueUrlChange}
                        value={this.state.issueUrl}
                        placeholder="https://github.com/vector-im/element-web/issues/..."
                        ref={this.issueRef}
                    />
                    <Field
                        className="mx_BugReportDialog_field_input"
                        element="textarea"
                        label={_t("bug_reporting|textarea_label")}
                        rows={5}
                        onChange={this.onTextChange}
                        value={this.state.text}
                        placeholder={_t("bug_reporting|additional_context")}
                    />
                    {progress}
                    {error}
                </div>
                <DialogButtons
                    primaryButton={_t("bug_reporting|send_logs")}
                    onPrimaryButtonClick={this.onSubmit}
                    focus={true}
                    onCancel={this.onCancel}
                    disabled={this.state.busy}
                />
            </BaseDialog>
        );
        end :TCHAP: */}
    }
}
