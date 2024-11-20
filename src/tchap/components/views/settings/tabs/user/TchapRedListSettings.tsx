import React, { useEffect, useState } from 'react';
import { SettingsSubsection } from '~tchap-web/src/components/views/settings/shared/SettingsSubsection';
import { _t } from "~tchap-web/src/languageHandler";
import TchapUtils from '../../../../../util/TchapUtils';
import ToggleSwitch from '~tchap-web/src/components/views/elements/ToggleSwitch';

interface TchapRedListSettingsProps {
}

/**
 * A group of settings views to allow the user to set their profile information.
 */
const TchapRedListSettings: React.FC<TchapRedListSettingsProps> = () => {

    const [isOnRedList, setIsOnRedList] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitialRedListValue = async () => {
            const initialValue = await TchapUtils.getUserRedListInfo();
            console.log("initialRedListValue", initialValue);
            setIsOnRedList(initialValue);
        }
        fetchInitialRedListValue();
    }, []);

    const _onRedlistOptionChange = async (checked: boolean) => {
        try {
            if (!loading) {
                setLoading(true)
                await TchapUtils.setUserRedListInfo(checked);
                setIsOnRedList(checked);
            }
            setLoading(false)
        } catch (err) {
            console.error("Error setting AccountData 'im.vector.hide_profile': " + err);
            setIsOnRedList(!checked); // return to initial state because of error
            setLoading(false)
        }
    }

    return <SettingsSubsection
            heading={_t("settings|general|redlist")}
            stretchContent>
                <div className="mx_SettingsFlag">
                    <label className="mx_SettingsFlag_label" htmlFor="redList-toggle">
                        <span className="mx_SettingsFlag_labelText">{_t('settings|general|redlist_title')}</span>
                        <div className="mx_SettingsFlag_microcopy">
                            {_t("settings|general|redlist_description")}
                        </div>
                    </label>
                    <ToggleSwitch
                        id="redList-toggle"
                        checked={isOnRedList}
                        onChange={(checked: boolean) => _onRedlistOptionChange(checked)}
                        disabled={loading}
                        title={_t('settings|general|redlist_title')}
                    />
                </div>
            </SettingsSubsection>
}

export default TchapRedListSettings;