import { MatrixEvent, Room, RoomStateEvent } from "matrix-js-sdk/src/matrix";
import { useTypedEventEmitter } from "~tchap-web/src/hooks/useEventEmitter";
import React, { useState } from "react";
import { _t } from "~tchap-web/src/languageHandler";

import { TchapRoomAccessRule, TchapRoomAccessRulesEventId } from "../../../@types/tchap";
import TchapRoomUtils from "../../../util/TchapRoomUtils";

export interface IProps {
    room?: Room;
}

export function checkExternalAllowed(room: Room): boolean {
    return TchapRoomUtils.getTchapRoomAccessRule(room) === TchapRoomAccessRule.Unrestricted;
}

//define a function to manage internal state
//inspired by RoomTopic.tsx
function useExternalAllowed(room: Room): boolean {
    //define the hook functions and initialize the state
    const [isExternalAllowed, setExternalAllowed] = useState(checkExternalAllowed(room));

    //listen to events to refresh the value if needed
    useTypedEventEmitter(room.currentState, RoomStateEvent.Events, (ev: MatrixEvent) => {
        console.log(ev.getType());
        if (ev.getType() === TchapRoomAccessRulesEventId) {
            setExternalAllowed(checkExternalAllowed(room));
        }
    });

    return isExternalAllowed;
}

export default function TchapExternalRoomHeader({ room }: IProps) {
    //configure the use hook for this state variable
    const isExternalAllowed = useExternalAllowed(room);

    return isExternalAllowed ? (
        <div className="tc_RoomHeader_external">
            <span>{_t("External users allowed")}</span>
        </div>
    ) : null;
}
