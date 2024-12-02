import React from "react";
import { RenderResult, render, screen } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";
import { EventEmitter } from "events";

import { TchapRoomType } from "~tchap-web/src/tchap/@types/tchap";
import TchapUtils from "~tchap-web/src/tchap/util/TchapUtils";
import TchapCreateRoomDialog from "~tchap-web/src/tchap/components/views/dialogs/TchapCreateRoomDialog";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import { flushPromises } from "~tchap-web/test/test-utils";

//mocking module with jest.mock should be done outside the test. Before any import of the mocked module.
//I could not make a mock of TchapCreateRoomDialog, the real implementation was taken each time. Then I used jest spyOn

/*    return {
    jest.mock('../../src/lib/createTchapRoom',() => {
        __esModule: true,
        default: jest.fn(() => 42),
        roomCreateOptions: jest.fn(() => 43),
    };
});
*/

/*
 * This unit test targets the TchapCreateRoomDialog react component. It is mounted virtually to be tested thanks to enzyme framework.
 * With the act function, a state is set inside the component, meanwhile the submitForm function submits the form in order to make action on the internal state of the component.
 * No html snapshot is used in this test. Jest mocking is used to simulate behaviour of depending modules such as TchapUtils, TchapCreateRoomDialog, MatrixClientPeg
 */
