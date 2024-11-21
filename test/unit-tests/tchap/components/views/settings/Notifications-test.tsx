import React from "react";
import {
    ConditionKind,
    IPushRules,
    IThreepid,
    LOCAL_NOTIFICATION_SETTINGS_PREFIX,
    MatrixEvent,
    PushRuleActionName,
    ThreepidMedium,
    TweakName,
} from "matrix-js-sdk/src/matrix";
import { cleanup, fireEvent, render, screen } from "jest-matrix-react";

import Notifications from "~tchap-web/src/components/views/settings/Notifications";
import {
    clearAllModals,
    getMockClientWithEventEmitter,
    mockClientMethodsUser,
} from "~tchap-web/test/test-utils";
import SdkConfig from "~tchap-web/src/SdkConfig";

// don't pollute test output with error logs from mock rejections
jest.mock("matrix-js-sdk/src/logger");

// Avoid indirectly importing any eagerly created stores that would require extra setup
// jest.mock("~tchap-web/src/Notifier");

const flushPromises = async () => await new Promise((resolve) => window.setTimeout(resolve));

const pushRules: IPushRules = {
    global: {
        underride: [
            {
                conditions: [{ kind: ConditionKind.EventMatch, key: "type", pattern: "m.call.invite" }],
                actions: [
                    PushRuleActionName.Notify,
                    { set_tweak: TweakName.Sound, value: "ring" },
                    { set_tweak: TweakName.Highlight, value: false },
                ],
                rule_id: ".m.rule.call",
                default: true,
                enabled: true,
            },
            {
                conditions: [
                    { kind: ConditionKind.EventMatch, key: "type", pattern: "im.vector.modular.widgets" },
                    { kind: ConditionKind.EventMatch, key: "content.type", pattern: "jitsi" },
                    { kind: ConditionKind.EventMatch, key: "state_key", pattern: "*" },
                ],
                actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight, value: false }],
                rule_id: ".im.vector.jitsi",
                default: true,
                enabled: true,
            },
        ],
        sender: [],
        room: [
            {
                actions: [PushRuleActionName.DontNotify],
                rule_id: "!zJPyWqpMorfCcWObge:matrix.org",
                default: false,
                enabled: true,
            },
        ],
        content: [
            {
                actions: [
                    PushRuleActionName.Notify,
                    { set_tweak: TweakName.Sound, value: "default" },
                    { set_tweak: TweakName.Highlight },
                ],
                pattern: "kadev1",
                rule_id: ".m.rule.contains_user_name",
                default: true,
                enabled: true,
            },
        ],
        override: [
            {
                conditions: [],
                actions: [PushRuleActionName.DontNotify],
                rule_id: ".m.rule.master",
                default: true,
                enabled: false,
            },
            {
                conditions: [{ kind: ConditionKind.EventMatch, key: "content.msgtype", pattern: "m.notice" }],
                actions: [PushRuleActionName.DontNotify],
                rule_id: ".m.rule.suppress_notices",
                default: true,
                enabled: true,
            },
            {
                conditions: [
                    { kind: ConditionKind.EventMatch, key: "type", pattern: "m.room.member" },
                    { kind: ConditionKind.EventMatch, key: "content.membership", pattern: "invite" },
                    { kind: ConditionKind.EventMatch, key: "state_key", pattern: "@kadev1:matrix.org" },
                ],
                actions: [
                    PushRuleActionName.Notify,
                    { set_tweak: TweakName.Sound, value: "default" },
                    { set_tweak: TweakName.Highlight, value: false },
                ],
                rule_id: ".m.rule.invite_for_me",
                default: true,
                enabled: true,
            },
            {
                conditions: [{ kind: ConditionKind.EventMatch, key: "type", pattern: "m.room.member" }],
                actions: [PushRuleActionName.DontNotify],
                rule_id: ".m.rule.member_event",
                default: true,
                enabled: true,
            },
            {
                conditions: [{ kind: "contains_display_name" }],
                actions: [
                    PushRuleActionName.Notify,
                    { set_tweak: TweakName.Sound, value: "default" },
                    { set_tweak: TweakName.Highlight },
                ],
                rule_id: ".m.rule.contains_display_name",
                default: true,
                enabled: true,
            },
            {
                conditions: [
                    { kind: ConditionKind.EventMatch, key: "content.body", pattern: "@room" },
                    { kind: "sender_notification_permission", key: "room" },
                ],
                actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight, value: true }],
                rule_id: ".m.rule.roomnotif",
                default: true,
                enabled: true,
            },
            {
                conditions: [
                    { kind: ConditionKind.EventMatch, key: "type", pattern: "m.room.tombstone" },
                    { kind: ConditionKind.EventMatch, key: "state_key", pattern: "" },
                ],
                actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight, value: true }],
                rule_id: ".m.rule.tombstone",
                default: true,
                enabled: true,
            },
            {
                conditions: [{ kind: ConditionKind.EventMatch, key: "type", pattern: "m.reaction" }],
                actions: [PushRuleActionName.DontNotify],
                rule_id: ".m.rule.reaction",
                default: true,
                enabled: true,
            },
        ],
    },
    device: {},
} as IPushRules;

