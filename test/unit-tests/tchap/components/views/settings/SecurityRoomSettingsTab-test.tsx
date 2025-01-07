/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render, screen, waitFor } from "jest-matrix-react";
import { EventType, GuestAccess, HistoryVisibility, JoinRule, MatrixEvent, Room } from "matrix-js-sdk/src/matrix";
import { mocked } from "jest-mock";

import SecurityRoomSettingsTab from "~tchap-web/src/components/views/settings/tabs/room/SecurityRoomSettingsTab";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";
import SettingsStore from "~tchap-web/src/settings/SettingsStore";
import { clearAllModals, stubClient } from "~tchap-web/test/test-utils";
import { filterBoolean } from "~tchap-web/src/utils/arrays";

describe("<SecurityRoomSettingsTab />", () => {
    const userId = "@alice:server.org";
    const client = mocked(stubClient());
    const roomId = "!room:server.org";

    const getComponent = (room: Room, closeSettingsFn = jest.fn()) =>
        render(<SecurityRoomSettingsTab room={room} closeSettingsFn={closeSettingsFn} />, {
            wrapper: ({ children }) => (
                <MatrixClientContext.Provider value={client}>{children}</MatrixClientContext.Provider>
            ),
        });

    const setRoomStateEvents = (
        room: Room,
        joinRule?: JoinRule,
        guestAccess?: GuestAccess,
        history?: HistoryVisibility,
    ): void => {
        const events = filterBoolean<MatrixEvent>([
            new MatrixEvent({
                type: EventType.RoomCreate,
                content: { version: "test" },
                sender: userId,
                state_key: "",
                room_id: room.roomId,
            }),
            guestAccess &&
                new MatrixEvent({
                    type: EventType.RoomGuestAccess,
                    content: { guest_access: guestAccess },
                    sender: userId,
                    state_key: "",
                    room_id: room.roomId,
                }),
            history &&
                new MatrixEvent({
                    type: EventType.RoomHistoryVisibility,
                    content: { history_visibility: history },
                    sender: userId,
                    state_key: "",
                    room_id: room.roomId,
                }),
            joinRule &&
                new MatrixEvent({
                    type: EventType.RoomJoinRules,
                    content: { join_rule: joinRule },
                    sender: userId,
                    state_key: "",
                    room_id: room.roomId,
                }),
        ]);

        room.currentState.setStateEvents(events);
    };

    beforeEach(async () => {
        client.sendStateEvent.mockReset().mockResolvedValue({ event_id: "test" });
        jest.spyOn(client.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(false);
        client.getClientWellKnown.mockReturnValue(undefined);
        jest.spyOn(SettingsStore, "getValue").mockRestore();

        await clearAllModals();
    });

    describe("history visibility", () => {
        it("does not render shared readable option when room is encrypted", async () => {
            const room = new Room(roomId, client, userId);
            jest.spyOn(client.getCrypto()!, "isEncryptionEnabledInRoom").mockResolvedValue(true);
            setRoomStateEvents(room);

            getComponent(room);

            await waitFor(() => expect(screen.queryByDisplayValue(HistoryVisibility.Shared)).not.toBeInTheDocument());
        });

        it("uses shared as default history visibility when no state event found", () => {
            const room = new Room(roomId, client, userId);
            setRoomStateEvents(room);

            getComponent(room);

            expect(screen.getByText("Who can read history?").parentElement).toMatchSnapshot();
            expect(screen.getByDisplayValue(HistoryVisibility.Shared)).toBeChecked();
        });
    });
});
