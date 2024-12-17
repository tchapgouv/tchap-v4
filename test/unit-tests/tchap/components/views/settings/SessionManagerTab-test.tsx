/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render } from "jest-matrix-react";
import { logger } from "matrix-js-sdk/src/logger";
import { CryptoApi, DeviceVerificationStatus, VerificationRequest } from "matrix-js-sdk/src/crypto-api";
import {
    LOCAL_NOTIFICATION_SETTINGS_PREFIX,
    MatrixEvent,
    PUSHER_DEVICE_ID,
    PUSHER_ENABLED,
    GET_LOGIN_TOKEN_CAPABILITY,
    MatrixClient,
} from "matrix-js-sdk/src/matrix";
import { mocked, MockedObject } from "jest-mock";
import fetchMock from "fetch-mock-jest";

import {
    clearAllModals,
    flushPromises,
    getMockClientWithEventEmitter,
    mkPusher,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockPlatformPeg,
} from "~tchap-web/test/test-utils";
import SessionManagerTab from "~tchap-web/src/components/views/settings/tabs/user/SessionManagerTab";
import SettingsStore from "~tchap-web/src/settings/SettingsStore";
import { SDKContext, SdkContextClass } from "~tchap-web/src/contexts/SDKContext";
import { mockOpenIdConfiguration } from "~tchap-web/test/test-utils/oidc";
import MatrixClientContext from "~tchap-web/src/contexts/MatrixClientContext";

// In tchap there is no much modification, exept on the QR code login that is not shown for now
// So the rest of the tests are the same as element-web

mockPlatformPeg();

// to restore later
const realWindowLocation = window.location;

describe("<SessionManagerTab />", () => {
    const aliceId = "@alice:server.org";
    const deviceId = "alices_device";

    const alicesDevice = {
        device_id: deviceId,
        display_name: "Alices device",
    };

    const alicesMobileDevice = {
        device_id: "alices_mobile_device",
        last_seen_ts: Date.now(),
    };

    const mockVerificationRequest = {
        cancel: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    } as unknown as VerificationRequest;

    const mockCrypto = mocked({
        getDeviceVerificationStatus: jest.fn(),
        getUserDeviceInfo: jest.fn(),
        requestDeviceVerification: jest.fn().mockResolvedValue(mockVerificationRequest),
        supportsSecretsForQrLogin: jest.fn().mockReturnValue(false),
        isCrossSigningReady: jest.fn().mockReturnValue(true),
    } as unknown as CryptoApi);

    let mockClient!: MockedObject<MatrixClient>;
    let sdkContext: SdkContextClass;

    const defaultProps = {};
    const getComponent = (props = {}): React.ReactElement => (
        <SDKContext.Provider value={sdkContext}>
            <MatrixClientContext.Provider value={mockClient}>
                <SessionManagerTab {...defaultProps} {...props} />
            </MatrixClientContext.Provider>
        </SDKContext.Provider>
    );

    beforeEach(async () => {
        mockClient = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(aliceId),
            ...mockClientMethodsServer(),
            getCrypto: jest.fn().mockReturnValue(mockCrypto),
            getDevices: jest.fn(),
            getDeviceId: jest.fn().mockReturnValue(deviceId),
            deleteMultipleDevices: jest.fn(),
            generateClientSecret: jest.fn(),
            setDeviceDetails: jest.fn(),
            getAccountData: jest.fn(),
            deleteAccountData: jest.fn(),
            doesServerSupportUnstableFeature: jest.fn().mockResolvedValue(true),
            getPushers: jest.fn(),
            setPusher: jest.fn(),
            setLocalNotificationSettings: jest.fn(),
            getAuthIssuer: jest.fn().mockReturnValue(new Promise(() => {})),
        });
        jest.clearAllMocks();
        jest.spyOn(logger, "error").mockRestore();
        mockCrypto.getDeviceVerificationStatus.mockReset().mockResolvedValue(new DeviceVerificationStatus({}));

        mockClient.getDevices.mockReset().mockResolvedValue({ devices: [alicesDevice, alicesMobileDevice] });

        mockClient.getPushers.mockReset().mockResolvedValue({
            pushers: [
                mkPusher({
                    [PUSHER_DEVICE_ID.name]: alicesMobileDevice.device_id,
                    [PUSHER_ENABLED.name]: true,
                }),
            ],
        });

        // @ts-ignore mock
        mockClient.store = { accountData: new Map() };

        mockClient.getAccountData.mockReset().mockImplementation((eventType) => {
            if (eventType.startsWith(LOCAL_NOTIFICATION_SETTINGS_PREFIX.name)) {
                return new MatrixEvent({
                    type: eventType,
                    content: {
                        is_silenced: false,
                    },
                });
            }
        });

        sdkContext = new SdkContextClass();
        sdkContext.client = mockClient;

        // @ts-ignore allow delete of non-optional prop
        delete window.location;
        // @ts-ignore ugly mocking
        window.location = {
            href: "https://localhost/",
            origin: "https://localhost/",
        };

        // sometimes a verification modal is in modal state when these tests run
        // make sure the coast is clear
        await clearAllModals();
    });

    afterAll(() => {
        window.location = realWindowLocation;
    });

    describe("MSC4108 QR code login", () => {
        const settingsValueSpy = jest.spyOn(SettingsStore, "getValue");
        const issuer = "https://issuer.org";
        const openIdConfiguration = mockOpenIdConfiguration(issuer);

        beforeEach(() => {
            settingsValueSpy.mockClear().mockReturnValue(true);
            // enable server support for qr login
            mockClient.getVersions.mockResolvedValue({
                versions: [],
                unstable_features: {
                    "org.matrix.msc4108": true,
                },
            });
            mockClient.getCapabilities.mockResolvedValue({
                [GET_LOGIN_TOKEN_CAPABILITY.name]: {
                    enabled: true,
                },
            });
            mockClient.getAuthIssuer.mockResolvedValue({ issuer });
            mockCrypto.exportSecretsBundle = jest.fn();
            fetchMock.mock(`${issuer}/.well-known/openid-configuration`, {
                ...openIdConfiguration,
                grant_types_supported: [
                    ...openIdConfiguration.grant_types_supported,
                    "urn:ietf:params:oauth:grant-type:device_code",
                ],
            });
            fetchMock.mock(openIdConfiguration.jwks_uri!, {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
                keys: [],
            });
        });

        // in tchap we hide all those sections
        it("should not renders qr code login section", async () => {
            const { queryByText } = render(getComponent());

            // wait for versions call to settle
            await flushPromises();

            expect(queryByText("Link new device")).toBeFalsy();
        });
    });
});
