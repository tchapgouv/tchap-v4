import { MatrixCall } from "matrix-js-sdk/src/matrix";
import { CallDirection, CallType } from "matrix-js-sdk/src/webrtc/call";
import { PosthogAnalytics } from "~tchap-web/src/PosthogAnalytics";
import { CallEnded as CallEndedEvent } from "@matrix-org/analytics-events/types/typescript/CallEnded";
import { CallStarted as CallStartEvent } from "@matrix-org/analytics-events/types/typescript/CallStarted";
import PerformanceMonitor from "~tchap-web/src/performance";

export default class TchapPosthog {

    private static internalInstance: TchapPosthog;

    public static get instance(): TchapPosthog {
        if (!TchapPosthog.internalInstance) {
            TchapPosthog.internalInstance = new TchapPosthog();
        }
        return TchapPosthog.internalInstance;
    }


    async trackCallStart(call: MatrixCall): Promise<void> {
        this.startTimer(call.callId);

        PosthogAnalytics.instance.trackEvent<CallStartEvent>({
            eventName: "CallStarted",
            placed: true,
            isVideo: call.type == CallType.Video,
            numParticipants: 2,
        });
    }

    async trackCallEnded(call: MatrixCall): Promise<void> {
        const durationMs = this.stopTimer(call.callId);

        PosthogAnalytics.instance.trackEvent<CallEndedEvent>({
            eventName: "CallEnded",
            placed: call.direction! == CallDirection.Outbound,
            isVideo: call.type == CallType.Video,
            durationMs: durationMs,
            numParticipants: 2,
        });
    }

    private startTimer(id : string): void {
        PerformanceMonitor.instance.start(id);
    }

    private stopTimer(id: string): number {
        const perfMonitor = PerformanceMonitor.instance;

        perfMonitor.stop(id);

        const entries = perfMonitor.getEntries({ name: id });

        const measurement = entries.pop();

        return measurement ? measurement.duration : 0;
    }
}