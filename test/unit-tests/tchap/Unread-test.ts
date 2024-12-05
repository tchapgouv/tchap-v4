/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { mocked } from "jest-mock";
import { MatrixEvent, EventType } from "matrix-js-sdk/src/matrix";

import { haveRendererForEvent } from "~tchap-web/src/events/EventTileFactory";
import { stubClient } from "~tchap-web/test/test-utils";
import { eventTriggersUnreadCount } from "~tchap-web/src/Unread";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";

jest.mock("~tchap-web/src/events/EventTileFactory", () => ({
    haveRendererForEvent: jest.fn(),
}));

describe("Unread", () => {
    // A different user.
    const aliceId = "@alice:server.org";
    stubClient();
    const client = MatrixClientPeg.safeGet();

    // :TCHAP: remove-notification-powerlevel-change
    describe("Don't show power levels change in notification", () => {
        // setup events
        const powerLevelEvent = new MatrixEvent({
            type: EventType.RoomPowerLevels,
            sender: client.getUserId()!,
        });

        beforeEach(() => {
            jest.clearAllMocks();
            mocked(haveRendererForEvent).mockClear().mockReturnValue(false);
        });

        it("returns false when the event was sent by the current user", () => {
            expect(eventTriggersUnreadCount(client, powerLevelEvent)).toBe(false);
            // returned early before checking renderer
            expect(haveRendererForEvent).not.toHaveBeenCalled();
        });

        const noUnreadEventTypes = [
            EventType.RoomMember,
            EventType.RoomThirdPartyInvite,
            EventType.CallAnswer,
            EventType.CallHangup,
            EventType.RoomCanonicalAlias,
            EventType.RoomServerAcl,
            EventType.RoomPowerLevels,
        ];

        it.each(noUnreadEventTypes)(
            "returns false without checking for renderer for events with type %s",
            (eventType) => {
                const event = new MatrixEvent({
                    type: eventType,
                    sender: aliceId,
                });
                expect(eventTriggersUnreadCount(client, event)).toBe(false);
                expect(haveRendererForEvent).not.toHaveBeenCalled();
            },
        );
    });
});
