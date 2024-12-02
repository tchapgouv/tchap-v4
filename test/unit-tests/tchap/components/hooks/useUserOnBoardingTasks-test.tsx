import { renderHook } from "jest-matrix-react";

import { useUserOnboardingTasks } from "~tchap-web/src/hooks/useUserOnboardingTasks";

describe("useUserOnboardingTasks", () => {
    it.each([
        {
            context: {
                hasAvatar: false,
                hasDevices: false,
                hasDmRooms: false,
                hasNotificationsEnabled: false,
                hasSecureStorage: false,
                hasCheckedUserGuide: false,
            },
        },
        {
            context: {
                hasAvatar: true,
                hasDevices: false,
                hasDmRooms: false,
                hasNotificationsEnabled: true,
                hasSecureStorage: false,
                hasCheckedUserGuide: false,
            },
        },
    ])("sequence should stay static", async ({ context }) => {
        const { result } = renderHook(() => useUserOnboardingTasks(context));

        expect(result.current).toHaveLength(5);
        expect(result.current[0].id).toBe("check-user-guide");
        expect(result.current[1].id).toBe("enable-secure-backup");
        expect(result.current[2].id).toBe("setup-profile");
        expect(result.current[3].id).toBe("find-friends");
        expect(result.current[4].id).toBe("download-apps");
    });
});
