import { TchapRoomAccessRule, TchapRoomType } from "~tchap-web/src/tchap/@types/tchap";
import TchapRoomUtils from "~tchap-web/src/tchap/util/TchapRoomUtils";

describe("Provides utils method to get room type and state", () => {
    beforeEach(() => {});

    it("returns room type depending on encryption and access rule", () => {
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, TchapRoomAccessRule.Restricted)).toStrictEqual(
            TchapRoomType.Private,
        );
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, TchapRoomAccessRule.Unrestricted)).toStrictEqual(
            TchapRoomType.External,
        );
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, "any")).toStrictEqual(TchapRoomType.Unknown);
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, undefined)).toStrictEqual(TchapRoomType.Unknown);
    });
});
