import React from "react";
import { render, cleanup, fireEvent, screen, act } from "jest-matrix-react";
import { mocked, MockedObject } from "jest-mock";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import EmailVerificationPage from "~tchap-web/src/tchap/components/views/sso/EmailVerificationPage";
import TchapUtils from "~tchap-web/src/tchap/util/TchapUtils";
import { ValidatedServerConfig } from "~tchap-web/src/utils/ValidatedServerConfig";
import { flushPromises, mockPlatformPeg, stubClient } from "~tchap-web/test/test-utils";
import BasePlatform from "~tchap-web/src/BasePlatform";
import Login from "~tchap-web/src/Login";

jest.mock("~tchap-web/src/PlatformPeg");
jest.mock("~tchap-web/src/tchap/util/TchapUtils");
jest.mock("~tchap-web/src/Login");

describe("<EmailVerificationPage />", () => {
    const userEmail = "marc@tchap.beta.gouv.fr";
    const defaultHsUrl = "https://matrix.agent1.fr";
    const secondHsUrl = "https://matrix.agent2.fr";

    const PlatformPegMocked: MockedObject<BasePlatform> = mockPlatformPeg();
    const mockedClient: MatrixClient = stubClient();
    const mockedTchapUtils = mocked(TchapUtils);
    const mockedLogin = Login as jest.Mock;

    const mockedFetchHomeserverFromEmail = (hs: string = defaultHsUrl) => {
        mockedTchapUtils.fetchHomeserverForEmail.mockImplementation(() =>
            Promise.resolve({ base_url: hs, server_name: hs }),
        );
    };

    const mockedValidatedServerConfig = (withError: boolean = false, hsUrl: string = defaultHsUrl) => {
        if (withError) {
            mockedTchapUtils.makeValidatedServerConfig.mockImplementation(() => {
                throw new Error();
            });
        } else {
            mockedTchapUtils.makeValidatedServerConfig.mockImplementation(() =>
                Promise.resolve({
                    hsUrl: defaultHsUrl,
                    hsName: "hs",
                    hsNameIsDifferent: false,
                    isUrl: "",
                    isDefault: true,
                    isNameResolvable: true,
                    warning: "",
                } as ValidatedServerConfig),
            );
        }
    };

    const mockedPlatformPegStartSSO = (withError: boolean) => {
        if (withError) {
            jest.spyOn(PlatformPegMocked, "startSingleSignOn").mockImplementation(() => {
                throw new Error();
            });
        } else {
            jest.spyOn(PlatformPegMocked, "startSingleSignOn").mockImplementation(() => {});
        }
    };

    const renderEmailVerificationPage = () => render(<EmailVerificationPage />);

    beforeEach(() => {
        mockedLogin.mockImplementation(() => ({
            hsUrl: defaultHsUrl,
            createTemporaryClient: jest.fn().mockReturnValue(mockedClient),
            getFlows: jest.fn().mockResolvedValue([{ type: "m.login.sso" }]),
        }));
    });

    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
    });

    it("returns error when empty email", async () => {
        renderEmailVerificationPage();

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: "" } });

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");

        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        // Submit button should be disabled
        expect(proconnectButton).toHaveAttribute("disabled");
    });

    it("returns inccorrect email", async () => {
        renderEmailVerificationPage();

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: "falseemail" } });

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        // Submit button should be disabled
        expect(proconnectButton).toHaveAttribute("disabled");
    });

    it("should throw error when homeserver catch an error", async () => {
        const { container } = renderEmailVerificationPage();

        // mock server returns an errorn, we dont need to mock the other implementation
        // since the code should throw an error before accessing them
        mockedValidatedServerConfig(true);

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: userEmail } });

        await flushPromises();
        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        // Error classes should not appear
        expect(container.getElementsByClassName("mx_ErrorMessage").length).toBe(1);
    });

    it("should throw and error when connecting to proconnect error", async () => {
        const { container } = renderEmailVerificationPage();

        mockedValidatedServerConfig(false);
        // mock platform page startsso error
        mockedPlatformPegStartSSO(true);

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: userEmail } });

        await flushPromises();

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        // Error classes should not appear
        expect(container.getElementsByClassName("mx_ErrorMessage").length).toBe(1);
    });

    it("should start sso with correct homeserver 1", async () => {
        renderEmailVerificationPage();

        // Mock the implementation without error, what we want is to be sure they are called with the correct parameters
        mockedFetchHomeserverFromEmail(defaultHsUrl);
        mockedValidatedServerConfig(false, defaultHsUrl);
        mockedPlatformPegStartSSO(false);

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: userEmail } });

        await flushPromises();

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        expect(mockedTchapUtils.makeValidatedServerConfig).toHaveBeenCalledWith({
            base_url: defaultHsUrl,
            server_name: defaultHsUrl,
        });
        expect(PlatformPegMocked.startSingleSignOn).toHaveBeenCalledTimes(1);
    });

    it("should start sso with correct homeserver 2", async () => {
        renderEmailVerificationPage();

        // Mock the implementation without error, what we want is to be sure they are called with the correct parameters
        mockedFetchHomeserverFromEmail(secondHsUrl);
        mockedValidatedServerConfig(false, secondHsUrl);
        mockedPlatformPegStartSSO(false);

        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: userEmail } });

        await flushPromises();

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        expect(mockedTchapUtils.makeValidatedServerConfig).toHaveBeenCalledWith({
            base_url: secondHsUrl,
            server_name: secondHsUrl,
        });
        expect(PlatformPegMocked.startSingleSignOn).toHaveBeenCalledTimes(1);
    });

    it("should display error when sso is not configured in homeserer", async () => {
        const { container } = renderEmailVerificationPage();

        // Mock the implementation without error, what we want is to be sure they are called with the correct parameters
        mockedFetchHomeserverFromEmail(secondHsUrl);
        mockedValidatedServerConfig(false, secondHsUrl);
        mockedPlatformPegStartSSO(false);
        // get flow without sso configured on homeserver
        mockedLogin.mockImplementation(() => ({
            hsUrl: secondHsUrl,
            createTemporaryClient: jest.fn().mockReturnValue(mockedClient),
            getFlows: jest.fn().mockResolvedValue([{ type: "m.login.password" }]),
        }));
        // Put text in email field
        const emailField = screen.getByRole("textbox");
        fireEvent.focus(emailField);
        fireEvent.change(emailField, { target: { value: userEmail } });

        await flushPromises();

        // click on proconnect button
        const proconnectButton = screen.getByTestId("proconnect-submit");
        await act(async () => {
            await fireEvent.click(proconnectButton);
        });

        expect(container.getElementsByClassName("mx_ErrorMessage").length).toBe(1);
    });
});