describe("<Notifications />", () => {
    const featureEmailName: string = "feature_email_notification";
    const featurethreadName: string = "feature_thread";
    const homeserverName: string = "my.home.server";

    const getComponent = () => render(<Notifications />);

    // get component, wait for async data and force a render
    const getComponentAndWait = async () => {
        const component = getComponent();
        await flushPromises();
        return component;
    };

    // Mock client with notification settings
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(),
        getPushRules: jest.fn(),
        getPushers: jest.fn(),
        getThreePids: jest.fn(),
        setPusher: jest.fn(),
        removePusher: jest.fn(),
        setPushRuleEnabled: jest.fn(),
        setPushRuleActions: jest.fn(),
        getRooms: jest.fn().mockReturnValue([]),
        getAccountData: jest.fn().mockImplementation((eventType) => {
            if (eventType.startsWith(LOCAL_NOTIFICATION_SETTINGS_PREFIX.name)) {
                return new MatrixEvent({
                    type: eventType,
                    content: {
                        is_silenced: false,
                    },
                });
            }
        }),
        setAccountData: jest.fn(),
        sendReadReceipt: jest.fn(),
        supportsThreads: jest.fn().mockReturnValue(true),
        isInitialSyncComplete: jest.fn().mockReturnValue(false),
        addPushRule: jest.fn().mockResolvedValue({}),
        deletePushRule: jest.fn().mockResolvedValue({}),
    });

    // Set the home servername used later to match with the config
    jest.spyOn(mockClient, "getDomain").mockReturnValue(homeserverName);

    const testEmail = "tester@test.com";

    const addHomeserverToMockConfig = (homeservers: string[], featureList: string[] = []) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_features: {} };
        featureList.forEach((feature) => (config.tchap_features[feature] = homeservers));
        SdkConfig.put(config);
    };

    beforeEach(async () => {
        // Mock the email so that the section can be activated
        mockClient.getThreePids.mockResolvedValue({
            threepids: [
                // should render switch bc pushKey and address match
                {
                    medium: ThreepidMedium.Email,
                    address: testEmail,
                } as unknown as IThreepid,
            ],
        });

        mockClient.getPushRules.mockClear().mockResolvedValue(pushRules);
        mockClient.getPushers.mockClear().mockResolvedValue({ pushers: [] });
        mockClient.setPusher.mockReset().mockResolvedValue({});
        mockClient.pushRules = pushRules;

        await clearAllModals();
    });

    afterEach(() => {
        SdkConfig.reset(); // we touch the config, so clean up
        cleanup();
    });

    it("display well the caption when email notification feature is activated", async () => {
        // activate email notification in the config, otherwise the section won't appear
        addHomeserverToMockConfig([homeserverName], [featureEmailName]);

        await getComponentAndWait();

        fireEvent.click(screen.getByTestId("notif-master-switch"));

        await flushPromises();

        const emailToggle = screen.getByTestId("notif-email-switch");

        const caption = emailToggle.querySelector(".mx_Caption");

        expect(caption).toHaveClass("mx_Caption");
    });

    it("hides well the caption when email notification feature is deactivated for this homeserver", async () => {
        addHomeserverToMockConfig([homeserverName]);

        await getComponentAndWait();

        fireEvent.click(screen.getByTestId("notif-master-switch"));

        await flushPromises();

        expect(screen.queryByTestId("notif-email-switch")).not.toBeInTheDocument();
    });

    it("hides well the caption when email notification feature is not activated for this homeserver", async () => {
        addHomeserverToMockConfig(["other.server.fr"], [featureEmailName]);

        await getComponentAndWait();

        fireEvent.click(screen.getByTestId("notif-master-switch"));

        await flushPromises();

        expect(screen.queryByTestId("notif-email-switch")).not.toBeInTheDocument();
    });

    it("display well the tac notification switch when feature is activated", async () => {
        addHomeserverToMockConfig([homeserverName], [featurethreadName]);

        await getComponentAndWait();

        const tacNotifParentElement = screen.queryByTestId("tac-notification-parent");

        expect(tacNotifParentElement?.children.length).toBe(2);
    });

    it("display hides the tac notification switch when feature is deactivated", async () => {
        addHomeserverToMockConfig([homeserverName]);

        await getComponentAndWait();

        const tacNotifParentElement = screen.queryByTestId("tac-notification-parent");

        expect(tacNotifParentElement?.children.length).toBe(1);
    });
});
