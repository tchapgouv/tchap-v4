import { TchapRoomAccessRule, TchapRoomType } from "../../../src/@types/tchap";
import TchapRoomUtils from "../../../src/util/TchapRoomUtils";

describe("Provides utils method to get room type and state", () => {
    beforeEach(() => {});

    it("returns room type depending on encryption and access rule", (done) => {
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, TchapRoomAccessRule.Restricted)).toStrictEqual(
            TchapRoomType.Private,
        );
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, TchapRoomAccessRule.Unrestricted)).toStrictEqual(
            TchapRoomType.External,
        );
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, "any")).toStrictEqual(TchapRoomType.Unknown);
        expect(TchapRoomUtils.getTchapRoomTypeInternal(true, undefined)).toStrictEqual(TchapRoomType.Unknown);
        done();
    });
});
