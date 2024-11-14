import { IncomingRoomKeyRequest, verificationMethods } from "matrix-js-sdk/src/crypto";
import VerificationRequestDialog from "~tchap-web/src/components/views/dialogs/VerificationRequestDialog";
import Modal from "~tchap-web/src/Modal";
import { hideToast as hideUnverifiedSessionsToast } from "~tchap-web/src/toasts/UnverifiedSessionToast";

/**
@deprecated
* :tchap: inspired from
 * https://github.com/matrix-org/~tchap-web/blob/515304d32ebcfee403791c6f4f11a5ecc29e9e65/src/KeyRequestHandler.js
 

This class was used in MatrixChat 
// legacy export
 export { default as Views } from "../../Views";
@@ -1587,6 +1590,26 @@ export default class MatrixChat extends React.PureComponent<IProps, IState> {
         cli.on(HttpApiEvent.SessionLoggedOut, () => dft.stop());
         cli.on(MatrixEventEvent.Decrypted, (e, err) => dft.eventDecrypted(e, err as DecryptionError));
 
+        //:tchap: add listener to handle incomingKeyRequest and trigger legacy verification process
+        //the one with the emoji
+        //this listener can be forced with forceLegacyIncomingRoomKeyVerification
+        //or is added only if the xs is not active
+        if(TchapUIFeature.forceLegacyIncomingRoomKeyVerification || 
+            !TchapUIFeature.isCrossSigningAndSecureStorageActive()){
+            //TCHAP: Désactiver le partage legacy de clefs avec les appareils mobiles
+            console.log(':tchap: activate the legacy incoming key verification')
+            const krh = new KeyRequestHandler(cli);
+            cli.on(CryptoEvent.RoomKeyRequest, (req) => {
+                krh.handleKeyRequest(req);
+            });
+    
+             cli.on(CryptoEvent.RoomKeyRequestCancellation, (req) => {
+                krh.handleKeyRequestCancellation(req);
+            });
+        }
+        //:tchap: end of tchap
+        

*/
export default class KeyRequestHandler {
    private _matrixClient;
    private _currentUser: string;
    private _currentDevice: string;
    // MAP <userId,  MAP <deviceId, [keyRequest] >
    private _pendingKeyRequests = new Map<string, Map<string, Array<IncomingRoomKeyRequest>>>(); //Map<userId, Map<deviceId, array of requests>>

    constructor(matrixClient) {
        this._matrixClient = matrixClient;

        // the user/device for which we currently have a dialog open
        this._currentUser = null;
        this._currentDevice = null;

        // MAP <userId,  MAP <deviceId, [keyRequest] >
        //TODO should be change to a MAP
        //this._pendingKeyRequests = Object.create(null);
        //this._pendingKeyRequests = new Map();
    }

    /**
     * Handle incoming key request event
     * @param keyRequest
     * @returns
     */
    public handleKeyRequest(keyRequest: IncomingRoomKeyRequest): void {
        const userId: string = keyRequest.userId;
        const deviceId: string = keyRequest.deviceId;
        const requestId: string = keyRequest.requestId;

        console.log(":tchap: receiving a legacy key request event for device ", deviceId, " requestId ", requestId);

        //This instruction hides the toast that appears when a new device is detected
        //As we are receiving a legacy incomingroomkeyrequest we can assume the veryfing
        //will occur via this process and hide the toast
        console.log(":tchap: hidding UnverifiedSessionsToast for ", deviceId);
        hideUnverifiedSessionsToast(deviceId);

        if (!this._pendingKeyRequests.has(userId)) {
            this._pendingKeyRequests.set(userId, new Map<string, Array<IncomingRoomKeyRequest>>());
        }
        if (!this._pendingKeyRequests.get(userId).has(deviceId)) {
            this._pendingKeyRequests.get(userId).set(deviceId, []);
        }

        // check if we already have this request
        const requests: Array<IncomingRoomKeyRequest> = this._pendingKeyRequests.get(userId).get(deviceId);
        if (requests.find((r) => r.requestId === requestId)) {
            console.log(":tchap: Already have this key request, ignoring");
            return;
        }

        requests.push(keyRequest);

        if (this._currentUser) {
            // ignore for now
            console.log(":tchap: Key request, but we already have a dialog open");
            return;
        }

        this.processNextRequest();
    }

