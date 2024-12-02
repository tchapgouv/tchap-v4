import { mocked, MockedObject } from "jest-mock";
import { HttpApiEvent, MatrixClient } from "matrix-js-sdk/src/matrix";

import ExpiredAccountDialog from "~tchap-web/src/tchap/components/views/dialogs/ExpiredAccountDialog";
import ExpiredAccountHandler from "~tchap-web/src/tchap/lib/ExpiredAccountHandler";
import Modal from "~tchap-web/src/Modal";
import defaultDispatcher from "~tchap-web/src/dispatcher/dispatcher";
import { getMockClientWithEventEmitter } from "~tchap-web/test/test-utils";

describe("ExpiredAccountHandler", () => {
    let mockClient: MockedObject<MatrixClient>;

    beforeEach(() => {
        Modal.createDialog = jest.fn();
        // @ts-ignore mock (type error because empty return)
        mocked(Modal.createDialog).mockReturnValue({});

        mockClient = getMockClientWithEventEmitter({
            stopClient: jest.fn(),
            removeAllListeners: jest.fn(),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // TODO : it would be nice to test that our handler is propoerly registered on app load, in src/vector/index.ts
    // Gonna require a lot of mocking...
    it("displays dialog when account is expired", () => {
        // handler instance is created when "import ExpiredAccountHandler" is run.
        ExpiredAccountHandler.register();

        // Simulate start of app, for handler to initialise
        defaultDispatcher.dispatch({ action: "will_start_client" }, true);

        // Simulate expired error
        mockClient.emit(HttpApiEvent.ORG_MATRIX_EXPIRED_ACCOUNT);

        expect(Modal.createDialog).toHaveBeenCalledWith(
            ExpiredAccountDialog,
            {
                onRequestNewEmail: expect.any(Function),
                onFinished: expect.any(Function),
            },
            undefined /* className */,
            false /* isPriorityModal */,
            true /* isStaticModal */,
            { onBeforeClose: expect.any(Function) },
        );
    });
});
