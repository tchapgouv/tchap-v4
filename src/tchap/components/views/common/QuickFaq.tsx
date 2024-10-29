
import React from 'react'

import { ChevronFace, alwaysAboveRightOf, useContextMenu } from 'matrix-react-sdk/src/components/structures/ContextMenu';
import AccessibleButton from 'matrix-react-sdk/src/components/views/elements/AccessibleButton';
import classNames from 'classnames';
import { _t } from '../../../../languageHandler';
import "../../../../../res/css/common/_TchapLeftPanel.pcss";
import IconizedContextMenu, { IconizedContextMenuOption, IconizedContextMenuOptionList } from 'matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu';
import TchapUrls from '../../../util/TchapUrls';

const QuickFaqButton: React.FC<{
    isPanelCollapsed: boolean;
}> = ({ isPanelCollapsed = false }) => {

    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();

    let contextMenu: JSX.Element | undefined;

    if (menuDisplayed && handle.current) {
        contextMenu = (
            <IconizedContextMenu
                {...alwaysAboveRightOf(handle.current.getBoundingClientRect(), ChevronFace.None, 16)}
                className="mx_UserMenu_contextMenu"
                onFinished={closeMenu}
                compact
            >
                <IconizedContextMenuOptionList>
                    <IconizedContextMenuOption
                        iconClassName="mx_UserMenu_iconInfo"
                        label={_t("quick_faq|faq")}
                        onClick={(e) => {
                            window.open("https://www.tchap.gouv.fr/faq", '_blank')
                        }}
                    />
                    <IconizedContextMenuOption
                        iconClassName="mx_UserMenu_iconMessage"
                        label={_t("quick_faq|contact")}
                        onClick={(e) => {
                            window.open("mailto:support@tchap.beta.gouv.fr", '_blank')
                        }}
                    />
                    <IconizedContextMenuOption
                        iconClassName="mx_UserMenu_iconHome"
                        label={_t("quick_faq|guides")}
                        onClick={(e) => {
                            window.open(TchapUrls.helpUserOnboarding, '_blank')
                        }}
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    return (
        <>
            <AccessibleButton
                className={classNames(["mx_QuickSettingsButton", { expanded: !isPanelCollapsed }, "tc_sidebar_quick_faq"])}
                onClick={openMenu}
                aria-label={_t("common|help")}
                title={isPanelCollapsed ? _t("common|help") : undefined}
                ref={handle}
                aria-expanded={!isPanelCollapsed}
            >
                {!isPanelCollapsed ? _t("common|help") : null}
            </AccessibleButton>

            {contextMenu}
        </>
    );
};

export default QuickFaqButton;