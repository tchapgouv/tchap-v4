/* eslint-disable max-len */
import React from "react";
import { _t } from "~tchap-web/src/languageHandler";
import BaseDialog from "~tchap-web/src/components/views/dialogs/BaseDialog";
import DialogButtons from "~tchap-web/src/components/views/elements/DialogButtons";
import InlineSpinner from "~tchap-web/src/components/views/elements/InlineSpinner";

import TchapUtils from "../../../util/TchapUtils";

interface IProps {
    onFinished(): void;
    onRequestNewEmail(): Promise<any>;
    emailDelaySecs?: number; //delay between 2 emails in seconds, by default 30
}

interface IState {
    emailDelaySecs: number; //delay betwenn 2 emails in seconds, by default 30
    newEmailSentTimestamp: number; //timestamp
    ProcessState: ProcessState;
}

enum ProcessState {
    START,
    SENDING_EMAIL,
    EMAIL_MUST_WAIT,
    EMAIL_SUCCESS,
    EMAIL_FAILURE,
    ACCOUNT_STILL_EXPIRED,
    ACCOUNT_RENEWED,
}
/**
 * ExpiredAccountDialog is displayed when the user account is expired. It can not be canceled until the account is renewed.
 * This panel is exclusively opened by the listener ExpiredAccountHandler
* This component is required when activating the plugin synapse-email-account-validity on the server side:  https://github.com/matrix-org/synapse-email-account-validity
 */
export default class ExpiredAccountDialog extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            newEmailSentTimestamp: 0,
            emailDelaySecs: this.props.emailDelaySecs || 30,
            ProcessState: ProcessState.START,
        };
    }

    //check if an email can be sent of must wait a bit
    private mustWait() {
        return (
            this.state.newEmailSentTimestamp != 0 &&
            Date.now() - this.state.newEmailSentTimestamp < this.state.emailDelaySecs * 1000
        );
    }

    private onOk = async () => {
        if (this.state.ProcessState === ProcessState.ACCOUNT_RENEWED) {
            return this.props.onFinished();
        }

        //check that the account is still expired
        if (await TchapUtils.isAccountExpired()) {
            this.setState({
                ProcessState: ProcessState.ACCOUNT_STILL_EXPIRED,
            });
        } else {
            this.setState({
                ProcessState: ProcessState.ACCOUNT_RENEWED,
            });
        }
    };

    private onRequestEmail = () => {
        //check if user must wait before sending a new email
        if (this.mustWait()) {
            return this.setState({
                ProcessState: ProcessState.EMAIL_MUST_WAIT,
            });
        }

        //send the new email requested
        this.setState({
            ProcessState: ProcessState.SENDING_EMAIL,
        })
        this.props.onRequestNewEmail().then((success) => {
            this.setState({
                newEmailSentTimestamp: success ? Date.now() : this.state.newEmailSentTimestamp,
                ProcessState: success ? ProcessState.EMAIL_SUCCESS : ProcessState.EMAIL_FAILURE,
            });
        });
    };

    render() {
        let titleMessage = _t("The validity period of your account has expired");
        let descriptionMessage = (
            <p>{_t("An email has been sent to you. Click on the link it contains, click below.")}</p>
        );
        let alertMessage = null;
        let requestNewEmailButton = <button onClick={this.onRequestEmail} data-testid="dialog-send-email-button">{_t("Request a renewal email")}</button>;
        let okButtonText = _t("I renewed the validity of my account");

        switch (this.state.ProcessState) {
            case ProcessState.SENDING_EMAIL:
                alertMessage = <InlineSpinner />
                break;
            case ProcessState.EMAIL_MUST_WAIT:
                //don't know which class should decorate this message, it is not really an error
                //its goal is to avoid users to click twice or more on the button and spam themselves
                alertMessage = (
                    <p className="" data-testid="dialog-email-wait-message">
                        {_t("Wait for at least %(wait)s seconds between two emails", { wait: this.state.emailDelaySecs })}
                    </p>
                );
                break;
            case ProcessState.EMAIL_FAILURE:
                alertMessage = (
                    <p className="text-error" data-testid="dialog-email-failure-message">{_t("The email was not sent sucessfully, please retry in a moment")}</p>
                );
                break;
            case ProcessState.EMAIL_SUCCESS:
                alertMessage = <p className="text-success" data-testid="dialog-email-sent-message">{_t("A new email has been sent")}</p>;
                break;
            case ProcessState.ACCOUNT_STILL_EXPIRED:
                alertMessage = (
                    <p className="text-error" data-testid="dialog-account-still-expired-message">
                        {_t(
                            "Your account is still expired, please follow the link in the email you have received to renew it",
                        )}
                    </p>
                );
                break;
            case ProcessState.ACCOUNT_RENEWED:
                titleMessage = _t("Congratulations, your account has been renewed");
                descriptionMessage = <p>{_t("You can refresh the page to continue your conversations")}</p>;
                okButtonText = _t("Reload page");
                alertMessage = null;
                requestNewEmailButton = null;
                break;
            default:
                break;
        }

        return (
            <BaseDialog
                className="mx_QuestionDialog"
                onFinished={this.props.onFinished}
                title={titleMessage}
                contentId="mx_Dialog_content"
                hasCancel={false} //panel does not offer a "close" button
            >
                {alertMessage}
                <div className="mx_Dialog_content" id="mx_Dialog_content">
                    {descriptionMessage}
                </div>
                <DialogButtons
                    primaryButton={okButtonText}
                    hasCancel={false} //panel does not offer a "cancel" button
                    onPrimaryButtonClick={this.onOk}
                >
                    {requestNewEmailButton}
                </DialogButtons>
            </BaseDialog>
        );
    }
}