describe("TchapCreateRoomDialog", () => {
    let mockClient;
    const roomName = "roomName";

    // default props for the component, will be overriden
    const defaultProps = {
        defaultPublic: undefined, // unused for Tchap version
        defaultName: undefined, // unused for Tchap version
        parentSpace: undefined, // unused for Tchap version
        defaultEncrypted: undefined, // unused for Tchap version
        onFinished: jest.fn(),
    };

    //simulate the submit of the form
    const submitForm = async (component: RenderResult) => {
        // Note : component.getByX is preferable, and fails nicely if not found.
        // But querySelector is good enough and doesn't need to change the prod code.
        const createButton = component.getByTestId("dialog-primary-button");

        await userEvent.click(createButton);

        await flushPromises(); // needed to run through all the chained promises in BugReportDialog.onSubmit
    };

    // simulate click on room type radio button
    const selectRoomType = async (roomType: TchapRoomType) => {
        const privateCheckbox = screen.getByDisplayValue(roomType);

        await userEvent.click(privateCheckbox);
    };

    // simuate switch federation click
    const switchFederacationClick = async () => {
        const switchFederation = screen.getByRole("switch");

        await userEvent.click(switchFederation);
    };

    // simulate field typing
    const typeRoomName = async (text: string) => {
        const nameField = screen.getByRole("textbox");

        await userEvent.type(nameField, text);
    };

    // build a new component
    const getComponent = (props: Record<string, any>) => render(<TchapCreateRoomDialog {...defaultProps} {...props} />);

    beforeEach(() => {
        jest.resetAllMocks();

        //mock matrix client
        mockClient = new MockClient();
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);

        //mock tchap utils
        jest.spyOn(TchapUtils, "getShortDomain").mockReturnValue("AGENT");
        jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
            showForumFederationSwitch: true,
            forumFederationSwitchDefaultValue: false,
        });
    });

    describe("forum federation switch", () => {
        it("should be present", () => {
            jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
                showForumFederationSwitch: true,
                forumFederationSwitchDefaultValue: false,
            });

            getComponent({});

            const federatedSwitch = screen.getByRole("switch");
            expect(federatedSwitch).toBeTruthy();
        });

        it("should be absent", () => {
            jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
                showForumFederationSwitch: false,
                forumFederationSwitchDefaultValue: false,
            });
            getComponent({});

            const federatedSwitch = screen.queryByRole("switch");

            expect(federatedSwitch).toBeNull();
        });

        it("should be true by default", async () => {
            jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
                showForumFederationSwitch: true,
                forumFederationSwitchDefaultValue: true,
            });

            await getComponent({});

            const federatedSwitch = screen.getByRole("switch");
            expect(federatedSwitch?.getAttribute("aria-checked")).toEqual("true");
        });

        it("should be false by default", () => {
            jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
                showForumFederationSwitch: true,
                forumFederationSwitchDefaultValue: false,
            });
            getComponent({});
            const federatedSwitch = screen.getByRole("switch");
            expect(federatedSwitch?.getAttribute("aria-checked")).toEqual("false");
        });
    });

    it("Should not create any room wihout a name", async () => {
        const onFinished = jest.fn();
        const wrapper = getComponent({ onFinished });

        await selectRoomType(TchapRoomType.Private);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledTimes(0);
    });

    it("Should create a room with default value", async () => {
        const onFinished = jest.fn();
        const defaultName = "defaultName";
        const wrapper = getComponent({ onFinished });

        await typeRoomName(defaultName);

        await selectRoomType(TchapRoomType.Private);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it("Should create a private room", async () => {
        const onFinished = jest.fn();

        const wrapper = getComponent({ onFinished });

        const privateRoomExpectedOpts = {
            createOpts: {
                name: roomName,
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

        await typeRoomName(roomName);

        await selectRoomType(TchapRoomType.Private);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledWith(true, privateRoomExpectedOpts);
    });

    it("Should create a public room without federation", async () => {
        const onFinished = jest.fn();

        const publicRoomWithoutFederationExpectedOpts = {
            createOpts: {
                name: roomName,
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
        const wrapper = getComponent({ onFinished });

        await typeRoomName(roomName);

        await selectRoomType(TchapRoomType.Forum);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledWith(true, publicRoomWithoutFederationExpectedOpts);
    });

    it("Should create a public room with federation and switch", async () => {
        const onFinished = jest.fn();

        jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
            showForumFederationSwitch: true,
            forumFederationSwitchDefaultValue: false,
        });

        const publicRoomWithFederationExpectedOpts = {
            createOpts: {
                name: roomName,
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
        const wrapper = getComponent({ onFinished });

        await typeRoomName(roomName);

        await selectRoomType(TchapRoomType.Forum);

        await switchFederacationClick();

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledWith(true, publicRoomWithFederationExpectedOpts);
    });

    it("Should create a public room with federation but no switch", async () => {
        const onFinished = jest.fn();

        jest.spyOn(TchapUtils, "getRoomFederationOptions").mockReturnValue({
            showForumFederationSwitch: false,
            forumFederationSwitchDefaultValue: false,
        });

        const publicRoomWithFederationExpectedOpts = {
            createOpts: {
                name: roomName,
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
        const wrapper = getComponent({ onFinished });

        await typeRoomName(roomName);

        await selectRoomType(TchapRoomType.Forum);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledWith(true, publicRoomWithFederationExpectedOpts);
    });

    it("Should create an external room", async () => {
        const onFinished = jest.fn();

        const externalRoomExpectedOpts = {
            createOpts: {
                name: roomName,
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
        const wrapper = getComponent({ onFinished });

        await typeRoomName(roomName);

        await selectRoomType(TchapRoomType.External);

        await submitForm(wrapper);

        expect(onFinished).toHaveBeenCalledWith(true, externalRoomExpectedOpts);
    });
});

class MockClient extends EventEmitter {
    // getUserId = jest.fn();
    // getKeyBackupVersion = jest.fn().mockResolvedValue(undefined);
    // getRooms = jest.fn().mockReturnValue([]);
    // doesServerSupportUnstableFeature = jest.fn().mockResolvedValue(true);
    // isCrossSigningReady = jest.fn().mockResolvedValue(true);
    // isSecretStorageReady = jest.fn().mockResolvedValue(true);
    // isCryptoEnabled = jest.fn().mockReturnValue(true);
    // isInitialSyncComplete = jest.fn().mockReturnValue(true);
    // getKeyBackupEnabled = jest.fn();
    // getStoredDevicesForUser = jest.fn().mockReturnValue([]);
    // getCrossSigningId = jest.fn();
    // getStoredCrossSigningForUser = jest.fn();
    // waitForClientWellKnown = jest.fn();
    // downloadKeys = jest.fn();
    // isRoomEncrypted = jest.fn();
    // getClientWellKnown = jest.fn();
    getDomain = jest.fn();
}
