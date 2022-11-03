import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import SdkConfig from "matrix-react-sdk/src/SdkConfig";
import AutoDiscoveryUtils from "matrix-react-sdk/src/utils/AutoDiscoveryUtils";
import { ValidatedServerConfig } from "matrix-react-sdk/src/utils/ValidatedServerConfig";

/**
 * Tchap utils.
 */

export default class TchapUtils {
    /**
         * Return a short value for getDomain().
         * @returns {string} The shortened value of getDomain().
         */
    static getShortDomain(): string {
        const cli = MatrixClientPeg.get();
        const baseDomain = cli.getDomain();
        const domain = baseDomain.split('.tchap.gouv.fr')[0].split('.').reverse().filter(Boolean)[0];

        return this.capitalize(domain) || 'Tchap';
    }

    /**
     * For the current user, get the room federation options.
     *
     * @returns { showRoomFederationOption: boolean, roomFederationDefault: boolean } options
     */
    static getRoomFederationOptions(): { showRoomFederationOption: boolean, roomFederationDefault: boolean } {
        const cli = MatrixClientPeg.get();
        const baseDomain = cli.getDomain();

        // Only show the federate switch to defense users : it's difficult to understand, so we avoid
        // displaying it unless it's really necessary.
        if (baseDomain === 'agent.intradef.tchap.gouv.fr') {
            return { showRoomFederationOption: true, roomFederationDefault: false };
        }

        return { showRoomFederationOption: false, roomFederationDefault: true };
    }

    /**
     * Capitalize a string.
     * @param {string} s The sting to capitalize.
     * @returns {string} The capitalized string.
     * @private
     */
    static capitalize(s: string): string {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    static findHomeServerNameFromUrl = (url: string): string => {
        const homeServerList = SdkConfig.get()['homeserver_list'];
        const homeserver = homeServerList.find(homeServer => homeServer.base_url === url);
        return homeserver.server_name;
    };

    static randomHomeServer = () => {
        const homeServerList = SdkConfig.get()['homeserver_list'];
        return homeServerList[Math.floor(Math.random() * homeServerList.length)];
    };

    /**
     * Find the homeserver corresponding to the given email.
     * @param email Note : if email is invalid, this function still works and returns the externs server. (todo : fix)
     * @returns
     */
    static fetchHomeserverForEmail = async (email: string): Promise<void | {base_url: string, server_name: string}> => {
        const randomHomeServer = this.randomHomeServer();
        const infoUrl = "/_matrix/identity/api/v1/info?medium=email&address=";
        return fetch(randomHomeServer.base_url + infoUrl + email)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Could not find homeserver for this email');
                }
                return response.json();
            })
            .then(response => {
                // Never returns error : anything that doesn't match a homeserver (even invalid email) returns "externe".
                const serverUrl = "https://matrix." + response.hs;
                return {
                    base_url: serverUrl,
                    server_name: this.findHomeServerNameFromUrl(serverUrl),
                };
            })
            .catch((error) => {
                console.error('Could not find homeserver for this email', error);
                return;
            });
    };

    /**
     * Make a ValidatedServerConfig from the server urls.
     * Todo : merge this function with fetchHomeserverForEmail, they are always used together anyway.
     * @param
     * @returns
     */
    static makeValidatedServerConfig = (serverConfig): ValidatedServerConfig => {
        const discoveryResult = {
            "m.homeserver": {
                state: "SUCCESS",
                error: null,
                base_url: serverConfig.base_url,
                server_name: serverConfig.server_name,
            },
            "m.identity_server": {
                state: "SUCCESS",
                error: null,
                base_url: serverConfig.base_url, // On Tchap our Identity server urls and home server urls are the same
                server_name: serverConfig.server_name,
            },
        };
        const validatedServerConf = AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(
            discoveryResult['m.homeserver'].server_name, discoveryResult);
        return validatedServerConf;
    };

    /**
     * Extract the name of the server from a home server address
     * @param serverName from "agent.dinum.beta.gouv.fr"
     * @returns to "Dinum"
     */
    static toFriendlyServerName = (serverName: string): string => {
        const serverUrl = "https://matrix." + serverName;
        const friendlyServerName = this.findHomeServerNameFromUrl(serverUrl);
        return this.capitalize(friendlyServerName);
    };

    /**
     * Ask the homeserver is cross signing is supported (async)
     * @returns Promise<true> is cross signing is supported by home server or false
     */
    static async isCrossSigningSupportedByServer(): Promise<boolean> {
        const cli = MatrixClientPeg.get();
        return cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing");
    }

    /**
     * @returns string The url to pass in next_link during registration. Compared to element-web, the hostname
     * is the homeserver instead of the tchap-web server. This changes the flow to avoid the redirection to
     * tchap-web, because tchap-web gets a "M_THREEPID_IN_USE" error from backend which is confusing.
     * We should fix this bug and remove this custom function.
     */
    static makeTchapRegistrationUrl(
        params: {client_secret: string, hs_url: string, is_url: string, session_id: string}): string {
        let url: string = params.hs_url + window.location.pathname + '#/register';

        const keys = Object.keys(params);
        for (let i = 0; i < keys.length; ++i) {
            if (i === 0) {
                url += '?';
            } else {
                url += '&';
            }
            const k = keys[i];
            url += k + '=' + encodeURIComponent(params[k]);
        }
        return url;
    }
}
