/**
 * Tchap UI Feature flags
 */

import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import SdkConfig from "~tchap-web/src/SdkConfig";

export default class TchapUIFeature {
    /**
     * This flag controls weither space related settings should be displayed or not. It differs from the flag UIComponent.CreateSpaces.
     * It is intended to add more fine-grained control over spaces disablement.
     */
    public static isSpaceDisplayEnabled = true;

    /**
     * This flag controls weither Terms and Conditions should be accepted automatically or not.
     */
    public static autoAcceptTermsAndConditions = true;

    /**
     * This flag controls weither Email, Phone and Discovery UI should be displayed or not in General Settings.
     */
    public static showEmailPhoneDiscoverySettings = false;

    /**
     * This flag controls weither clearCacheAndReload can be queued at application start at V4 upgrade
     */
    public static activateClearCacheAndReloadAtVersion4 = true;

    /**
     * Hide UI for widget and integration manager. We use a flag cause it may be useful for future usecase
     */
    public static showWidgetsSettings = false;

    /**
     * Whether the given feature is active on the current user's homeserver.
     * We get the list of homeservers where the feature should be activated from config.json
     * Example : add this in config.json
     *     {..
     *         "tchap_features":{
     *             "feature_email_notification": ["dev01.tchap.incubateur.net"] // only dev01 has the feature
     *             "feature_thread": ["*"] // all servers have the feature
     *             "feature_space": ["*", "dev01.tchap.incubateur.net"] // all servers have the feature, 2rd arg is ignored.
     *         }
     *         ..
     *     }
    */
    public static isFeatureActiveForHomeserver(feature:string):boolean {
        const homeserversWithFeature:[string] = SdkConfig.get("tchap_features")?.[feature] || [];

        if (homeserversWithFeature.indexOf("*") > -1) {
            return true;
        }

        const userHomeServer = MatrixClientPeg.safeGet().getDomain();
        return homeserversWithFeature.includes(userHomeServer!);
    }

    // We separate from previous method, cause in this feature we cannot differenciate between homeserver since it is before the user connexion
    public static isSSOFlowActive():boolean {
        const ssoFlow : Record<string, boolean> = SdkConfig.get("tchap_sso_flow") as Record<string, boolean> ?? {isActive: false};

        return ssoFlow.isActive;
    }


}
