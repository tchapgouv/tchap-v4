import { EventType, GuestAccess, JoinRule, Room } from "matrix-js-sdk/src/matrix";

import React, { useEffect, useState } from 'react';
import LabelledToggleSwitch from 'matrix-react-sdk/src/components/views/elements/LabelledToggleSwitch';
import { _t } from 'matrix-react-sdk/src/languageHandler';
import { MatrixClientPeg } from 'matrix-react-sdk/src/MatrixClientPeg';
import { randomString } from 'matrix-js-sdk/src/randomstring';
import TchapRoomUtils from '../../../util/TchapRoomUtils';
import { makeRoomPermalink } from "matrix-react-sdk/src/utils/permalinks/Permalinks";
import { TchapRoomType } from "../../../@types/tchap";
import { RoomJoinRulesEventContent } from "matrix-js-sdk/lib/types";
import CopyableText from "matrix-react-sdk/src/components/views/elements/CopyableText";

interface ITchapRoomLinkAccessProps {
    room: Room,
    onBeforeChangeCallback: Function
}

export default function TchapRoomLinkAccess({room, onBeforeChangeCallback}: ITchapRoomLinkAccessProps) : JSX.Element {

    const [isLinkSharingActivated, setIsLinkSharingActivated] = useState(false);
    const [linkSharingUrl, setLinkSharingUrl] = useState("");
    const [disableLinkSharing, setDisableLinkSharing] = useState(false);

    // Getting the initial value of the link. We need to check if it was previsouly activated or not
    const initialLinkSharingValue = () => {

        // We disable link sharing if its a forum or user not admin
        if (!TchapRoomUtils.isUserAdmin(room) || TchapRoomUtils.getTchapRoomType(room) === TchapRoomType.Forum) {
            setDisableLinkSharing(true);
            return;
        }

        const isActivated = isJoinRulePublic();

        if (isActivated) {
            const link = makeRoomPermalink(room.client, room.roomId);
            setLinkSharingUrl(link);
        }
        setIsLinkSharingActivated(isActivated)
        // updating the parent join rule options 
        onBeforeChangeCallback(isActivated, true);
    }

    useEffect(() => {
        initialLinkSharingValue();
    }, []);

    // Create the permalink to share
    const _setUpRoomByLink = async () => {
        const client = MatrixClientPeg.get()!;
        try {
            // create an alias if not existing
            if (!room.getCanonicalAlias()) {
                const aliasName = (room.name?.replace(/[^a-z0-9]/gi, "") ?? "") + randomString(11);
                const fullAlias = `#${aliasName}:${client.getDomain()}`;
                await client.createAlias(fullAlias, room.roomId)
                await client.sendStateEvent(room.roomId, EventType.RoomCanonicalAlias, { alias: fullAlias }, "")
            }

            // it will take the new alias created previously or the existing one to make a link
            const link = makeRoomPermalink(room.client, room.roomId);
            setLinkSharingUrl(link);    
        } catch(err) {
            console.error(err);
        }
    };

    // Check if the current join rule is public or not
    const isJoinRulePublic = () => {
        const currentJoinRule: JoinRule = TchapRoomUtils.getRoomJoinRule(room) ?? JoinRule.Invite // if we dont receive the value we default to invite

        return currentJoinRule === JoinRule.Public
    }

    // Set the new join rule (public or invite)
    const _setJoinRules = async (joinRule: JoinRule) => {
        try {
            await room.client.sendStateEvent(room.roomId, EventType.RoomJoinRules, { join_rule: joinRule } as RoomJoinRulesEventContent, "");
            setIsLinkSharingActivated(joinRule === JoinRule.Public);
        } catch(err) {
            console.error(err);
        }
    };

    const _setGuestAccessRules = async (guestAccess: GuestAccess) => {
        try {
            await room.client.sendStateEvent(room.roomId, EventType.RoomGuestAccess, {guest_access: guestAccess}, "")
        } catch(err) {
            console.error(err);
        }
    };
    
    // Handler to listen on the switch change 
    const _onLinkSharingSwitchChange = async (checked: boolean) => {
        let newJoinRule :JoinRule = checked ? JoinRule.Public : JoinRule.Invite;
        setIsLinkSharingActivated(checked);
        
        // if the link sharing is deactivated we also need to update the joinrule parent view to show the other options
        if (!checked) {
            await _setJoinRules(newJoinRule);
            onBeforeChangeCallback(checked)
            return;
        }

        // call parent join rule access, to confirm we want to change to public access and hide the other join options
        onBeforeChangeCallback(checked, false, async (actionConfirmed: boolean) => {
            // create link if we activate the sharing, otherwise change nothing
            if (actionConfirmed) {
                if (TchapRoomUtils.getRoomGuessAccessRule(room) === GuestAccess.CanJoin) {
                    await _setGuestAccessRules(GuestAccess.Forbidden)
                }
                _setUpRoomByLink();
                _setJoinRules(JoinRule.Public)
            } else {
                // we revert because the action was not confirmed 
                setIsLinkSharingActivated(!checked);
            }
        })
    };

    return (
        <div>
            <LabelledToggleSwitch value={isLinkSharingActivated}
                onChange={ _onLinkSharingSwitchChange }
                label={_t("room_settings|security|link_sharing_title")}
                caption={_t("room_settings|security|link_sharing_caption")}
                disabled={disableLinkSharing}/>
            
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