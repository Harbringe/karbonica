/**
 * Deadline Scheduler
 * 
 * Scheduled job that processes expired voting deadlines and auto-abstains
 * validators who haven't voted within the deadline period.
 */

import * as cron from 'node-cron';
import { ValidatorDeadlineService } from '../application/services/ValidatorDeadlineService';
import { VerificationRequestRepository } from '../infrastructure/repositories/VerificationRequestRepository';
import { ValidatorVoteRepository } from '../infrastructure/repositories/ValidatorVoteRepository';
import { VerificationEventRepository } from '../infrastructure/repositories/VerificationEventRepository';
import { logger } from './logger';

let scheduledTask: cron.ScheduledTask | null = null;
let deadlineService: ValidatorDeadlineService | null = null;

/**
 * Initialize the deadline service with required repositories
 */
function getDeadlineService(): ValidatorDeadlineService {
    if (!deadlineService) {
        const verificationRepo = new VerificationRequestRepository();
        const voteRepo = new ValidatorVoteRepository();
        const eventRepo = new VerificationEventRepository();

        deadlineService = new ValidatorDeadlineService(
            verificationRepo,
            voteRepo,
            eventRepo
        );
    }
    return deadlineService;
}

/**
 * Process expired deadlines
 * This is the main job function that gets called on schedule
 */
async function processDeadlines(): Promise<void> {
    try {
        logger.info('Starting scheduled deadline processing');

        const service = getDeadlineService();
        const result = await service.processExpiredDeadlines();

        logger.info('Scheduled deadline processing completed', {
            verificationsProcessed: result.verificationsProcessed,
            validatorsAutoAbstained: result.validatorsAutoAbstained,
        });
    } catch (error) {
        logger.error('Error in scheduled deadline processing', { error });
    }
}

/**
 * Start the deadline scheduler
 * Runs at the top of every hour (0 * * * *)
 * 
 * @returns The scheduled task instance
 */
export function startDeadlineScheduler(): cron.ScheduledTask {
    if (scheduledTask) {
        logger.warn('Deadline scheduler is already running');
        return scheduledTask;
    }

    // Run at the top of every hour
    // Cron format: second minute hour day month weekday
    // '0 * * * *' = at minute 0 of every hour
    scheduledTask = cron.schedule('0 * * * *', async () => {
        await processDeadlines();
    }, {
        timezone: 'UTC',
    });

    logger.info('Deadline scheduler started - running every hour at :00');

    return scheduledTask;
}

/**
 * Stop the deadline scheduler
 */
export function stopDeadlineScheduler(): void {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        logger.info('Deadline scheduler stopped');
    }
}

/**
 * Manually trigger deadline processing
 * Useful for testing or manual intervention
 */
export async function triggerDeadlineProcessing(): Promise<{
    verificationsProcessed: number;
    validatorsAutoAbstained: number;
}> {
    const service = getDeadlineService();
    return service.processExpiredDeadlines();
}

/**
 * Check if the scheduler is running
 */
export function isSchedulerRunning(): boolean {
    return scheduledTask !== null;
}