    /**
     * Handle incoming key request cancellation event
     * @param keyRequest : IncomingRoomKeyRequestCancellation (:tchap: can not be typed because it is not exported in react-js)
     * @returns
     */
    public handleKeyRequestCancellation(cancellation) {
        // see if we can find the request in the queue
        const userId = cancellation.userId;
        const deviceId = cancellation.deviceId;
        const requestId = cancellation.requestId;

        if (userId === this._currentUser && deviceId === this._currentDevice) {
            console.log(":tchap: room key request cancellation for the user we currently have a" + " dialog open for");
            // TODO: update the dialog. For now, we just ignore the
            // cancellation.
            return;
        }

        if (!this._pendingKeyRequests.has(userId) || !this._pendingKeyRequests.get(userId).has(deviceId)) {
            return;
        }
        const requests = this._pendingKeyRequests.get(userId).get(deviceId);
        if (requests.length === 0) {
            return;
        }
        const idx = requests.findIndex((r) => r.requestId === requestId);
        if (idx < 0) {
            return;
        }
        console.log("Forgetting room key request");
        requests.splice(idx, 1);
        //clean the _pendingKeyRequests by deleting empty entries of both deviceId and/or userId
        if (requests.length === 0) {
            this._pendingKeyRequests.get(userId).delete(deviceId);
            if (this._pendingKeyRequests.get(userId).size === 0) {
                this._pendingKeyRequests.delete(userId);
            }
        }
    }

    private processNextRequest(): void {
        console.log(":tchap: _processNextRequest, pending requests:", Object.keys(this._pendingKeyRequests).length);
        console.log(":tchap: _processNextRequest, pending requests:", JSON.stringify(this._pendingKeyRequests));
        console.log(":tchap: _currentUser:", this._currentUser);
        console.log(":tchap: _currentDevice:", this._currentDevice);

        if (this._pendingKeyRequests.size === 0) {
            return;
        }
        //get userId deviceId
        const userId = this._pendingKeyRequests.keys().next().value;

        if (this._pendingKeyRequests.get(userId).size === 0) {
            return;
        }
        //get first deviceId for a userId
        const deviceId = this._pendingKeyRequests.get(userId).keys().next().value;

        console.log(`:tchap: Starting VerificationRequestDialog for ${userId}:${deviceId}`);

        /**
         * Share keys to the verified session
         */
        const shareKeys = () => {
            console.log(`:tchap: share keys for ${userId}:${deviceId}`);
            const cli = this._matrixClient;

            //tchap: this will share keys without taking care of the state of "r" ?!
            for (const req of this._pendingKeyRequests.get(userId).get(deviceId)) {
                if (cli.checkDeviceTrust(userId, deviceId).isVerified()) {
                    console.log(":tchap: share for request :", JSON.stringify(req));
                    req.share();
                }
            }
        };

        /**
         * Remove current request from the list of pending request
         * TODO refactor to map
         */
        const removeCurrentRequest = () => {
            console.log(`:tchap: remove Current Request ${userId}:${deviceId}`);

            this._currentUser = null;
            this._currentDevice = null;

            if (!this._pendingKeyRequests.has(userId) || !this._pendingKeyRequests.get(userId).has(deviceId)) {
                console.log(`:tchap: request was removed when the dialog was displayed for ${userId}:${deviceId}`);
                //request was removed in the time the dialog was displayed
                this.processNextRequest();
                return;
            }
            //remove deviceId
            this._pendingKeyRequests.get(userId).delete(deviceId);
            if (this._pendingKeyRequests.get(userId).size === 0) {
                //remove userId
                this._pendingKeyRequests.delete(userId);
            }
            this.processNextRequest();
        };

        /* const KeyShareDialog = sdk.getComponent("dialogs.KeyShareDialog");
        Modal.appendTrackedDialog('Key Share', 'Process Next Request', KeyShareDialog, {
            matrixClient: this._matrixClient,
            userId: userId,
            deviceId: deviceId,
            onFinished: finished,
        }); */

        const cli = this._matrixClient;
        const verificationRequestPromise = cli.legacyDeviceVerification(userId, deviceId, verificationMethods.SAS);
        /*         Modal.createDialog(VerificationRequestDialog, {
            verificationRequestPromise,
            member: cli.getUser(userId),
            onFinished: async () => {
                const request = await verificationRequestPromise;
                request.cancel();
            },
        }); */
        Modal.createDialog(VerificationRequestDialog, {
            verificationRequestPromise: verificationRequestPromise,
            member: cli.getUser(userId),
            onFinished: async () => {
                const request = await verificationRequestPromise;
                console.log(`:tchap: verificationRequestPromise finishes for ${userId}:${deviceId}`);
                shareKeys();
                removeCurrentRequest();
                //tchap: why cancel?
                request.cancel();
            },
        });

        console.log(`:tchap: end of _processNextRequest for ${userId}:${deviceId}`);
        this._currentUser = userId;
        this._currentDevice = deviceId;
    }
}
