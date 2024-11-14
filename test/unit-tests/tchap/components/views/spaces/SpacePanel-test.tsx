import React from "react";
import { render, cleanup } from "@testing-library/react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { stubClient } from "~tchap-web/test/test-utils";
import { wrapInMatrixClientContext, wrapInSdkContext } from "~tchap-web/test/test-utils";
import { SdkContextClass } from "~tchap-web/src/contexts/SDKContext";
import UnwrappedSpacePanel from "~tchap-web/src/components/views/spaces/SpacePanel";
import SdkConfig, { ConfigOptions } from "~tchap-web/src/SdkConfig";

jest.mock("~tchap-web/src/tchap/components/views/common/Gaufre.tsx", () => {
    return jest.fn((props: { isPanelCollapsed: boolean }) => <div>Mocked ChildComponent with text: </div>);
});

describe("<SpacePanel />", () => {
    const SpacePanel = wrapInSdkContext(wrapInMatrixClientContext(UnwrappedSpacePanel), SdkContextClass.instance);
    const featureThreadName: string = "feature_thread";
    const homeserverName: string = "my.home.server";

    const addHomeserverToMockConfig = (homeservers: string[], featureName: string) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_features: {} };
        config.tchap_features[featureName] = homeservers;
        SdkConfig.put(config);
    };

    const renderSpacePanel = () => render(<SpacePanel />);

    beforeEach(() => {
        const mockClient: MatrixClient = stubClient();
        jest.spyOn(mockClient, "getDomain").mockImplementation(() => homeserverName);
    });

    afterEach(() => {
        cleanup();
        SdkConfig.reset();
        jest.restoreAllMocks();
    });

    it("should render as expected", async () => {
        const { container } = renderSpacePanel();

        expect(container).toMatchSnapshot();
    });

    it("returns true when the the homeserver include thread feature", () => {
        addHomeserverToMockConfig([homeserverName], featureThreadName);
        const { container } = renderSpacePanel();

        expect(container.getElementsByClassName("mx_ThreadsActivityCentre_container").length).toBe(1);
    });

    it("returns false when the the homeserver doesnt include thread feature", async () => {
        addHomeserverToMockConfig(["other.homeserver"], featureThreadName);
        const { container } = renderSpacePanel();

        expect(container.getElementsByClassName("mx_ThreadsActivityCentre_container").length).toBe(0);
    });
});
