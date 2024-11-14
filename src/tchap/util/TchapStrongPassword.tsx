import React from "react";
import { IFieldState, IValidationResult } from "~tchap-web/src/components/views/elements/Validation";
import { _t } from "~tchap-web/src/languageHandler";

import TchapApi from "./TchapApi";
import TchapUtils from "./TchapUtils";

/**
 * Strong Password utils.
 * File copied from v2 and modified.
 */
export default class TchapStrongPassword {
    private static passwordRules: { ruleName: string; ruleValue: number | string } | null = null;

    /**
     * Query password_policy rules from a homeserver, and cache them.
     * They look something like :
     * {"m.minimum_length":8,"m.require_digit":true,"m.require_symbol":true,"m.require_lowercase":true,"m.require_uppercase":true}
     */
    private static async getRules() {
        if (!this.passwordRules) {
            const hsUrl = TchapUtils.randomHomeServer().base_url;
            const res = await fetch(`${hsUrl}${TchapApi.passwordRulesUrl}`);
            this.passwordRules = await res.json();
        }
        return this.passwordRules;
    }

    /**
     * Replacement for PassphraseField.validate in matrix-react-sdk, with same inputs and outputs.
     */
    static validate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const passwordValue: string = fieldState.value;

        const rules = await this.getRules();

        const applyRule = (ruleName: string, ruleValue): string => {
            switch (ruleName) {
                case "m.minimum_length":
                    return this.minimumLength(passwordValue, ruleValue)
                        ? ""
                        : _t("a minimum of %(number)s characters", { number: ruleValue });
                case "m.require_digit":
                    return this.requireDigit(passwordValue, ruleValue) ? "" : _t("a number");
                case "m.require_symbol":
                    return this.requireSymbol(passwordValue, ruleValue) ? "" : _t("a symbol");
                case "m.require_lowercase":
                    return this.requireLowercase(passwordValue, ruleValue) ? "" : _t("a lowercase letter");
                case "m.require_uppercase":
                    return this.requireUppercase(passwordValue, ruleValue) ? "" : _t("an uppercase letter");
                default:
                    throw new Error("Unknown password rule : " + ruleName);
            }
        };

        const errors: string[] = Object.entries(rules).reduce((errors: string[], [ruleName, ruleValue]) => {
            const error: string = applyRule(ruleName, ruleValue);
            if (error.length) {
                errors.push(error);
            }
            return errors;
        }, []);

        if (errors.length === 0) {
            return {
                valid: true,
            };
        }

        return {
            valid: false,
            feedback: (
                <div className="mx_Validation mx_Validation_invalid">
                    <div className="mx_Validation_description mx_Validation_invalid">
                        {_t("Your password must include:")}
                    </div>
                    <ul className="mx_Validation_details">
                        {errors.map((error) => {
                            return <li className="mx_Validation_detail mx_Validation_invalid">{error}</li>;
                        })}
                    </ul>
                </div>
            ),
        };
    };

    private static minimumLength(passwordValue: string, len: number): boolean {
        return passwordValue.length >= len;
    }

    private static requireUppercase(passwordValue: string, required: boolean): boolean {
        if (required) {
            return /[A-Z]/.test(passwordValue);
        }
        return true;
    }

    private static requireSymbol(passwordValue: string, required: boolean): boolean {
        if (required) {
            return /[^a-zA-Z0-9]/.test(passwordValue);
        }
        return true;
    }

    private static requireDigit(passwordValue: string, required: boolean): boolean {
        if (required) {
            return /[0-9]/.test(passwordValue);
        }
        return true;
    }

    private static requireLowercase(passwordValue: string, required: boolean): boolean {
        if (required) {
            return /[a-z]/.test(passwordValue);
        }
        return true;
    }
}
