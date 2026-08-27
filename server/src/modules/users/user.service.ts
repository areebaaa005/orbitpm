import { User } from './user.model';
import { ApiError } from '../../utils/ApiError';

export async function updateProfile(
  userId: string,
  updates: { name?: string; email?: string }
) {
  if (updates.email) {
    const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } });
    if (existing) {
      throw ApiError.conflict('This email is already in use by another account');
    }
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
  };
}
