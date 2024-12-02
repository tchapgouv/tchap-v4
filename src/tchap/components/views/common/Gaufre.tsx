
import React, { useEffect, useRef, useState } from 'react'
import '@gouvfr-lasuite/integration/dist/css/gaufre.css';

import ContextMenu, { ChevronFace, alwaysAboveRightOf, useContextMenu } from '~tchap-web/src/components/structures/ContextMenu';
import AccessibleButton from '~tchap-web/src/components/views/elements/AccessibleButton';
import classNames from 'classnames';
import { _t } from '../../../../languageHandler';
import "../../../../../res/css/common/_TchapLeftPanel.pcss";

const TchapGaufre: React.FC<{
    isPanelCollapsed: boolean;
}> = ({ isPanelCollapsed = false }) => {

    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();
    const gaufreListElmRef = useRef<HTMLDivElement | null>(null);
    const gaufreContentRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const lasuiteOrigin = "https://integration.lasuite.numerique.gouv.fr"

    // Getting the content of the gaufre from la-suite
    async function getLasuiteList() {
        try {
            const res = await fetch(`${lasuiteOrigin}/api/v1/gaufre`);
            const html = await res.text();
            // replacing the origin urls explicitly by lasuiteOrigin to fetch the images
            const updatedHtml = html.replace(/(src=|href=|url\()"\//g, `$1"${lasuiteOrigin}/`);
            const parser = new DOMParser();
            const popupDocument = parser.parseFromString(updatedHtml, "text/html");

            // creating an element to put the content retrieved from lasuite
            const gaufreElm = document.createElement("div");
            gaufreElm.innerHTML = popupDocument.body.innerHTML;
            gaufreListElmRef.current = gaufreElm;
            setLoading(false);
        } catch (error) {
            console.error("Error fetching gaufre list:", error);
            setLoading(false);
        }
    }

    useEffect(() => {
        getLasuiteList()
    }, [])

    useEffect(() => {
        // only display the content if the content was fetched and the menu opened
        if (menuDisplayed && gaufreContentRef.current && gaufreListElmRef.current && !gaufreContentRef.current.innerHTML) {
            gaufreContentRef.current.appendChild(gaufreListElmRef.current);
        }
    }, [menuDisplayed]);


    let contextMenu: JSX.Element | undefined;

    if (menuDisplayed && handle.current) {
        contextMenu = (
            <ContextMenu
                {...alwaysAboveRightOf(handle.current.getBoundingClientRect(), ChevronFace.None, 16)}
                wrapperClassName="mx_QuickSettingsButton_ContextMenuWrapper"
                onFinished={closeMenu}
                managed={false}
                focusLock={true}
            >
                <div id="tchap-gaufre" className="lasuite--gaufre-borderless" ref={gaufreContentRef}>
                </div>
            </ContextMenu>
        );
    }

    return (
        <>
            <AccessibleButton
                className={classNames(["mx_QuickSettingsButton", { expanded: !isPanelCollapsed }, "lasuite-gaufre-tchap", "lasuite-gaufre-mask"])}
                onClick={openMenu}
                aria-label={_t("lasuite_numerique")}
                title={isPanelCollapsed ? _t("lasuite_numerique") : undefined}
                ref={handle}
                aria-expanded={!isPanelCollapsed}
            >
                {!isPanelCollapsed ? _t("lasuite_numerique") : null}
            </AccessibleButton>

            {contextMenu}
        </>
    );
};

export default TchapGaufre;