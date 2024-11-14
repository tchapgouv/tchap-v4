import React from "react";
import { _t } from "~tchap-web/src/languageHandler";
import TchapUrls from "../util/TchapUrls";


export default class Tchapi18nUtils {

    public static getServerDownMessage(errCode? : string){
        return _t(
            "Tchap is not available at the moment %(errCode)s. <a>View the status of services</a>.",
            {errCode: errCode ?? ''},
            {
                a: (sub) => (
                    <a target="_blank" rel="noreferrer noopener" href={TchapUrls.statusPage}>
                        {sub}
                    </a>
                ),
            },
        )
    }
}


