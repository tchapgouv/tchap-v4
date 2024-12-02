/*
Copyright 2022 DINUM

Replaces CreateRoomDialog.tsx

Tchap has 3 types of rooms only : private, private open to externs, and public (forum).
Tchap does not support spaces for now, so there are no settings dependent on spaces (for example "Visible to space
members"). Element uses JoinRule.Restricted for this.
When/if Tchap supports spaces, we can decide on more specific settings if needed.

Note on imports : because this file will be copied to a different directory by the customisations
mechanism, imports must use absolute paths.
Except when importing from other customisation files. Then imports must use relative paths.
*/
import React, { ChangeEvent, createRef, KeyboardEvent } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import withValidation, { IFieldState } from "~tchap-web/src/components/views/elements/Validation";
import { _t } from "~tchap-web/src/languageHandler";
import { IOpts } from "~tchap-web/src/createRoom";
import { getKeyBindingsManager } from "~tchap-web/src/KeyBindingsManager";
import { KeyBindingAction } from "~tchap-web/src/accessibility/KeyboardShortcuts";
import Field from "~tchap-web/src/components/views/elements/Field";
import DialogButtons from "~tchap-web/src/components/views/elements/DialogButtons";
import BaseDialog from "~tchap-web/src/components/views/dialogs/BaseDialog";

import TchapUtils from "../../../util/TchapUtils";
import TchapRoomTypeSelector from "../elements/TchapRoomTypeSelector";
import { TchapRoomType } from "../../../@types/tchap";
import TchapCreateRoom from "../../../lib/createTchapRoom";

// We leave the same props as Element's version, to avoid unknown props warnings.
interface IProps {
    defaultPublic?: boolean; // unused for Tchap version
    defaultName?: string;
    parentSpace?: Room;
    defaultEncrypted?: boolean; // unused for Tchap version
    onFinished(proceed: boolean, opts?: IOpts): void;
}

interface IState {
    name: string;
    nameIsValid: boolean;
    tchapRoomType: TchapRoomType;
    forumFederationSwitchValue: boolean;
    showFederateSwitch: boolean;
}

export default class TchapCreateRoomDialog extends React.Component<IProps, IState> {
    private nameField = createRef<Field>();
    private readonly createRoomInSpace: boolean;

    public constructor(props: IProps) {
        super(props);
        this.createRoomInSpace = !!this.props.parentSpace;

        const federationOptions = TchapUtils.getRoomFederationOptions();

        this.state = {
            name: this.props.defaultName || "",
            nameIsValid: false,
            tchapRoomType: TchapRoomType.Private,
            forumFederationSwitchValue: federationOptions.forumFederationSwitchDefaultValue,
            showFederateSwitch: federationOptions.showForumFederationSwitch,
        };
    }

    componentDidMount() {
        // move focus to first field when showing dialog
        this.nameField?.current.focus();
    }

    private onCancel = () => {
        this.props.onFinished(false);
    };

    private onForumFederatedChange = (forumFederationSwitchValue: boolean): void => {
        this.setState({ forumFederationSwitchValue });
    };

    private onTchapRoomTypeChange = (tchapRoomType: TchapRoomType): void => {
        this.setState({ tchapRoomType: tchapRoomType });
    };

    private onNameChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ name: ev.target.value });
    };

    private onNameValidate = async (fieldState: IFieldState) => {
        const result = await TchapCreateRoomDialog.validateRoomName(fieldState);
        this.setState({ nameIsValid: result.valid });
        return result;
    };

    private static validateRoomName = withValidation({
        rules: [
            {
                key: "required",
                test: async ({ value }) => !!value,
                invalid: () => _t("create_room|name_validation_required"),
            },
        ],
    });

    private onKeyDown = (event: KeyboardEvent): void => {
        const action = getKeyBindingsManager().getAccessibilityAction(event);
        switch (action) {
            case KeyBindingAction.Enter:
                this.onOk();
                event.preventDefault();
                event.stopPropagation();
                break;
        }
    };

    private isSelectedRoomFederated = (): boolean => {
        return this.state.tchapRoomType === TchapRoomType.Forum && this.state.showFederateSwitch
            ? this.state.forumFederationSwitchValue
            : true;
    };

    private onOk = async () => {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
            activeElement.blur();
        }
        await this.nameField.current.validate({ allowEmpty: false });
        // Validation and state updates are async, so we need to wait for them to complete
        // first. Queue a `setState` callback and wait for it to resolve.
        await new Promise<void>((resolve) => this.setState({}, resolve));
        if (this.state.nameIsValid) {
            this.props.onFinished(
                true,
                TchapCreateRoom.roomCreateOptions(
                    this.state.name,
                    this.state.tchapRoomType,
                    this.isSelectedRoomFederated(),
                    this.props.parentSpace
                ),
            );
        } else {
            let field;
            if (!this.state.nameIsValid) {
                field = this.nameField.current;
            }
            if (field) {
                field.focus();
                field.validate({ allowEmpty: false, focused: true });
            }
        }
    };

    public render() {
        const shortDomain: string = TchapUtils.getShortDomain();

        const title = this.createRoomInSpace ? _t("Create a room in this space") : _t("action|create_a_room");

        return (
            <BaseDialog
                className="tc_TchapCreateRoomDialog"
                onFinished={this.onOk}
                title={title}
                screenName="CreateRoom"
            >
                <form onSubmit={this.onOk} onKeyDown={this.onKeyDown}>
                    <div className="mx_Dialog_content">
                        <Field
                            ref={this.nameField}
                            label={_t("common|name")}
                            onChange={this.onNameChange}
                            onValidate={this.onNameValidate}
                            value={this.state.name}
                        />

                        <TchapRoomTypeSelector
                            value={this.state.tchapRoomType}
                            label={_t("Type of room")}
                            showFederateSwitch={this.state.showFederateSwitch}
                            shortDomain={shortDomain}
                            forumFederationSwitchValue={this.state.forumFederationSwitchValue}
                            setForumFederationSwitchValue={this.onForumFederatedChange}
                            setRoomType={this.onTchapRoomTypeChange}
                            createRoomInSpace={this.createRoomInSpace}
                        />
                    </div>
                </form>
                <DialogButtons
                    primaryButton={_t("Create Room")}
                    onPrimaryButtonClick={this.onOk}
                    onCancel={this.onCancel}
                />
            </BaseDialog>
        );
    }
}
