import * as React from "react";
import { render, screen } from "jest-matrix-react";
import { mocked } from "jest-mock";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { CallErrorCode, CallState } from "matrix-js-sdk/src/webrtc/call";

import LegacyCallEvent from "~tchap-web/src/components/views/messages/LegacyCallEvent";
import BugReportDialog from "~tchap-web/src/components/views/dialogs/BugReportDialog";
import Modal from "~tchap-web/src/Modal";
import LegacyCallEventGrouper from "~tchap-web/src/components/structures/LegacyCallEventGrouper";

const THEIR_USER_ID = "@them:here";

// Inspired heavily from element's test.
describe("<LegacyCallEvent>", () => {
    let callInviteEvent: Record<string, any>;
    let callEventGrouper: Record<string, any>;

    beforeEach(() => {
        callInviteEvent = {
            sender: {
                userId: THEIR_USER_ID,
            },
        };

        callEventGrouper = {
            addListener: jest.fn(),
            removeListener: jest.fn(),
            invite: jest.fn().mockReturnValue(callInviteEvent),
            isVoice: true,
        };

        Modal.createDialog = jest.fn();
        // @ts-ignore mock (type error because empty return)
        mocked(Modal.createDialog).mockReturnValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const renderEvent = () => {
        return render(
            <LegacyCallEvent
                mxEvent={callInviteEvent as unknown as MatrixEvent}
                callEventGrouper={callEventGrouper as unknown as LegacyCallEventGrouper}
            />,
        );
    };

    it("shows 'Report a problem' button if the call ended cleanly", () => {
        callEventGrouper.state = CallState.Ended;
        callEventGrouper.hangupReason = CallErrorCode.UserHangup;

        const component = renderEvent();

        const button = component.getByRole("button");
        expect(button).toMatchSnapshot(); // note : this does not check presence of icon, because no css.
    });

    it("clicking 'Report a problem' button opens BugReportDialog", () => {
        callEventGrouper.state = CallState.Ended;
        callEventGrouper.hangupReason = CallErrorCode.UserHangup;

        renderEvent();

        screen.getByText("Report a problem").click();
        expect(Modal.createDialog).toHaveBeenCalledWith(BugReportDialog, {
            initialText: "tchap_voip_bug_report_prefill",
            label: "voip-feedback", // important for the rageshake.
        });
    });

    it("does not show 'Report a problem' button in other cases", () => {
        // We're not testing all cases. This is unspecified state+hangupReason.

        renderEvent();

        expect(() => screen.getByText("Report a problem")).toThrow();
        expect(Modal.createDialog).not.toHaveBeenCalled();
    });
});
