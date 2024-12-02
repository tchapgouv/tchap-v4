/*
Copyright 2022 DINUM
*/

import React from "react";
import classNames from "classnames";
import { _t } from "~tchap-web/src/languageHandler";
import StyledRadioButton from "~tchap-web/src/components/views/elements/StyledRadioButton";
import LabelledToggleSwitch from "~tchap-web/src/components/views/elements/LabelledToggleSwitch";

import { TchapRoomType } from "../../../@types/tchap";

import "../../../../../res/css/views/elements/_TchapRoomTypeSelector.pcss";

interface IProps {
    value: TchapRoomType;
    label: string;
    width?: number;
    showFederateSwitch: boolean;
    shortDomain: string;
    forumFederationSwitchValue?: boolean;
    setRoomType(value: TchapRoomType): void;
    setForumFederationSwitchValue(forumFederationSwitchValue: boolean): void;
    createRoomInSpace: boolean;
}

interface IState {
    roomType: TchapRoomType;
}

export default class TchapRoomTypeSelector extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        this.state = {
            roomType: TchapRoomType.Private,
        };
    }

    private onRoomTypeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const roomType = e.target.value as TchapRoomType;

        this.setState({ roomType: roomType });
        this.props.setRoomType(roomType);
    };

    public render(): JSX.Element {
        const privateClasses = classNames("tc_TchapRoomTypeSelector_RadioButton", "tc_TchapRoomTypeSelector_private", {
            tc_TchapRoomTypeSelector_RadioButton_selected: this.props.value == TchapRoomType.Private,
        });
        const externalClasses = classNames(
            "tc_TchapRoomTypeSelector_RadioButton",
            "tc_TchapRoomTypeSelector_external",
            {
                tc_TchapRoomTypeSelector_RadioButton_selected: this.props.value == TchapRoomType.External,
            },
        );
        const forumClasses = classNames("tc_TchapRoomTypeSelector_RadioButton", "tc_TchapRoomTypeSelector_forum", {
            tc_TchapRoomTypeSelector_RadioButton_selected: this.props.value === TchapRoomType.Forum,
        });

        let roomFederateOpt;
        if (this.props.showFederateSwitch) {
            roomFederateOpt = (
                <div>
                    <LabelledToggleSwitch
                        label={_t('Allow access to this room to all users, even outside "%(domain)s" domain', {
                            domain: this.props.shortDomain,
                        })}
                        onChange={this.props.setForumFederationSwitchValue}
                        value={this.props.forumFederationSwitchValue}
                    />
                </div>
            );
        }

        return (
            <div className="tc_TchapRoomTypeSelector">
                <label className={privateClasses}>
                    <StyledRadioButton
                        name="roomType"
                        value={TchapRoomType.Private}
                        checked={this.props.value === TchapRoomType.Private}
                        onChange={this.onRoomTypeChange}
                    >
                        <div className="tc_TchapRoomTypeSelector_RadioButton_title">{_t("Private room")}</div>
                        <div>{this.props.createRoomInSpace ? _t("Private discussions accessible to all users of this space.")  : _t("Accessible to all users by invitation from an administrator.")}</div>
                    </StyledRadioButton>
                </label>
                <label className={externalClasses}>
                    <StyledRadioButton
                        name="roomType"
                        value={TchapRoomType.External}
                        checked={this.props.value == TchapRoomType.External}
                        onChange={this.onRoomTypeChange}
                    >
                        <div className="tc_TchapRoomTypeSelector_RadioButton_title">
                            {_t("Private room open to external users")}
                        </div>
                        <div>
                            {this.props.createRoomInSpace ? _t("Private discussions accessible to all users of this space and to external guests by invitation of an administrator.") : _t("Accessible to all users and to external guests by invitation of an administrator.")}
                        </div>
                    </StyledRadioButton>
                </label>
                <label className={forumClasses}>
                    <StyledRadioButton
                        name="roomType"
                        value={TchapRoomType.Forum}
                        checked={this.props.value == TchapRoomType.Forum}
                        onChange={this.onRoomTypeChange}
                    >
                        <div className="tc_TchapRoomTypeSelector_RadioButton_title">{_t("Forum room")}</div>
                        <div>{this.props.createRoomInSpace ? _t("Public discussion accessible to all users of this space or from a shared link.") : _t("Accessible to all users from the forum directory or from a shared link.")}</div>
                        {roomFederateOpt}
                    </StyledRadioButton>
                </label>
            </div>
        );
    }
}
