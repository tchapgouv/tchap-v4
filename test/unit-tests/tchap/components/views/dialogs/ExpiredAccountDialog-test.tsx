import * as React from "react";
import { render, screen, waitFor } from "jest-matrix-react";

import ExpiredAccountDialog from "~tchap-web/src/tchap/components/views/dialogs/ExpiredAccountDialog";
import { flushPromises } from "~tchap-web/test/test-utils";
import TchapUtils from "~tchap-web/src/tchap/util/TchapUtils";

describe("ExpiredAccountDialog", () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    describe("'Send email' button", () => {
        it("sends email when button is clicked", async () => {
            // true = email sent successfully
            const onRequestNewEmailMock = jest.fn().mockResolvedValue(true);

            const component = render(
                <ExpiredAccountDialog onFinished={jest.fn()} onRequestNewEmail={onRequestNewEmailMock} />,
            );
            const sendEmailButton = screen.getByTestId("dialog-send-email-button");
            sendEmailButton.click();

            expect(onRequestNewEmailMock).toHaveBeenCalled();
            // wait spinner is displayed
            await waitFor(() => {
                expect(component.container.querySelector(".mx_InlineSpinner")).toBeTruthy();
            });

            await flushPromises();
            // confirmation message is displayed
            screen.getByTestId("dialog-email-sent-message");
        });

        it("tells user if sending email failed", async () => {
            // false = email sending failed
            const onRequestNewEmailMock = jest.fn().mockResolvedValue(false);

            const component = render(
                <ExpiredAccountDialog onFinished={jest.fn()} onRequestNewEmail={onRequestNewEmailMock} />,
            );
            const sendEmailButton = screen.getByTestId("dialog-send-email-button");
            sendEmailButton.click();

            expect(onRequestNewEmailMock).toHaveBeenCalled();
            // wait spinner is displayed
            await waitFor(() => {
                expect(component.container.querySelector(".mx_InlineSpinner")).toBeTruthy();
            });

            await flushPromises();
            // confirmation message is displayed
            screen.getByTestId("dialog-email-failure-message");
        });

        it("sends only one email when button is clicked twice", async () => {
            // true = email sent successfully
            const onRequestNewEmailMock = jest.fn().mockResolvedValue(true);

            render(<ExpiredAccountDialog onFinished={jest.fn()} onRequestNewEmail={onRequestNewEmailMock} />);
            const sendEmailButton = screen.getByTestId("dialog-send-email-button");

            sendEmailButton.click();
            await flushPromises();
            sendEmailButton.click();
            await flushPromises();
            expect(onRequestNewEmailMock).toHaveBeenCalledTimes(1); // only 1 email sent
            screen.getByTestId("dialog-email-wait-message"); // user notified that they must wait
        });
    });

    describe("'I renewed my account' button", () => {
        it("if the account is renewed, it displays confirmation message, and offers page reload", async () => {
            const onFinishedMock = jest.fn();
            jest.spyOn(TchapUtils, "isAccountExpired").mockResolvedValue(false);

            const component = render(
                <ExpiredAccountDialog onFinished={onFinishedMock} onRequestNewEmail={jest.fn()} />,
            );
            const primaryButton = component.getByTestId("dialog-primary-button");

            // click "I renewed my account"
            expect(primaryButton).toHaveTextContent("I renewed");
            primaryButton.click();
            await flushPromises();

            // Account renewed ! Display confirmation
            component.getByText("your account has been renewed", { exact: false });
            expect(primaryButton).toHaveTextContent("Reload page"); // new button text

            // click "Reload page"
            primaryButton.click();
            expect(onFinishedMock).toHaveBeenCalled(); // onFinish will do the page reload. The actual reload is out of scope here.
        });

        it("if the account is still not renewed, it displays explanation and keeps dialog up", async () => {
            const onFinishedMock = jest.fn();
            jest.spyOn(TchapUtils, "isAccountExpired").mockResolvedValue(true);

            const component = render(
                <ExpiredAccountDialog onFinished={onFinishedMock} onRequestNewEmail={jest.fn()} />,
            );
            const iRenewedButton = component.getByTestId("dialog-primary-button");

            iRenewedButton.click();
            await flushPromises();

            // display unhappy message
            screen.getByTestId("dialog-account-still-expired-message");
            expect(onFinishedMock).not.toHaveBeenCalled();
        });
    });
});
