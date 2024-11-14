import { HttpApiEvent } from "matrix-js-sdk/src/matrix";
import { defaultDispatcher, MatrixDispatcher } from "~tchap-web/src/dispatcher/dispatcher";
import { ActionPayload } from "~tchap-web/src/dispatcher/payloads";
import { stopMatrixClient } from "~tchap-web/src/Lifecycle";
import { MatrixClientPeg } from "~tchap-web/src/MatrixClientPeg";
import Modal from "~tchap-web/src/Modal";
import PlatformPeg from "~tchap-web/src/PlatformPeg";
import { logger } from "matrix-js-sdk/src/logger";

import ExpiredAccountDialog from "../components/views/dialogs/ExpiredAccountDialog";
import TchapUtils from "../util/TchapUtils";

/*
 * Listens for HttpApiEvent.ORG_MATRIX_EXPIRED_ACCOUNT events and opens the panel ExpiredAccountDialog.
 * This component is required when activating the plugin synapse-email-account-validity on the server side:  https://github.com/matrix-org/synapse-email-account-validity
 * The class is instantiated in the default export, thus it is created only once at the first import.
 */
class ExpiredAccountHandler {
    private boundOnExpiredAccountEvent: any; //the listener function;
    private dispatcher: MatrixDispatcher;
    private isPanelOpen: boolean;
    private isAccountExpired: boolean;

    constructor() {
        this.boundOnExpiredAccountEvent = this.onExpiredAccountError.bind(this);
        this.dispatcher = defaultDispatcher;
        this.isPanelOpen = false;
        this.isAccountExpired = false;
    }

    /**
     * Register to listen to expired account event.
     * Registration is done after the Matrix Client has been initialized but before it is started.
     */
    public register() {
        const expiredRegistrationId = this.dispatcher.register((payload: ActionPayload) => {
            if (payload.action === "will_start_client") {
                logger.debug(":tchap: register a listener for HttpApiEvent.ORG_MATRIX_EXPIRED_ACCOUNT events");
                // safeGet will throw if client is not initialised yet. We don't handle it because we don't know when it would happen.
                const cli = MatrixClientPeg.safeGet();
                cli.on(HttpApiEvent.ORG_MATRIX_EXPIRED_ACCOUNT, this.boundOnExpiredAccountEvent);
                //unregister callback once the work is done
                this.dispatcher.unregister(expiredRegistrationId);
            }
        });
    }

    /**
     * When account expired account happens, display the panel if not open yet.
     */
    private onExpiredAccountError() {
        logger.debug(":tchap: Expired Account Error received");

        if (this.isPanelOpen) {
            return;
        }
        //shutdown all matrix react services, but without unsetting the client
        stopMatrixClient(false);
        logger.debug(":tchap: matrix react services have been shutdown");

        //should we sent the email directly? Normally they should have received already an email 7 days earlier
        this.showExpirationPanel();
        this.isPanelOpen = true;
    }

    private async showExpirationPanel() {
        Modal.createDialog(
            ExpiredAccountDialog,
            { /* props */
                onRequestNewEmail: () => {
                    return TchapUtils.requestNewExpiredAccountEmail();
                },
                //check that the account is not expired when finishing
                onFinished: async () => {
                    this.isPanelOpen = false;
                    PlatformPeg.get().reload();
                },
                //todo: define which static/dynamic settings are needed for this dialog
            },
            undefined /* className */,
            false /* isPriorityModal */,
            true /* isStaticModal */,
            { /* options */
                //close panel only if account is not expired
                onBeforeClose: async () => {
                    //verify that the account is not expired anymore
                    this.isAccountExpired = await TchapUtils.isAccountExpired();
                    return Promise.resolve(!this.isAccountExpired);
                },
            },
        );
    }
}

export default new ExpiredAccountHandler();
