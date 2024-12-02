import * as React from "react";
import { RenderResult, fireEvent, render } from "jest-matrix-react";

import BugReportDialog from "~tchap-web/src/components/views/dialogs/BugReportDialog";
import { flushPromises } from "~tchap-web/test/test-utils";
import SdkConfig from "~tchap-web/src/SdkConfig";

describe("<BugReportDialog>", () => {
    const bugReportUrl = "/bug/report/url";
    const userText = "halo i haz problem";
    const label = "mylabel";
    let sendBugReportSpy: jest.SpyInstance;

    beforeAll(() => {
        SdkConfig.reset(); // in case other tests didn't clean up
        SdkConfig.put({ bug_report_endpoint_url: bugReportUrl });
    });

    afterAll(function () {
        SdkConfig.reset(); // we touch the config, so clean up
    });

    beforeEach(() => {
        // Mocking trick to mock a default export : use requireActual.
        const actual = jest.requireActual("~tchap-web/src/rageshake/submit-rageshake");
        sendBugReportSpy = jest.spyOn(actual, "default").mockResolvedValue(bugReportUrl);
    });

    afterEach(() => {
        sendBugReportSpy.mockRestore();
    });

    const doSendLogs = async (component: RenderResult) => {
        // Note : component.getByX is preferable, and fails nicely if not found.
        // But querySelector is good enough and doesn't need to change the prod code.
        const button = component.container.querySelector(".mx_BugReportDialog_send_logs button");
        expect(button).toBeTruthy(); // button should be found
        fireEvent.click(button!);
        await flushPromises(); // needed to run through all the chained promises in BugReportDialog.onSubmit
    };

    it("should render as expected", async () => {
        const component = render(<BugReportDialog initialText={userText} label={label} onFinished={() => {}} />);
        expect(component).toMatchSnapshot();
    });

    it("sends the bug report", async () => {
        // userText passed as prop. We don't test the user actually filling the textbox.
        const component = render(<BugReportDialog initialText={userText} label={label} onFinished={() => {}} />);

        await doSendLogs(component);

        expect(sendBugReportSpy).toHaveBeenCalledWith(
            bugReportUrl,
            expect.objectContaining({
                progressCallback: expect.any(Function),
                labels: [label],
                userText: expect.stringContaining(userText),
                sendLogs: true,
            }),
        );
    });

    it("does not send the bug report if no userText", async () => {
        // No userText passed as prop.
        const component = render(<BugReportDialog initialText="" label={label} onFinished={() => {}} />);

        await doSendLogs(component);

        expect(sendBugReportSpy).not.toHaveBeenCalled();
        // Error should be displayed. We don't test the error text to allow flexibility if we change it.
        const error = component.container.querySelector(".error");
        expect(error).toBeTruthy(); // error should be found
    });

    it("adds voip fields in case of voip report", async () => {
        // We don't mock TchapUtils.isCurrentlyUsingBluetooth(), so it returns false.

        const component = render(
            <BugReportDialog initialText={userText} label="voip-feedback" onFinished={() => {}} />,
        );

        await doSendLogs(component);

        expect(sendBugReportSpy).toHaveBeenCalledWith(
            bugReportUrl,
            expect.objectContaining({
                labels: expect.arrayContaining(["voip-feedback"]),
                customFields: expect.objectContaining({ context: "voip", audio_input: "device" }),
            }),
        );
    });
});
