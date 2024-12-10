import { mocked } from "jest-mock";
import { MatrixError, Room } from "matrix-js-sdk/src/matrix";

import { RoomViewStore } from "~tchap-web/src/stores/RoomViewStore";
import { Action } from "~tchap-web/src/dispatcher/actions";
import { TestSdkContext } from "~tchap-web/test/unit-tests/TestSdkContext";
import { getMockClientWithEventEmitter, untilDispatch } from "~tchap-web/test/test-utils";
import { SlidingSyncManager } from "~tchap-web/src/SlidingSyncManager";
import { PosthogAnalytics } from "~tchap-web/src/PosthogAnalytics";
import { MatrixDispatcher } from "~tchap-web/src/dispatcher/dispatcher";
import { SpaceStoreClass } from "~tchap-web/src/stores/spaces/SpaceStore";
import { VoiceBroadcastPlaybacksStore } from "~tchap-web/src/voice-broadcast";
import Modal from "~tchap-web/src/Modal";
import ExternalAccountHandler from "~tchap-web/src/tchap/lib/ExternalAccountHandler";
import { _t } from "~tchap-web/src/languageHandler";
import ErrorDialog from "~tchap-web/src/components/views/dialogs/ErrorDialog";
import TchapRoomUtils from "~tchap-web/src/tchap/util/TchapRoomUtils";
import { TchapRoomType } from "~tchap-web/src/tchap/@types/tchap";
jest.mock("~tchap-web/src/Modal");

// mock out the injected classes
jest.mock("~tchap-web/src/PosthogAnalytics");
const MockPosthogAnalytics = <jest.Mock<PosthogAnalytics>>(<unknown>PosthogAnalytics);
jest.mock("~tchap-web/src/SlidingSyncManager");
const MockSlidingSyncManager = <jest.Mock<SlidingSyncManager>>(<unknown>SlidingSyncManager);
jest.mock("~tchap-web/src/stores/spaces/SpaceStore");
const MockSpaceStore = <jest.Mock<SpaceStoreClass>>(<unknown>SpaceStoreClass);

jest.mock("~tchap-web/src/utils/DMRoomMap", () => {
    const mock = {
        getUserIdForRoomId: jest.fn(),
        getDMRoomsForUserId: jest.fn(),
    };

    return {
        shared: jest.fn().mockReturnValue(mock),
        sharedInstance: mock,
    };
});

jest.mock("~tchap-web/src/stores/WidgetStore");
jest.mock("~tchap-web/src/stores/widgets/WidgetLayoutStore");

describe("RoomViewStore", function () {
    const userId = "@alice:server";
    const roomId = "!randomcharacters:aser.ver";
    const roomId2 = "!room2:example.com";

    const mockClient = getMockClientWithEventEmitter({
        joinRoom: jest.fn(),
        getRoom: jest.fn(),
        getRoomIdForAlias: jest.fn(),
        isGuest: jest.fn(),
        getUserId: jest.fn().mockReturnValue(userId),
        getSafeUserId: jest.fn().mockReturnValue(userId),
        getDeviceId: jest.fn().mockReturnValue("ABC123"),
        sendStateEvent: jest.fn().mockResolvedValue({}),
        supportsThreads: jest.fn(),
        isInitialSyncComplete: jest.fn().mockResolvedValue(false),
        relations: jest.fn(),
        knockRoom: jest.fn(),
        leave: jest.fn(),
        setRoomAccountData: jest.fn(),
    });
    const room = new Room(roomId, mockClient, userId);
    const room2 = new Room(roomId2, mockClient, userId);

    let roomViewStore: RoomViewStore;
    let slidingSyncManager: SlidingSyncManager;
    let dis: MatrixDispatcher;
    let stores: TestSdkContext;

    beforeEach(function () {
        jest.clearAllMocks();

        Modal.createDialog = jest.fn();
        // @ts-ignore mock (type error because empty return)
        mocked(Modal.createDialog).mockReturnValue({});

        mockClient.credentials = { userId: userId };
        mockClient.joinRoom.mockResolvedValue(room);
        mockClient.getRoom.mockImplementation((roomId: string): Room | null => {
            if (roomId === room.roomId) return room;
            if (roomId === room2.roomId) return room2;
            return null;
        });
        mockClient.isGuest.mockReturnValue(false);
        mockClient.getSafeUserId.mockReturnValue(userId);

        // Make the RVS to test
        dis = new MatrixDispatcher();
        slidingSyncManager = new MockSlidingSyncManager();
        stores = new TestSdkContext();
        stores.client = mockClient;
        stores._SlidingSyncManager = slidingSyncManager;
        stores._PosthogAnalytics = new MockPosthogAnalytics();
        stores._SpaceStore = new MockSpaceStore();
        stores._VoiceBroadcastPlaybacksStore = new VoiceBroadcastPlaybacksStore(stores.voiceBroadcastRecordingsStore);
        roomViewStore = new RoomViewStore(dis, stores);
        stores._RoomViewStore = roomViewStore;

        jest.spyOn(ExternalAccountHandler, "isUserExternal").mockReturnValue(true);
    });

    it("should display a generic error message when the room is null", async () => {
        // View and wait for the room
        dis.dispatch({ action: Action.ViewRoom, room_id: roomId });
        await untilDispatch(Action.ActiveRoomChanged, dis);
        // Generate error to display the expected error message
        const error = new MatrixError(undefined, 404);
        roomViewStore.showJoinRoomError(error, "");

        expect(ExternalAccountHandler.isUserExternal).toHaveBeenCalledTimes(1);

        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("room|error_join_title"),
            description: _t("room|error_join_generic_external"),
        });
    });

    it("should display specific error message when the room is a forum", async () => {
        jest.spyOn(TchapRoomUtils, "getTchapRoomType").mockReturnValue(TchapRoomType.Forum);

        // View and wait for the room
        dis.dispatch({ action: Action.ViewRoom, room_id: roomId });
        await untilDispatch(Action.ActiveRoomChanged, dis);
        // Generate error to display the expected error message
        const error = new MatrixError(undefined, 404);
        roomViewStore.showJoinRoomError(error, "");

        expect(ExternalAccountHandler.isUserExternal).toHaveBeenCalledTimes(1);

        expect(ExternalAccountHandler.isUserExternal).toHaveBeenCalledTimes(1);

        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("room|error_join_title"),
            description: _t("room|room|error_join_public_external"),
        });
    });

    it("should display specific error message when the room is a private", async () => {
        // don't know why isUserExternal is not returning true despite the setup we did for being an external user
        // so we mock it, not the best...
        jest.spyOn(ExternalAccountHandler, "isUserExternal").mockReturnValue(true);

        // View and wait for the room
        dis.dispatch({ action: Action.ViewRoom, room_id: roomId });
        await untilDispatch(Action.ActiveRoomChanged, dis);
        // Generate error to display the expected error message
        const error = new MatrixError(undefined, 404);
        roomViewStore.showJoinRoomError(error, "");

        expect(ExternalAccountHandler.isUserExternal).toHaveBeenCalledTimes(1);

        expect(ExternalAccountHandler.isUserExternal).toHaveBeenCalledTimes(1);

        expect(Modal.createDialog).toHaveBeenCalledWith(ErrorDialog, {
            title: _t("room|error_join_title"),
            description: _t("room|error_join_private_external"),
        });
    });
});
