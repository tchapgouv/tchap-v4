import React from "react";
import { render, screen } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";
import { MatrixClient, MatrixError, Room } from "matrix-js-sdk/src/matrix";
import { Mocked } from "jest-mock";

import InviteDialog from "~tchap-web/src/components/views/dialogs/InviteDialog";
import { InviteKind } from "~tchap-web/src/components/views/dialogs/InviteDialogTypes";
import DMRoomMap from "~tchap-web/src/utils/DMRoomMap";
import SdkConfig from "~tchap-web/src/SdkConfig";
import { ValidatedServerConfig } from "~tchap-web/src/utils/ValidatedServerConfig";
import { IConfigOptions } from "~tchap-web/src/IConfigOptions";
import { SdkContextClass } from "~tchap-web/src/contexts/SDKContext";
import { IProfileInfo } from "~tchap-web/src/hooks/useProfileInfo";
import Modal from "~tchap-web/src/Modal";
import { filterConsole, flushPromises, getMockClientWithEventEmitter } from "~tchap-web/test/test-utils";

const getSearchField = () => screen.getByTestId("invite-dialog-input");

const enterIntoSearchField = async (value: string) => {
    const searchField = getSearchField();
    await userEvent.clear(searchField);
    await userEvent.type(searchField, value + "{enter}");
};

const pasteIntoSearchField = async (value: string) => {
    const searchField = getSearchField();
    await userEvent.clear(searchField);
    searchField.focus();
    await userEvent.paste(value);
    await userEvent.type(searchField, value + "{enter}");
};

const roomId = "!111111111111111111:example.org";
const aliceId = "@alice:example.org";
const aliceEmail = "foobar@email.com";
const aliceUppercaseEmail = "FOOBar@email.com";

const aliceProfileInfo: IProfileInfo = {
    user_id: aliceId,
    display_name: "Alice",
};

const bobId = "@bob:example.org";
const bobProfileInfo: IProfileInfo = {
    user_id: bobId,
    display_name: "Bob",
};

describe("InviteDialog", () => {
    let mockClient: Mocked<MatrixClient>;
    let room: Room;

    filterConsole(
        "Error retrieving profile for userId @carol:example.com",
        "Error retrieving profile for userId @localpart:server.tld",
        "Error retrieving profile for userId @localpart:server:tld",
        "[Invite:Recents] Excluding @alice:example.org from recents",
    );

    beforeEach(() => {
        mockClient = getMockClientWithEventEmitter({
            getUserId: jest.fn().mockReturnValue(bobId),
            getSafeUserId: jest.fn().mockReturnValue(bobId),
            isGuest: jest.fn().mockReturnValue(false),
            getVisibleRooms: jest.fn().mockReturnValue([]),
            getRoom: jest.fn(),
            getRooms: jest.fn(),
            getAccountData: jest.fn(),
            getPushActionsForEvent: jest.fn(),
            mxcUrlToHttp: jest.fn().mockReturnValue(""),
            isRoomEncrypted: jest.fn().mockReturnValue(false),
            getProfileInfo: jest.fn().mockImplementation(async (userId: string) => {
                if (userId === aliceId) return aliceProfileInfo;
                if (userId === bobId) return bobProfileInfo;

                throw new MatrixError({
                    errcode: "M_NOT_FOUND",
                    error: "Profile not found",
                });
            }),
            getIdentityServerUrl: jest.fn(),
            searchUserDirectory: jest.fn().mockResolvedValue({}),
            lookupThreePid: jest.fn(),
            registerWithIdentityServer: jest.fn().mockResolvedValue({
                access_token: "access_token",
                token: "token",
            }),
            getOpenIdToken: jest.fn().mockResolvedValue({}),
            getIdentityAccount: jest.fn().mockResolvedValue({}),
            getTerms: jest.fn().mockResolvedValue({ policies: [] }),
            supportsThreads: jest.fn().mockReturnValue(false),
            isInitialSyncComplete: jest.fn().mockReturnValue(true),
            getClientWellKnown: jest.fn().mockResolvedValue({}),
        });
        SdkConfig.put({ validated_server_config: {} as ValidatedServerConfig } as IConfigOptions);
        DMRoomMap.makeShared(mockClient);
        jest.clearAllMocks();

        room = new Room(roomId, mockClient, mockClient.getSafeUserId());

        jest.spyOn(DMRoomMap.shared(), "getUniqueRoomsWithIndividuals").mockReturnValue({
            [aliceId]: room,
        });
        mockClient.getRooms.mockReturnValue([room]);
        mockClient.getRoom.mockReturnValue(room);

        SdkContextClass.instance.client = mockClient;
    });

    afterEach(() => {
        Modal.closeCurrentModal();
        SdkContextClass.instance.onLoggedOut();
        SdkContextClass.instance.client = undefined;
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it("should entered values as lowercase", async () => {
        mockClient.getIdentityServerUrl.mockReturnValue("https://identity-server");
        mockClient.lookupThreePid.mockResolvedValue({});

        render(<InviteDialog kind={InviteKind.Invite} roomId={roomId} onFinished={jest.fn()} />);

        const input = getSearchField();
        input.focus();

        // Type and enter
        await enterIntoSearchField(aliceUppercaseEmail);

        // Because it has been transoformed to lowercase, it shoyld not be found in the document
        expect(screen.queryByText(aliceUppercaseEmail)).not.toBeInTheDocument();

        expect(screen.queryByText(aliceEmail)).toBeInTheDocument();

        // If it was transformed correctly to a pill, the input should have no value
        expect(input).toHaveValue("");
    });

    it("should add pasted email values as lowercase", async () => {
        mockClient.getIdentityServerUrl.mockReturnValue("https://identity-server");
        mockClient.lookupThreePid.mockResolvedValue({});

        render(<InviteDialog kind={InviteKind.Invite} roomId={roomId} onFinished={jest.fn()} />);

        // Juste paste some values without enter
        await pasteIntoSearchField(aliceUppercaseEmail);

        await flushPromises();

        // Because it has been transoformed to lowercase, it shoyld not be found in the document
        expect(screen.queryByText(aliceUppercaseEmail)).not.toBeInTheDocument();

        // contrary to the entered values, on this paste test we don't enter, so we have multiple result
        expect(screen.queryAllByText(aliceEmail)[0]).toBeInTheDocument();
    });

    it("should not crash if empty values are entered", async () => {
        mockClient.getIdentityServerUrl.mockReturnValue("https://identity-server");
        mockClient.lookupThreePid.mockResolvedValue({});

        render(<InviteDialog kind={InviteKind.Invite} roomId={roomId} onFinished={jest.fn()} />);

        const input = getSearchField();
        input.focus();

        // Type and enter
        await enterIntoSearchField("");

        expect(input).toHaveValue("");
    });

    it("should not crash if empty values are pasted", async () => {
        mockClient.getIdentityServerUrl.mockReturnValue("https://identity-server");
        mockClient.lookupThreePid.mockResolvedValue({});

        render(<InviteDialog kind={InviteKind.Invite} roomId={roomId} onFinished={jest.fn()} />);
        const input = getSearchField();

        // Juste paste some values without enter
        await pasteIntoSearchField("");

        expect(input).toHaveValue("");
    });
});
