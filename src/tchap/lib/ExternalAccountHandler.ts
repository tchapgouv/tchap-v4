import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import TchapRoomUtils from "../util/TchapRoomUtils";
import { TchapRoomType } from "../@types/tchap";
import { _t, _td } from "~tchap-web/src/languageHandler";
import ErrorDialog from "~tchap-web/src/components/views/dialogs/ErrorDialog";
import Modal from "~tchap-web/src/Modal";
import SdkConfig from "~tchap-web/src/SdkConfig";

class ExpiredAccountHandler {

    public static isUserExternal(client: MatrixClient): boolean {
        const hsList = SdkConfig.get()["homeserver_list"] ?? [];
        const externesHs = hsList.find((hs: Record<string, any>) => hs.server_name.includes("Externes"));

        return !!externesHs.base_url.includes(client.getDomain());
    }

    public static joinRoomError(room: Room): void{
        if (!room) {
            this.displayModal(_t("room|error_join_title"), _t("room|error_join_generic_external"));
            return;
        }

        if (TchapRoomUtils.getTchapRoomType(room) == TchapRoomType.Forum) {
            this.displayModal(_t("room|error_join_title"), _t("room|error_join_public_external"));
            return;
        }

        this.displayModal(_t("room|error_join_title"), _t("room|error_join_private_external"));
    }

    public static createRoomError(): void {
        this.displayModal(_t("create_room|error_title"), _t("room|error_create_room_external"));
    }

    public static createSpaceError(): void {
        this.displayModal(_t("create_space|error_title"), _t("create_space|error_external"));
    }

    public static displayModal(title: string, description: string): void {
        Modal.createDialog(ErrorDialog, {
            title,
            description,
        });
    }
}

export default ExpiredAccountHandler;
