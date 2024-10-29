import { render } from "@testing-library/react";
import React from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { mocked, MockedObject } from "jest-mock";
import AccountUserSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/user/AccountUserSettingsTab";
import { SdkContextClass, SDKContext } from "matrix-react-sdk/src/contexts/SDKContext";
import SettingsStore from "matrix-react-sdk/src/settings/SettingsStore";
import { UIFeature } from "matrix-react-sdk/src/settings/UIFeature";
import { OidcClientStore } from "matrix-react-sdk/src/stores/oidc/OidcClientStore";
import MatrixClientContext from "matrix-react-sdk/src/contexts/MatrixClientContext";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockPlatformPeg,
} from "matrix-react-sdk/test/test-utils";
import { useId } from "matrix-react-sdk/src/utils/useId";

jest.mock(
    "matrix-react-sdk/src/components/views/settings/ChangePassword",
    () =>
        ({ onError, onFinished }: { onError: (e: Error) => void; onFinished: () => void }) => {
            return <button>Mock change password</button>;
        },
);

jest.mock("matrix-react-sdk/src/utils/useId");

describe("<AccountUserSettingsTab />", () => {
    const defaultProps = {
        closeSettingsFn: jest.fn(),
    };

    const userId = "@alice:server.org";
    let mockClient: MockedObject<MatrixClient>;

    let stores: SdkContextClass;

    const getComponent = () => (
        <MatrixClientContext.Provider value={mockClient}>
            <SDKContext.Provider value={stores}>
                <AccountUserSettingsTab {...defaultProps} />
            </SDKContext.Provider>
        </MatrixClientContext.Provider>
    );

    beforeEach(() => {
        jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        mockPlatformPeg();
        jest.clearAllMocks();
        jest.spyOn(SettingsStore, "getValue").mockRestore();
        jest.spyOn(logger, "error").mockRestore();

        mockClient = getMockClientWithEventEmitter({
            ...mockClientMethodsUser(userId),
            ...mockClientMethodsServer(),
            getCapabilities: jest.fn(),
            getThreePids: jest.fn(),
            getIdentityServerUrl: jest.fn(),
            deleteThreePid: jest.fn(),
        });

        mockClient.getCapabilities.mockResolvedValue({});
        mockClient.getThreePids.mockResolvedValue({
            threepids: [],
        });
        mockClient.deleteThreePid.mockResolvedValue({
            id_server_unbind_result: "success",
        });

        stores = new SdkContextClass();
        stores.client = mockClient;
        // stub out this store completely to avoid mocking initialisation
        const mockOidcClientStore = {} as unknown as OidcClientStore;
        jest.spyOn(stores, "oidcClientStore", "get").mockReturnValue(mockOidcClientStore);
        jest.spyOn(SettingsStore, "getValue").mockImplementation(
            (settingName: string) => settingName === UIFeature.Deactivate,
        );

        // labelled id on username is autogeneraed, we fix it so that snapshot is always the same
        mocked(useId).mockImplementation(() => "1234");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("common view snapshot", () => {
        it("should render section when account deactivation feature is enabled", () => {
            const { container } = render(getComponent());

            expect(container).toMatchSnapshot();
        });
    });
});
