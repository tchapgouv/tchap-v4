import { IOpts } from "~tchap-web/src/createRoom";
import { ICreateRoomOpts } from "matrix-js-sdk/src/@types/requests";
import { HistoryVisibility, JoinRule, Preset, Visibility } from "matrix-js-sdk/src/@types/partials";

import { TchapRoomAccessRule, TchapRoomAccessRulesEventId, TchapRoomType } from "../@types/tchap";
import { Room } from "matrix-js-sdk/src/matrix";

export const DEFAULT_FEDERATE_VALUE = true;

/**
 * Build the room creation options
 * @param name name of the room
 * @param tchapRoomType type of room
 * @param federate is the room federated
 * @returns rooms options
 */
export default class TchapCreateRoom {
    static roomCreateOptions(
        name: string,
        tchapRoomType: TchapRoomType,
        federate: boolean = DEFAULT_FEDERATE_VALUE,
        parentSpace?: Room
    ): IOpts {
        const opts: IOpts = {};
        const createRoomOpts: ICreateRoomOpts = {};
        opts.createOpts = createRoomOpts;

        //tchap common options
        createRoomOpts.name = name;
        opts.guestAccess = false; //guest access are not authorized in tchap

        createRoomOpts.creation_content = { "m.federate": federate };
        createRoomOpts.initial_state = createRoomOpts.initial_state || [];

        if(parentSpace) {
            opts.parentSpace = parentSpace;
        }

        switch (tchapRoomType) {
            case TchapRoomType.Forum: {
                // Space "Forum" only for space members and not encrypted
                if (parentSpace) {
                    createRoomOpts.visibility = Visibility.Private;
                } else {      //"Forum" only for tchap members and not encrypted
                    createRoomOpts.visibility = Visibility.Public;
                }
                createRoomOpts.preset = Preset.PublicChat;
                // Here we could have used createRoomOpts.accessRule directly,
                // but since accessRules are a custom Tchap event, it is ignored by later code.
                // So we use createRoomOpts.initial_state, which works properly.
                createRoomOpts.initial_state.push({
                    content: {
                        rule: TchapRoomAccessRule.Restricted,
                    },
                    type: TchapRoomAccessRulesEventId,
                    state_key: "",
                });

                //Open to space by default
                if (parentSpace) {
                    opts.joinRule = JoinRule.Restricted;
                } else {
                    opts.joinRule = JoinRule.Public;
                }
                opts.encryption = false;
                opts.historyVisibility = HistoryVisibility.Shared;
                break;
            }
            case TchapRoomType.Private: {
                //"Salon", only for tchap member and encrypted
                createRoomOpts.visibility = Visibility.Private;
                createRoomOpts.preset = Preset.PrivateChat;
                createRoomOpts.initial_state.push({
                    content: {
                        rule: TchapRoomAccessRule.Restricted,
                    },
                    type: TchapRoomAccessRulesEventId,
                    state_key: "",
                });
                //Open to space by default
                if (parentSpace) {
                    opts.joinRule = JoinRule.Restricted;
                } else {
                    opts.joinRule = JoinRule.Invite;
                }
                opts.encryption = true;
                opts.historyVisibility = HistoryVisibility.Invited;
                break;
            }
            case TchapRoomType.External: {
                //open to external and encrypted,
                createRoomOpts.visibility = Visibility.Private;
                createRoomOpts.preset = Preset.PrivateChat;
                createRoomOpts.initial_state.push({
                    content: {
                        rule: TchapRoomAccessRule.Unrestricted,
                    },
                    type: TchapRoomAccessRulesEventId,
                    state_key: "",
                });
                //Open to space by default
                if (parentSpace) {
                    opts.joinRule = JoinRule.Restricted;
                } else {
                    opts.joinRule = JoinRule.Invite;
                }
                opts.encryption = true;
                opts.historyVisibility = HistoryVisibility.Invited;
                break;
            }
        }
        return opts;
    }
}
