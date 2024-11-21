import React from "react";
import { MatrixCall , CallState } from "matrix-js-sdk/src/webrtc/call";
import { fireEvent, render, waitFor } from "jest-matrix-react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import SdkConfig, { ConfigOptions } from "~tchap-web/src/SdkConfig";
import { stubClient } from "~tchap-web/test/test-utils";
import LegacyCallView from "~tchap-web/src/components/views/voip/LegacyCallView";
import DMRoomMap from "~tchap-web/src/utils/DMRoomMap";

describe("LegacyCallView", () => {
    const featureName: string = "feature_video_call";
    const homeserverName: string = "my.home.server";
    const roomId: string = "roomId";
    // const fakeCall: MatrixCall = new FakeCall(roomId) as unknown as MatrixCall;
    let fakeCall: MatrixCall;

    beforeAll(() => {
        SdkConfig.reset(); // in case other tests didn't clean up
    });

    beforeEach(() => {
        const mockClient: MatrixClient = stubClient();
        mockClient.isFallbackICEServerAllowed = jest.fn();
        jest.spyOn(mockClient, "getDomain").mockImplementation(() => homeserverName);

        const dmRoomMap = new DMRoomMap(mockClient);

        jest.spyOn(dmRoomMap, "getUserIdForRoomId");
        jest.spyOn(DMRoomMap, "shared").mockReturnValue(dmRoomMap);

        fakeCall = new MatrixCall({
            client: mockClient,
            roomId,
        });

        jest.spyOn(fakeCall, "state", "get").mockReturnValue(CallState.Connected);
        jest.spyOn(fakeCall, "isLocalOnHold").mockReturnValue(false);
        jest.spyOn(fakeCall, "isRemoteOnHold").mockReturnValue(false);
        jest.spyOn(fakeCall, "isMicrophoneMuted").mockReturnValue(false);
        jest.spyOn(fakeCall, "isLocalVideoMuted").mockReturnValue(true);
        jest.spyOn(fakeCall, "isScreensharing").mockReturnValue(false);
        jest.spyOn(fakeCall, "isScreensharing").mockReturnValue(false);
    });

    afterEach(function () {
        SdkConfig.reset(); // we touch the config, so clean up
        jest.clearAllMocks();
    });

    const mockFeatureConfig = (homeservers: string[]) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_features: {} };
        config.tchap_features[featureName] = homeservers;
        config.tchap_features["feature_screenshare_call"] = homeservers;
        SdkConfig.put(config);
    };

    const renderCallView = () => {
        return render(
            <LegacyCallView
                key="call-view"
                onMouseDownOnHeader={() => null}
                call={fakeCall}
                secondaryCall={fakeCall}
                pipMode={false}
                onResize={() => null}
            />,
        );
    };

    it("returns true when the the homeserver include video_call feature", () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(true);

        mockFeatureConfig([homeserverName]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_vid").length).toBe(1);
    });

    it("returns false when the the homeserver doesnt include video_call feature", async () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(true);

        mockFeatureConfig(["other.homeserver"]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_vid").length).toBe(0);
    });

    it("returns false when the call doesnt support opponentSupportsSDPStreamMetadata or hasLocalUserMediaVideoTrack", async () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(false);
        jest.spyOn(fakeCall, "hasLocalUserMediaVideoTrack", "get").mockReturnValue(false);

        mockFeatureConfig([homeserverName]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_vid").length).toBe(0);
    });

    it("returns true when the call support opponentSupportsSDPStreamMetadata", async () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(true);
        jest.spyOn(fakeCall, "hasLocalUserMediaVideoTrack", "get").mockReturnValue(false);

        mockFeatureConfig([homeserverName]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_vid").length).toBe(1);
    });

    it("returns true when the call support hasLocalUserMediaVideoTrack", async () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(false);
        jest.spyOn(fakeCall, "hasLocalUserMediaVideoTrack", "get").mockReturnValue(true);

        mockFeatureConfig([homeserverName]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_vid").length).toBe(1);
    });

    it("should display screenshare button when the the homeserver include feature_screenshare_call feature", () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(true);

        mockFeatureConfig([homeserverName]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_screensharing").length).toBe(1);
    });

    it("should not display screenshare button when the the homeserver doesnt include feature_screenshare_call feature", async () => {
        jest.spyOn(fakeCall, "opponentSupportsSDPStreamMetadata").mockReturnValue(true);

        mockFeatureConfig(["other.homeserver"]);
        const { container } = renderCallView();

        // needs to hover on the component to make the control button appears
        fireEvent.mouseEnter(container);
        waitFor(() => container.getElementsByClassName("mx_LegacyCallViewButtons").length);

        expect(container.getElementsByClassName("mx_LegacyCallViewButtons_button_screensharing").length).toBe(0);
    });
});
