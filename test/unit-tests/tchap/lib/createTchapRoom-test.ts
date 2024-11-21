import { TchapRoomType } from "../../../../src/tchap/@types/tchap";
import TchapCreateRoom from "../../../../src/tchap/lib/createTchapRoom";

// todo(estellecomment) : these tests are redundant with TchapCreateRoomDialog-test. Either remove them or modify TchapCreateRoomDialog
// to not edit state directly.
describe("Create room options", () => {
    beforeEach(() => {});

    it("builds option for private room", () => {
        const privateRoomExpectedOpts = {
            createOpts: {
                name: "testName",
                creation_content: {
                    "m.federate": true,
                },
                initial_state: [
                    {
                        content: {
                            rule: "restricted",
                        },
                        state_key: "",
                        type: "im.vector.room.access_rules",
                    },
                ],
                visibility: "private",
                preset: "private_chat",
            },
            guestAccess: false,
            joinRule: "invite",
            encryption: true,
            historyVisibility: "invited",
        };
        expect(TchapCreateRoom.roomCreateOptions("testName", TchapRoomType.Private)).toStrictEqual(
            privateRoomExpectedOpts,
        );
    });

    it("builds option for public room without federation", () => {
        const publicRoomWithoutFederationExpectedOpts = {
            createOpts: {
                name: "testName",
                creation_content: {
                    "m.federate": false,
                },
                initial_state: [
                    {
                        content: {
                            rule: "restricted",
                        },
                        state_key: "",
                        type: "im.vector.room.access_rules",
                    },
                ],
                visibility: "public",
                preset: "public_chat",
            },
            guestAccess: false,
            joinRule: "public",
            encryption: false,
            historyVisibility: "shared",
        };
        expect(TchapCreateRoom.roomCreateOptions("testName", TchapRoomType.Forum, false)).toStrictEqual(
            publicRoomWithoutFederationExpectedOpts,
        );
    });

    it("builds option for public room with federation", () => {
        const publicRoomWithFederationExpectedOpts = {
            createOpts: {
                name: "testName",
                creation_content: {
                    "m.federate": true,
                },
                initial_state: [
                    {
                        content: {
                            rule: "restricted",
                        },
                        state_key: "",
                        type: "im.vector.room.access_rules",
                    },
                ],
                visibility: "public",
                preset: "public_chat",
            },
            guestAccess: false,
            joinRule: "public",
            encryption: false,
            historyVisibility: "shared",
        };
        expect(TchapCreateRoom.roomCreateOptions("testName", TchapRoomType.Forum, true)).toStrictEqual(
            publicRoomWithFederationExpectedOpts,
        );
    });

    it("builds option for external room", () => {
        const externalRoomExpectedOpts = {
            createOpts: {
                name: "testName",
                creation_content: {
                    "m.federate": true,
                },
                initial_state: [
                    {
                        content: {
                            rule: "unrestricted",
                        },
                        state_key: "",
                        type: "im.vector.room.access_rules",
                    },
                ],
                visibility: "private",
                preset: "private_chat",
            },
            guestAccess: false,
            joinRule: "invite",
            encryption: true,
            historyVisibility: "invited",
        };
        expect(TchapCreateRoom.roomCreateOptions("testName", TchapRoomType.External)).toStrictEqual(
            externalRoomExpectedOpts,
        );
    });
});
