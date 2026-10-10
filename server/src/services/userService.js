import User from '../models/User.js';

function publicProfile(user) {
    if (!user) return null;

    return {
        id: user._id.toString(),
        displayName: user.displayName,
        email: user.email,
        college: user.college ?? '',
        gradYear: user.gradYear ?? null
    };
}

export async function getUserProfile(userId) {
    const user = await User.findById(userId)
        .select('displayName email college gradYear')
        .lean();

    if (!user) {
        const error = new Error('Account not found.');
        error.status = 404;
        error.code = 'ACCOUNT_NOT_FOUND';
        throw error;
    }

    return publicProfile(user);
}

export async function updateUserProfile(userId, input) {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error('Account not found.');
        error.status = 404;
        error.code = 'ACCOUNT_NOT_FOUND';
        throw error;
    }

    if (Object.hasOwn(input, 'displayName')) {
        user.displayName = input.displayName;
    }

    if (Object.hasOwn(input, 'college')) {
        user.college = input.college || undefined;
    }

    if (Object.hasOwn(input, 'gradYear')) {
        user.gradYear = input.gradYear ?? undefined;
    }

    await user.save();

    return publicProfile(user);
}
