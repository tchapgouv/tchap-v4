import { logRoles, render, screen } from "jest-matrix-react";
import { mocked } from "jest-mock";
import { MatrixClient, PendingEventOrdering, Room, JoinRule, KnownMembership } from "matrix-js-sdk/src/matrix";
import React from "react";

import { stubClient } from "~tchap-web/test/test-utils/test-utils";
import { clearAllModals } from "~tchap-web/test/test-utils";
import { ChevronFace } from "~tchap-web/src/components/structures/ContextMenu";
import {
    RoomGeneralContextMenu,
    RoomGeneralContextMenuProps,
} from "~tchap-web/src/components/views/context_menus/RoomGeneralContextMenu";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import { DefaultTagID } from "~tchap-web/src/stores/room-list/models";
import RoomListStore from "~tchap-web/src/stores/room-list/RoomListStore";
import DMRoomMap from "~tchap-web/src/utils/DMRoomMap";
import TchapRoomUtils from "~tchap-web/src/tchap/util/TchapRoomUtils";

jest.mock("~tchap-web/src/tchap/util/TchapRoomUtils");

describe("RoomGeneralContextMenu", () => {
    const ROOM_ID = "!123:matrix.org";

    let room: Room;
    let mockClient: MatrixClient;

    let onFinished: () => void;

    const mockedTchapRoomUtils = mocked(TchapRoomUtils);

    function getComponent(props?: Partial<RoomGeneralContextMenuProps>) {
        return render(
            <MatrixClientContext.Provider value={mockClient}>
                <RoomGeneralContextMenu
                    room={room}
                    onFinished={onFinished}
                    {...props}
                    managed={true}
                    mountAsChild={true}
                    left={1}
                    top={1}
                    chevronFace={ChevronFace.Left}
                />
            </MatrixClientContext.Provider>,
        );
    }

    beforeEach(() => {
        jest.clearAllMocks();

        stubClient();
        mockClient = mocked(MatrixClientPeg.safeGet());

        room = new Room(ROOM_ID, mockClient, mockClient.getUserId() ?? "", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        const dmRoomMap = {
            getUserIdForRoomId: jest.fn().mockReturnValue(null),
        } as unknown as DMRoomMap;
        DMRoomMap.setShared(dmRoomMap);

        jest.spyOn(RoomListStore.instance, "getTagsForRoom").mockReturnValueOnce([
            DefaultTagID.DM,
            DefaultTagID.Favourite,
        ]);

        room.updateMyMembership(KnownMembership.Join);
        jest.spyOn(room, "canInvite").mockReturnValue(true);

        onFinished = jest.fn();
    });

    afterEach(async () => {
        await clearAllModals();
    });

    it("renders the default context menu", async () => {
        const { container } = getComponent({});
        expect(container).toMatchSnapshot();
    });

    it("able the copy link button when joinrule is public", () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Public);

        const { container } = getComponent({});

        logRoles(container);

        const roomLinkButton = screen.getByRole("menuitem", { name: "Copy room link" });

        expect(roomLinkButton).not.toHaveAttribute("aria-disabled");
    });

    it("disable the copy link button when joinrule is not public", () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);

        getComponent({});

        const roomLinkButton = screen.getByRole("menuitem", { name: "Copy room link" });

        expect(roomLinkButton).toHaveAttribute("aria-disabled", "true");
    });
});
