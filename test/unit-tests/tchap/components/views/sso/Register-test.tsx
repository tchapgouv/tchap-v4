import React from "react";
import { render } from "jest-matrix-react";
import { mocked, MockedObject } from "jest-mock";
import { MatrixClient, MatrixError, OidcClientConfig, createClient } from "matrix-js-sdk/src/matrix";
import fetchMock from "fetch-mock";

import SdkConfig, { ConfigOptions, DEFAULTS } from "~tchap-web/src/SdkConfig";
import Registration from "~tchap-web/src/components/structures/auth/Registration";
import {
    getMockClientWithEventEmitter,
    mkServerConfig,
    mockPlatformPeg,
    unmockPlatformPeg,
} from "~tchap-web/test/test-utils";
import { makeDelegatedAuthConfig } from "~tchap-web/test/test-utils/oidc";
import SettingsStore from "~tchap-web/src/settings/SettingsStore";
import AutoDiscoveryUtils from "~tchap-web/src/utils/AutoDiscoveryUtils";
import { ValidatedServerConfig } from "~tchap-web/src/utils/ValidatedServerConfig";

jest.mock("~tchap-web/src/utils/oidc/authorize", () => ({
    startOidcLogin: jest.fn(),
}));

jest.mock("matrix-js-sdk/src/matrix", () => ({
    ...jest.requireActual("matrix-js-sdk/src/matrix"),
    createClient: jest.fn(),
}));

/** The matrix versions our mock server claims to support */
const SERVER_SUPPORTED_MATRIX_VERSIONS = ["v1.1", "v1.5", "v1.6", "v1.8", "v1.9"];

describe("<Register />", () => {
    let mockClient!: MockedObject<MatrixClient>;

    const defaultHsUrl = "https://matrix.org";
    const defaultIsUrl = "https://vector.im";

    const addSSOFlowToMockConfig = (isActive: boolean = false) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_sso_flow: { isActive } };
        SdkConfig.put(config);
    };

    const defaultProps = {
        defaultDeviceDisplayName: "test-device-display-name",
        onLoggedIn: jest.fn(),
        onLoginClick: jest.fn(),
        onServerConfigChange: jest.fn(),
    };

    function getRawComponent(hsUrl = defaultHsUrl, isUrl = defaultIsUrl, authConfig?: OidcClientConfig) {
        return <Registration {...defaultProps} serverConfig={mkServerConfig(hsUrl, isUrl, authConfig)} />;
    }

    beforeEach(async function () {
        const authConfig = makeDelegatedAuthConfig();
        // @ts-ignore
        authConfig.metadata["prompt_values_supported"] = ["create"];

        SdkConfig.put({
            ...DEFAULTS,
            disable_custom_urls: true,
        });
        mockClient = await getMockClientWithEventEmitter({
            registerRequest: jest.fn().mockImplementation(
                () =>
                    new MatrixError(
                        {
                            flows: [{ stages: [] }],
                        },
                        401,
                    ),
            ),
            loginFlows: jest.fn().mockResolvedValue({ flows: [{ type: "m.login.sso" }, { type: "m.login.password" }] }),
            getVersions: jest.fn().mockResolvedValue({ versions: SERVER_SUPPORTED_MATRIX_VERSIONS }),
        });

        // used for registerRequest, but should return a MatrixError instance for the code to work... which is not the case here
        fetchMock.catch({
            status: 401,
            body: '{"errcode": "M_UNAUTHORIZE", "error": "Unauthorize request"}',
            headers: { "content-type": "application/json" },
        });

        // Doing this line can mock the request we want, but we want it to throw an error 401 which this doesnt do
        // fetchMock.post(`${defaultHsUrl}/_matrix/client/v3/register`, { status: 401, type: "error" });

        await mocked(createClient).mockImplementation((opts) => {
            mockClient.idBaseUrl = opts.idBaseUrl;
            mockClient.baseUrl = opts.baseUrl;
            return mockClient;
        });

        fetchMock.get(`${defaultHsUrl}/_matrix/client/versions`, {
            unstable_features: {},
            versions: SERVER_SUPPORTED_MATRIX_VERSIONS,
        });

        fetchMock.get(`${defaultHsUrl}/_matrix/client/unstable/org.matrix.msc2965/auth_issuer`, {
            issuer: authConfig.metadata.issuer,
        });

        fetchMock.get("https://auth.org/.well-known/openid-configuration", authConfig.metadata);

        fetchMock.get(authConfig.metadata.jwks_uri!, { keys: [] });

        fetchMock.get(`${defaultHsUrl}/_matrix/client/v3/login`, {
            body: { flows: [{ type: "m.login.sso" }, { type: "m.login.password" }] },
        });

        jest.spyOn(SettingsStore, "getValue").mockImplementation(() => false);

        jest.spyOn(AutoDiscoveryUtils, "validateServerConfigWithStaticUrls").mockResolvedValue({
            hsName: "example.com",
        } as ValidatedServerConfig);

        mockPlatformPeg({
            startSingleSignOn: jest.fn(),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fetchMock.restore();
        SdkConfig.reset(); // we touch the config, so clean up
        unmockPlatformPeg();
    });

    /** TODO weird behavior of requestregister which the mock is not detected
     * So it will al<ays display an error and the loader wont disapear
     * Will need to fix this mocked request and it should be good
     *
     */
    // it("returns proconnect button in register when the config include sso flow", async () => {
    //     addSSOFlowToMockConfig(true);

    //     const { container } = render(getRawComponent());

    //     await waitForElementToBeRemoved(() => screen.queryAllByTestId("spinner"));

    //     screen.debug();

    //     expect(container.getElementsByClassName("tc_pronnect").length).toBe(1);
    // });

    it("returns no proconnect button when the config does'nt include sso flow", () => {
        addSSOFlowToMockConfig(false);

        const { container } = render(getRawComponent());

        expect(container.getElementsByClassName("tc_pronnect").length).toBe(0);
    });
});
