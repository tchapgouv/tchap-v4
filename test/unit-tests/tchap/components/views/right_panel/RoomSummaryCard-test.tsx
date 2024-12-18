/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render } from "jest-matrix-react";
import { MatrixEvent, Room, MatrixClient, JoinRule } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { mocked, MockedObject } from "jest-mock";

import DMRoomMap from "~tchap-web/src/utils/DMRoomMap";
import RoomSummaryCard from "~tchap-web/src/components/views/right_panel/RoomSummaryCard";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";
import defaultDispatcher from "~tchap-web/src/dispatcher/dispatcher";
import * as settingsHooks from "~tchap-web/src/hooks/useSettings";
import Modal from "~tchap-web/src/Modal";
import RightPanelStore from "~tchap-web/src/stores/right-panel/RightPanelStore";
import { stubClient } from "~tchap-web/test/test-utils";
import { RoomPermalinkCreator } from "~tchap-web/src/utils/permalinks/Permalinks";
import TchapRoomUtils from "~tchap-web/src/tchap/util/TchapRoomUtils";

jest.mock("~tchap-web/src/utils/room/tagRoom");
jest.mock("~tchap-web/src/tchap/util/TchapRoomUtils");

describe("<RoomSummaryCard />", () => {
    const userId = "@alice:domain.org";

    const roomId = "!room:domain.org";
    let mockClient!: MockedObject<MatrixClient>;
    let room!: Room;

    const mockedTchapRoomUtils = mocked(TchapRoomUtils);

    const getComponent = (props = {}) => {
        const defaultProps = {
            room,
            onClose: jest.fn(),
            permalinkCreator: new RoomPermalinkCreator(room),
        };

        return render(<RoomSummaryCard {...defaultProps} {...props} />, {
            wrapper: ({ children }) => (
                <MatrixClientContext.Provider value={mockClient}>{children}</MatrixClientContext.Provider>
            ),
        });
    };

    beforeEach(() => {
        mockClient = mocked(stubClient());
        room = new Room(roomId, mockClient, userId);
        const roomCreateEvent = new MatrixEvent({
            type: "m.room.create",
            room_id: roomId,
            sender: userId,
            content: {
                creator: userId,
                room_version: "5",
            },
            state_key: "",
        });
        room.currentState.setStateEvents([roomCreateEvent]);
        room.updateMyMembership(KnownMembership.Join);

        jest.spyOn(Modal, "createDialog");
        jest.spyOn(RightPanelStore.instance, "pushCard");
        jest.spyOn(settingsHooks, "useFeatureEnabled").mockReturnValue(false);
        jest.spyOn(defaultDispatcher, "dispatch");
        jest.clearAllMocks();
        DMRoomMap.makeShared(mockClient);

        mockClient.getRoom.mockReturnValue(room);
        jest.spyOn(room, "isElementVideoRoom").mockRestore();
        jest.spyOn(room, "isCallRoom").mockRestore();

        jest.spyOn(room, "getPendingEvents").mockReturnValue([]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders the room summary", () => {
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("opens share room dialog on button click and join rule is public", () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Public);
        const { getByRole } = getComponent();

        const copyByLibnkBtn = getByRole("menuitem", { name: "Copy link" });

        expect(copyByLibnkBtn).not.toHaveAttribute("disabled");
    });

    it("disable copy link when join room is invite", () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);

        const { getByRole } = getComponent();

        const copyByLibnkBtn = getByRole("menuitem", { name: "Copy link" });

        expect(copyByLibnkBtn).toHaveAttribute("disabled");
    });
});
