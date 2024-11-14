import React from "react";

import "../../../../../res/css/views/sso/TchapSSO.pcss";
import { _t } from "~tchap-web/src/languageHandler";

export default function ProconnectButton(): JSX.Element {

    return (
        <div className="tc_pronnect">
            <a href="#/email-precheck-sso" className="tc_ButtonParent tc_ButtonProconnect tc_Button_iconPC">
                <div>{_t("auth|proconnect|email_title")}</div>
            </a>
        </div>
    );
}