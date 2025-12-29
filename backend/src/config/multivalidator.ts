/**
 * Multivalidator System Configuration
 * 
 * Configuration for the 5-validator consensus system with wallet signatures
 * and voting deadlines.
 */

export const multivalidatorConfig = {
    // Number of validators to automatically assign to each verification
    validatorCount: parseInt(process.env.VALIDATOR_COUNT || '5', 10),

    // Number of approvals required to reach consensus
    requiredApprovals: parseInt(process.env.REQUIRED_APPROVALS || '3', 10),

    // Number of days validators have to cast their votes
    votingDeadlineDays: parseInt(process.env.VOTING_DEADLINE_DAYS || '4', 10),

    // How often to check for expired deadlines (in milliseconds)
    deadlineCheckInterval: parseInt(process.env.DEADLINE_CHECK_INTERVAL || '3600000', 10),

    // Wallet signature configuration
    signature: {
        // Whether wallet signatures are required for votes
        signatureRequired: process.env.SIGNATURE_REQUIRED !== 'false',

        // Timestamp tolerance for signature validation (in milliseconds)
        // Votes with timestamps older than this are rejected
        timestampTolerance: parseInt(process.env.SIGNATURE_TIMESTAMP_TOLERANCE || '300000', 10),
    },

    // Minimum validators required to start a verification
    // If fewer validators are available, the system will use all available
    minimumValidators: parseInt(process.env.MINIMUM_VALIDATORS || '3', 10),
};

/**
 * Validate multivalidator configuration
 * Throws an error if configuration is invalid
 */
export function validateMultivalidatorConfig(): void {
    const { validatorCount, requiredApprovals, minimumValidators } = multivalidatorConfig;

    if (validatorCount < 1) {
        throw new Error('VALIDATOR_COUNT must be at least 1');
    }

    if (requiredApprovals < 1) {
        throw new Error('REQUIRED_APPROVALS must be at least 1');
    }

    if (requiredApprovals > validatorCount) {
        throw new Error('REQUIRED_APPROVALS cannot exceed VALIDATOR_COUNT');
    }

    if (minimumValidators < requiredApprovals) {
        throw new Error('MINIMUM_VALIDATORS must be at least equal to REQUIRED_APPROVALS');
    }
}

export default multivalidatorConfig;
