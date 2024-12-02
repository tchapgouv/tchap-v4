import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { stubClient } from "~tchap-web/test/test-utils";
import SdkConfig, { ConfigOptions } from "~tchap-web/src/SdkConfig";
import TchapUIFeature from "~tchap-web/src/tchap/util/TchapUIFeature";

describe("TchapUIFeature", () => {
    const featureName: string = "my_funky_feature";
    const homeserverName: string = "my.home.server";

    beforeAll(() => {
        SdkConfig.reset(); // in case other tests didn't clean up
    });

    beforeEach(() => {
        const mockClient: MatrixClient = stubClient();
        jest.spyOn(mockClient, "getDomain").mockImplementation(() => homeserverName);
    });

    afterEach(function () {
        SdkConfig.reset(); // we touch the config, so clean up
    });

    const mockFeatureConfig = (homeservers: string[]) => {
        // mock SdkConfig.get("tchap_features")
        const config: ConfigOptions = { tchap_features: {} };
        config.tchap_features[featureName] = homeservers;
        SdkConfig.put(config);
    };

    it("returns true when the user's homeserver is listed in config", () => {
        mockFeatureConfig([homeserverName, "some.other.server"]);
        expect(TchapUIFeature.isFeatureActiveForHomeserver(featureName)).toEqual(true);
    });

    it("returns false when the user's homeserver is not listed in config", () => {
        mockFeatureConfig(["some.other.server"]);
        expect(TchapUIFeature.isFeatureActiveForHomeserver(featureName)).toEqual(false);
    });

    it("returns true when '*' is alone in config", () => {
        mockFeatureConfig(["*"]);
        expect(TchapUIFeature.isFeatureActiveForHomeserver(featureName)).toEqual(true);
    });

    it("returns true when '*' is anywhere in config", () => {
        mockFeatureConfig(["some.other.server", "*"]);
        expect(TchapUIFeature.isFeatureActiveForHomeserver(featureName)).toEqual(true);
    });

    it("returns false when no tchap_features in config", () => {
        const config: ConfigOptions = {};
        SdkConfig.put(config);
        expect(TchapUIFeature.isFeatureActiveForHomeserver(featureName)).toEqual(false);
    });
});
