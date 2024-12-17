import React from "react";
import { logRoles, render, screen, waitFor, waitForElementToBeRemoved } from "jest-matrix-react";
import { mocked } from "jest-mock";
import { EventType, GuestAccess, JoinRule, MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import userEvent from "@testing-library/user-event";

import { flushPromises, waitEnoughCyclesForModal } from "../../../../../test-utils";

import { mkStubRoom, stubClient } from "~tchap-web//test/test-utils/test-utils";
import { makeRoomPermalink } from "~tchap-web//src/utils/permalinks/Permalinks";
import TchapRoomLinkAccess from "~tchap-web//src/tchap/components/views/rooms/TchapRoomLinkAccess";
import { TchapRoomType } from "~tchap-web//src/tchap/@types/tchap";
import TchapRoomUtils from "~tchap-web/src/tchap/util/TchapRoomUtils";
import SdkConfig, { ConfigOptions } from "~tchap-web/src/SdkConfig";

jest.mock("~tchap-web/src/tchap/util/TchapRoomUtils");
jest.mock("~tchap-web//src/utils/permalinks/Permalinks");
jest.mock("~tchap-web/src/utils/permalinks/ElementPermalinkConstructor");

describe("TchapRoomLinkAccess", () => {
    const client: MatrixClient = stubClient();
    const room: Room = mkStubRoom("roomId", "test", client);

    const mockedTchapRoomUtils = mocked(TchapRoomUtils);
    const mockedMakeRoomPermalink = mocked(makeRoomPermalink);
    const onUpdateParentView = jest.fn().mockImplementation(() => {});

    const mockedLinked = "https://testmocked.matrix.org";

    const getComponent = () => render(<TchapRoomLinkAccess room={room} onUpdateParentView={onUpdateParentView} />);

    const config: ConfigOptions = { permalink_prefix: "localhost" };
    SdkConfig.put(config);

    beforeEach(() => {
        mockedTchapRoomUtils.getTchapRoomType.mockImplementation(() => TchapRoomType.Private);
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);
        mockedTchapRoomUtils.isUserAdmin.mockImplementation(() => true);
        mockedTchapRoomUtils.getRoomGuessAccessRule.mockImplementation(() => GuestAccess.CanJoin);
        mockedMakeRoomPermalink.mockImplementation(() => mockedLinked);

        client.createAlias = jest.fn().mockResolvedValue("alias");

        jest.spyOn(client, "sendStateEvent").mockResolvedValue(Promise.resolve({ event_id: "" }));
        jest.spyOn(client, "sendStateEvent").mockResolvedValue(Promise.resolve({ event_id: "" }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should render correct initial value when joinrule is public", async () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Public);
        mockedTchapRoomUtils.getTchapRoomType.mockImplementation(() => TchapRoomType.Forum);

        getComponent();

        await flushPromises();

        const switchLink = screen.queryByRole("switch");

        const linkDisplay = screen.queryByText(mockedLinked);

        expect(linkDisplay).toBeDefined();

        // should be disable because we dont change this settings for forum room
        expect(switchLink).toHaveAttribute("aria-disabled", "true");
    });

    it("should render correct initial value when joinrule is invite", async () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);

        getComponent();

        await flushPromises();

        const switchLink = screen.queryByRole("switch");

        const linkDisplay = screen.queryByText(mockedLinked);

        // linked should not appear because the share link is deactivated
        expect(linkDisplay).toBe(null);

        // we should be able to click on the link to activate it
        expect(switchLink).toHaveAttribute("aria-disabled", "false");
    });

    it("should disable link if user is not admin", async () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);
        mockedTchapRoomUtils.isUserAdmin.mockImplementation(() => false);

        getComponent();

        await flushPromises();

        const switchLink = screen.queryByRole("switch");

        const linkDisplay = screen.queryByText(mockedLinked);

        // linked should not appear because the share link is deactivated
        expect(linkDisplay).toBe(null);

        // the user should not be able to click on the button
        expect(switchLink).toHaveAttribute("aria-disabled", "true");
    });

    it("should activate link when clicking on the switch", async () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);

        getComponent();

        await flushPromises();

        const switchLink = screen.getByRole("switch");

        // should open dialog
        userEvent.click(switchLink);

        await waitEnoughCyclesForModal({
            useFakeTimers: true,
        });

        const dialog = await screen.findByRole("dialog");

        expect(dialog).toMatchSnapshot();

        const confirmButton = screen.getByTestId("dialog-primary-button");

        userEvent.click(confirmButton);

        await waitForElementToBeRemoved(dialog);
        // should activate the switch with public join rule value
        expect(room.client.createAlias).toHaveBeenCalledTimes(1);

        // joinrule to public, guest access to forbiden and canonical alias
        expect(room.client.sendStateEvent).toHaveBeenCalledTimes(3);

        await waitFor(() => {
            expect(switchLink).toHaveAttribute("aria-checked", "true");
        });
    });

    it("should use existing alias", async () => {
        jest.spyOn(room, "getCanonicalAlias").mockImplementation(() => "alias:domaing@test.fr");
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Invite);
        const { container } = getComponent();

        await flushPromises();

        const switchLink = screen.getByRole("switch");

        // should open dialog
        userEvent.click(switchLink);

        await waitEnoughCyclesForModal({
            useFakeTimers: true,
        });

        const dialog = await screen.findByRole("dialog");

        expect(dialog).toMatchSnapshot();

        const confirmButton = screen.getByTestId("dialog-primary-button");

        userEvent.click(confirmButton);

        await waitForElementToBeRemoved(dialog);
        // should activate the switch with public join rule value

        expect(mockedMakeRoomPermalink).toHaveBeenCalledTimes(1);

        logRoles(container);

        await waitFor(() => {
            expect(switchLink).toHaveAttribute("aria-checked", "true");
        });
    });

    it("should deactivate link when clicking on the switch", async () => {
        mockedTchapRoomUtils.getRoomJoinRule.mockImplementation(() => JoinRule.Public);

        getComponent();

        await flushPromises();

        const switchLink = screen.getByRole("switch");

        userEvent.click(switchLink);

        await waitFor(() => {
            const linkDisplay = screen.queryByText(mockedLinked);

            // no link since we deactivated the switch
            expect(linkDisplay).toBe(null);
            // should deactivate the switch
            expect(room.client.sendStateEvent).toHaveBeenCalledTimes(1);
            expect(room.client.sendStateEvent).toHaveBeenCalledWith(
                room.roomId,
                EventType.RoomJoinRules,
                { join_rule: JoinRule.Invite },
                "",
            );
            expect(switchLink).toHaveAttribute("aria-checked", "false");
        });
    });
});
