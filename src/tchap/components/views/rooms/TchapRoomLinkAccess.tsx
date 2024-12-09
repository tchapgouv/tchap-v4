import { EventTimeline, EventType, GuestAccess, JoinRule, Room } from "matrix-js-sdk/src/matrix";

import React, { useEffect, useState } from 'react';
import LabelledToggleSwitch from '~tchap-web/src/components/views/elements/LabelledToggleSwitch';
import { _t } from '~tchap-web/src/languageHandler';
import { randomString } from 'matrix-js-sdk/src/randomstring';
import TchapRoomUtils from '../../../util/TchapRoomUtils';
import { makeRoomPermalink, RoomPermalinkCreator } from "~tchap-web/src/utils/permalinks/Permalinks";
import { TchapRoomType } from "../../../@types/tchap";
import { RoomJoinRulesEventContent } from "matrix-js-sdk/lib/types";
import CopyableText from "~tchap-web/src/components/views/elements/CopyableText";
import Modal from "~tchap-web/src/Modal";
import QuestionDialog from "~tchap-web/src/components/views/dialogs/QuestionDialog";
import ErrorDialog from "~tchap-web/src/components/views/dialogs/ErrorDialog";
import MatrixToPermalinkConstructor from "~tchap-web/src/utils/permalinks/MatrixToPermalinkConstructor";
import ElementPermalinkConstructor from "~tchap-web/src/utils/permalinks/ElementPermalinkConstructor";
import SdkConfig from "~tchap-web/src/SdkConfig";

interface ITchapRoomLinkAccessProps {
    room: Room,
    onUpdateParentView: Function
}

export default function TchapRoomLinkAccess({room, onUpdateParentView}: ITchapRoomLinkAccessProps) : JSX.Element {

    const [isLinkSharingActivated, setIsLinkSharingActivated] = useState(false);
    const [linkSharingUrl, setLinkSharingUrl] = useState("");
    const [disableLinkSharing, setDisableLinkSharing] = useState(false);

    // Getting the initial value of the link. We need to check if it was previsouly activated or not
    const initialLinkSharingValue = () => {

        // We disable link sharing if its a forum or user not admin
        if (!TchapRoomUtils.isUserAdmin(room) || TchapRoomUtils.getTchapRoomType(room) === TchapRoomType.Forum) {
            setDisableLinkSharing(true);
        }

        const isActivated = isJoinRulePublic();

        if (isActivated) {
            const link = makeRoomPermalink(room.client, room.roomId);
            setLinkSharingUrl(link);
        }
        setIsLinkSharingActivated(isActivated)
        // updating the parent join rule options 
        onUpdateParentView(isActivated, true);
    }

    useEffect(() => {
        initialLinkSharingValue();
    }, []);

    // Create the permalink to share
    const _setUpRoomByLink = async () => {
        try {
            let link = "";
            // create an alias if not existing
            if (!room.getCanonicalAlias()) {
                const aliasName = (room.name?.replace(/[^a-z0-9]/gi, "") ?? "") + randomString(11);
                const fullAlias = `#${aliasName}:${room.client.getDomain()}`;
                
                await room.client.createAlias(fullAlias, room.roomId)
                await room.client.sendStateEvent(room.roomId, EventType.RoomCanonicalAlias, { alias: fullAlias }, "")
                
                // we don't know why he cant detect directly that the canonical alias was created previously
                // so here we force the use of the newly created alias in the link
                const permalinkCreator = new RoomPermalinkCreator(room);
                permalinkCreator.load();
                const tchapPrefix: string = SdkConfig.get("permalink_prefix")!
                link = new ElementPermalinkConstructor(tchapPrefix).forRoom(fullAlias, permalinkCreator.serverCandidates || [])
            } else {
                // it will take the new alias created previously or the existing one to make a link
                link = makeRoomPermalink(room.client, room.roomId);
            }

            setLinkSharingUrl(link);
        } catch(err) {
            console.error(err);
            throw err;
        }
    };

    // Check if the current join rule is public or not
    const isJoinRulePublic = () => {
        const currentJoinRule: JoinRule = TchapRoomUtils.getRoomJoinRule(room) ?? JoinRule.Invite // if we dont receive the value we default to invite

        return currentJoinRule === JoinRule.Public
    }

    // Set the new join rule (public or invite)
    const _setJoinRules = (joinRule: JoinRule) => {
        return room.client.sendStateEvent(room.roomId, EventType.RoomJoinRules, { join_rule: joinRule } as RoomJoinRulesEventContent, "");
    };

    const _setGuestAccessRules = (guestAccess: GuestAccess) => {
        return room.client.sendStateEvent(room.roomId, EventType.RoomGuestAccess, {guest_access: guestAccess}, "")
    };
    
    // Handler to listen on the switch change 
    const _onLinkSharingSwitchChange = async (checked: boolean) => {
        try {
            let newJoinRule :JoinRule = checked ? JoinRule.Public : JoinRule.Invite;

            // if the link sharing is deactivated we also need to update the joinrule parent view to show the other options
            if (!checked) {
                await _setJoinRules(newJoinRule);
                onUpdateParentView(checked)
                setIsLinkSharingActivated(checked);
                return;
            }
    
            // Show modal for confirmation
            const activationIsConfirmed = await activateLinksharingModal();
    
            if (activationIsConfirmed) {
                // create link if we activate the sharing, otherwise change nothing
                if (TchapRoomUtils.getRoomGuessAccessRule(room) === GuestAccess.CanJoin) {
                    await _setGuestAccessRules(GuestAccess.Forbidden)
                }
                await Promise.all([_setUpRoomByLink(), _setJoinRules(JoinRule.Public)]);
                setIsLinkSharingActivated(checked);
                onUpdateParentView(checked, false);
            }
        } catch(err) {
            // we do nothing if there was an error
            console.error(err);
            Modal.createDialog(ErrorDialog, {
                title: _t("error_dialog|activate_room_share_link|title"),
                description: err && err.message ? err.message : _t("error_dialog|activate_room_share_link|description"),
            });
        }
    };


    const activateLinksharingModal = async (): Promise<boolean> => {
        const dialog = Modal.createDialog(QuestionDialog, {
            title: _t("room_settings|security|link_sharing_title"),
            description: (
                <div>
                    <p>
                        {_t("room_settings|security|link_sharing_modal_confirmation", null,   {
                        p: (sub) => <p>{sub}</p>,
                    },)}
                    </p>
                </div>
            ),
        });
        const { finished } = dialog;
        const [confirm] = await finished;
        return !!confirm
    }

    return (
        <div>
            <LabelledToggleSwitch value={isLinkSharingActivated}
                onChange={ _onLinkSharingSwitchChange }
                label={_t("room_settings|security|link_sharing_title")}
                caption={_t("room_settings|security|link_sharing_caption")}
                disabled={disableLinkSharing}
                data-testid="share_link_switch"
                />
            {
                isLinkSharingActivated ? 
                    <CopyableText getTextToCopy={() => linkSharingUrl} aria-labelledby="shared_room_link">
                        { linkSharingUrl }
                    </CopyableText>
                    : null
            }
        </div>
    )
}