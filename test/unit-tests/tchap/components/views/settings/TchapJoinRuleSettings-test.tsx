import React from "react";
import { render, screen } from "jest-matrix-react";
import { mocked } from "jest-mock";
import { JoinRule, MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import TchapJoinRuleSettings from "~tchap-web/src/tchap/components/views/settings/TchapJoinRuleSettings";
import { TchapRoomAccessRule, TchapRoomAccessRulesEventId } from "~tchap-web/src/tchap/@types/tchap";
import {
    createTestClient,
    mkStubRoom,
    mockStateEventImplementation,
    mkEvent,
} from "~tchap-web/test/test-utils/test-utils";

function mkStubRoomWithInviteRule(roomId: string, name: string, client: MatrixClient, joinRule: JoinRule): Room {
    const stubRoom: Room = mkStubRoom(roomId, name, client);
    stubRoom.getJoinRule = jest.fn().mockReturnValue(joinRule);
    stubRoom.currentState.getJoinRule = jest.fn().mockReturnValue(joinRule);
    return stubRoom;
}

const makeAccessEvent = (rule: TchapRoomAccessRule = TchapRoomAccessRule.Restricted) =>
    mkEvent({
        type: TchapRoomAccessRulesEventId,
        event: true,
        content: {
            rule: rule,
        },
    } as any);

function mkStubRoomWithAccessRule(
    roomId: string,
    name: string,
    client: MatrixClient,
    joinRule: JoinRule,
    accessRule: TchapRoomAccessRule,
): Room {
    const stubRoom: Room = mkStubRoom(roomId, name, client);
    stubRoom.getJoinRule = jest.fn().mockReturnValue(joinRule);
    stubRoom.currentState.getJoinRule = jest.fn().mockReturnValue(joinRule);
    const events = [makeAccessEvent(accessRule)];
    mocked(stubRoom.currentState).getStateEvents.mockImplementation(mockStateEventImplementation(events));
    return stubRoom;
}

describe("TchapJoinRule", () => {
    beforeEach(() => {});

    it("should render the tchap join rule with only private option", () => {
        //build stub private room
        const props = {
            room: mkStubRoomWithInviteRule("roomId", "roomName", createTestClient(), JoinRule.Invite),
            closeSettingsFn() {},
            onError(error: Error) {},
        };

        //arrange
        render(<TchapJoinRuleSettings {...props} />);

        //assert that spaces option is not here while private and public are
        const publicText = "Public";
        const privateText = "Private (invite only)";
        const allowExternalText = "Allow external users to join this room";
        const spaceText = "Anyone in a space can find and join";

        expect(screen.queryByText(publicText)).toBe(null);
        expect(screen.queryByText(privateText)).toBeDefined();
        expect(screen.queryByText(allowExternalText)).toBe(null);
        expect(screen.queryByText(spaceText)).toBe(null);
    });

    it("should render the tchap join rule with only private option with restricted access rules", () => {
        //build stub private room
        const props = {
            room: mkStubRoomWithAccessRule(
                "roomId",
                "roomName",
                createTestClient(),
                JoinRule.Invite,
                TchapRoomAccessRule.Restricted,
            ),
            closeSettingsFn() {},
            onError(error: Error) {},
        };

        //arrange
        render(<TchapJoinRuleSettings {...props} />);

        //assert that spaces option is not here while private and public are
        const publicText = "Public";
        const privateText = "Private (invite only)";
        const allowExternalText = "Allow external users to join this room";
        const spaceText = "Anyone in a space can find and join";

        expect(screen.queryByText(publicText)).toBe(null);
        expect(screen.queryByText(privateText)).toBeDefined();
        expect(screen.queryByText(allowExternalText)).toBeDefined();
        expect(screen.queryByText(spaceText)).toBe(null);
    });

    /*
    Impossible to mock a room to be considered as Public from TchapJoinRuleSettings point of view
    it("should render the tchap join rule with only public option", () => {
        //build stub private room
        const props = {
            room: mkStubRoomWithInviteRule("roomId", "roomName", createTestClient(), JoinRule.Public),
            closeSettingsFn(){},
            onError(error: Error){},
        }

        //arrange
        render(<TchapJoinRuleSettings {...props} />);

        //assert that spaces option is not here while private and public are
        const privateText = "Private (invite only)"
        const publicText = "Public"
        const spaceText = "Anyone in a space can find and join"

        expect(screen.getByText(privateText)).toBe(null);
        expect(screen.getByText(publicText)).toBeDefined();
        expect(screen.queryByText(spaceText)).toBe(null);
    });
    */
});
