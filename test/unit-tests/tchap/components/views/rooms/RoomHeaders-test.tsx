import React from "react";
import { KnownMembership, PendingEventOrdering, Room } from "matrix-js-sdk/src/matrix";
import { screen, render, RenderOptions, getByLabelText, queryByLabelText } from "jest-matrix-react";

import { mkRoomMember, stubClient } from "~tchap-web/test/test-utils";
import RoomHeader from "~tchap-web/src/components/views/rooms/RoomHeader";
import DMRoomMap from "~tchap-web/src/utils/DMRoomMap";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";
import SdkConfig from "~tchap-web/src/SdkConfig";
import SettingsStore from "~tchap-web/src/settings/SettingsStore";
import { UIFeature } from "~tchap-web/src/settings/UIFeature";

function getWrapper(): RenderOptions {
    return {
        wrapper: ({ children }) => (
            <MatrixClientContext.Provider value={MatrixClientPeg.safeGet()}>{children}</MatrixClientContext.Provider>
        ),
    };
}

/**
 *
 * @param count the number of users to create
 */
function mockRoomMembers(room: Room, count: number) {
    const members = Array(count)
        .fill(0)
        .map((_, index) => ({
            userId: `@user-${index}:example.org`,
            name: `Member ${index}`,
            rawDisplayName: `Member ${index}`,
            roomId: room.roomId,
            membership: KnownMembership.Join,
            getAvatarUrl: () => `mxc://avatar.url/user-${index}.png`,
            getMxcAvatarUrl: () => `mxc://avatar.url/user-${index}.png`,
        }));

    room.currentState.setJoinedMemberCount(members.length);
    room.getJoinedMembers = jest.fn().mockReturnValue(members);
}

describe("RoomHeader", () => {
    let room: Room;
    const ROOM_ID = "!1:example.org";
    const featurethreadName: string = "feature_thread";
    const featureVideoName: string = "feature_video_call";
    const featureVideoGroupName: string = "feature_video_group_call";
    const homeserverName: string = "my.home.server";

    const addHomeserverToMockConfig = (homeservers: string[], feature: string) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_features: {} };
        config.tchap_features[feature] = homeservers;
        SdkConfig.put(config);
    };

    const getComponent = () => render(<RoomHeader room={room} />, getWrapper());

    function mockDMRoom(memberCount: number = 2) {
        mockRoomMembers(room, memberCount);
        jest.spyOn(SettingsStore, "getValue").mockImplementation(() => false);
        jest.spyOn(room.currentState, "mayClientSendStateEvent").mockReturnValue(false);
        jest.spyOn(room, "getMember").mockReturnValue(mkRoomMember(room.roomId, "@alice:example.org"));

        DMRoomMap.setShared({
            getUserIdForRoomId: () => {
                return "@alice:example.org";
            },
        } as unknown as DMRoomMap);
    }

    beforeEach(async () => {
        const mockClient = stubClient();
        room = new Room(ROOM_ID, MatrixClientPeg.get()!, "@alice:example.org", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        jest.spyOn(mockClient, "getDomain").mockImplementation(() => homeserverName);
        jest.spyOn(room, "isElementVideoRoom").mockReturnValue(false);
        jest.spyOn(room, "isCallRoom").mockReturnValue(false);
        jest.spyOn(room, "isSpaceRoom").mockReturnValue(false);
        jest.spyOn(room, "getType").mockReturnValue(undefined);

        // allow element calls
        jest.spyOn(room.currentState, "mayClientSendStateEvent").mockReturnValue(true);
        // activate the group and widget features
        jest.spyOn(SettingsStore, "getValue").mockImplementation(
            (feature) => feature === "feature_group_calls" || feature == UIFeature.Widgets,
        );

        DMRoomMap.setShared({
            getUserIdForRoomId: jest.fn(),
        } as unknown as DMRoomMap);
    });

    afterEach(() => {
        SdkConfig.reset();
        jest.restoreAllMocks();
    });

    it("should render as expected", async () => {
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("renders the room header", () => {
        const { container } = getComponent();
        expect(container).toHaveTextContent(ROOM_ID);
    });

    it("display well the thread button when feature is activated", () => {
        addHomeserverToMockConfig(["*"], featurethreadName);

        getComponent();

        expect(screen.queryByRole("button", { name: "Threads" })).toBeInTheDocument();
    });

    it("hides the thread button when feature is deactivated", () => {
        addHomeserverToMockConfig(["other.homeserver"], featurethreadName);

        getComponent();

        expect(screen.queryByRole("button", { name: "Threads" })).not.toBeInTheDocument();
    });

    // For 1 to 1 video call
    it("display well the video button when feature is activated for 1v1 call", () => {
        addHomeserverToMockConfig([homeserverName], featureVideoName);
        mockDMRoom();

        const { container } = getComponent();

        expect(queryByLabelText(container, "Video call")).toBeInTheDocument();
    });

    it("hides the video button when feature is deactivated for 1v1 call", () => {
        addHomeserverToMockConfig(["other.homeserver"], featureVideoName);
        mockDMRoom();

        const { container } = getComponent();

        expect(queryByLabelText(container, "Video call")).toBeNull();
    });

    it("hides the video button when feature is activated but is not a direct message room", () => {
        addHomeserverToMockConfig([homeserverName], featureVideoName);

        mockDMRoom(4);

        const { container } = getComponent();

        expect(queryByLabelText(container, "Video call")).toBeNull();
    });

    //  for video group element call button
    it("display well the video group button when feature is activated", () => {
        addHomeserverToMockConfig([homeserverName], featureVideoGroupName);

        mockRoomMembers(room, 4);

        const { container } = getComponent();

        expect(getByLabelText(container, "Video call")).toBeInTheDocument();
    });

    it("hides the video group when feature is deactivated", () => {
        addHomeserverToMockConfig(["other.homeserver"], featureVideoGroupName);

        mockRoomMembers(room, 4);

        const { container } = getComponent();

        expect(queryByLabelText(container, "Video call")).toBeNull();
    });
});
