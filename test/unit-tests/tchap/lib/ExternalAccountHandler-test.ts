import { mocked, MockedObject } from "jest-mock";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import ExternalAccountHandler from "~tchap-web/src/tchap/lib/ExternalAccountHandler";
import Modal from "~tchap-web/src/Modal";
import { getMockClientWithEventEmitter, mockClientMethodsUser } from "~tchap-web/test/test-utils";
import SdkConfig, { ConfigOptions } from "~tchap-web/src/SdkConfig";
import ErrorDialog from "~tchap-web/src/components/views/dialogs/ErrorDialog";
import { _t } from "~tchap-web/src/languageHandler";

describe("ExternalAccountHandler", () => {
    let mockClient: MockedObject<MatrixClient>;

    const userId = "@bob:externes.com";
    const userIdNotExterne = "@bob:test.com";

    beforeEach(() => {
        Modal.createDialog = jest.fn();
        // @ts-ignore mock (type error because empty return)
        mocked(Modal.createDialog).mockReturnValue({});

        const config: ConfigOptions = {
            homeserver_list: [
                {
                    base_url: "https://matrix.dev01.tchap.incubateur.net",
                    server_name: "Agents 1",
                },
                {
                    base_url: "https://matrix.externes.com",
                    server_name: "Externes",
                },
            ],
        };
        SdkConfig.put(config);

        mockClient = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(userId),
            stopClient: jest.fn(),
            removeAllListeners: jest.fn(),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        SdkConfig.reset();
    });

    it("should indicate the user as external", () => {
        const isExternal = ExternalAccountHandler.isUserExternal(mockClient);
        expect(isExternal).toBeTruthy();
    });

    it("should call modal join room error with generic message", () => {
        ExternalAccountHandler.joinRoomError(null);
        expect(Modal.createDialog).toHaveBeenCalledTimes(1);
        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("room|error_join_title"),
            description: _t("room|error_join_generic_external"),
        });
    });

    it("should call modal create room error with public message", () => {
        ExternalAccountHandler.createRoomError();
        expect(Modal.createDialog).toHaveBeenCalledTimes(1);
        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("create_room|error_title"),
            description: _t("room|error_create_room_external"),
        });
    });

    it("should call modal space error with private message", () => {
        ExternalAccountHandler.createSpaceError();
        expect(Modal.createDialog).toHaveBeenCalledTimes(1);
        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("create_space|error_title"),
            description: _t("create_space|error_external"),
        });
    });

    it("should not indicate the user as external", () => {
        mockClient = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(userIdNotExterne),
            stopClient: jest.fn(),
            removeAllListeners: jest.fn(),
        });

        const isExternal = ExternalAccountHandler.isUserExternal(mockClient);
        expect(isExternal).toBeFalsy();
    });
});
