import { MatrixCall } from "matrix-js-sdk/src/matrix";
import { CallDirection, CallType } from "matrix-js-sdk/src/webrtc/call";
import { PosthogAnalytics } from "~tchap-web/src/PosthogAnalytics";
import { CallEnded as CallEndedEvent } from "@matrix-org/analytics-events/types/typescript/CallEnded";
import { CallStarted as CallStartEvent } from "@matrix-org/analytics-events/types/typescript/CallStarted";
import PerformanceMonitor from "~tchap-web/src/performance";
import { logger } from "matrix-js-sdk/src/logger";

export default class TchapPosthog {

    private static internalInstance: TchapPosthog;

    private TCHAP_CALL = "TCHAP_CALL";

    private LOG_PREFIX = "TCHAP_POSTHOG";

    public static get instance(): TchapPosthog {
        if (!TchapPosthog.internalInstance) {
            TchapPosthog.internalInstance = new TchapPosthog();
        }
        return TchapPosthog.internalInstance;
    }


    async trackCallStart(call: MatrixCall): Promise<void> {
        try {
            this.startTimer(call.callId);

            logger.debug(`${this.LOG_PREFIX}_trackCallStart`, call);

            PosthogAnalytics.instance.trackEvent<CallStartEvent>({
                eventName: "CallStarted",
                placed: true,
                isVideo: call.type == CallType.Video,
                numParticipants: 2,
            });
        } catch(e) {
            logger.error(`${this.LOG_PREFIX}_trackCallStart error`, e);
        }
    }

    async trackCallEnded(call: MatrixCall): Promise<void> {
        try {
            const durationMs = this.stopTimer(call.callId);
            
            logger.debug(`${this.LOG_PREFIX}_trackCallEnded`, call);

            PosthogAnalytics.instance.trackEvent<CallEndedEvent>({
                eventName: "CallEnded",
                placed: call.direction! == CallDirection.Outbound,
                isVideo: call.type == CallType.Video,
                durationMs: durationMs,
                numParticipants: 2,
            });
        } catch(e) {
            logger.error(`${this.LOG_PREFIX}_trackCallStart error`, e);
        }
    }

    private startTimer(id : string): void {
        PerformanceMonitor.instance.start(this.TCHAP_CALL, id);
    }

    private stopTimer(id: string): number {
        const perfMonitor = PerformanceMonitor.instance;

        const measurement =  perfMonitor.stop(this.TCHAP_CALL, id);

        return measurement ? measurement.duration : 0;
    }
}